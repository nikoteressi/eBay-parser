import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '../../../database/index';
import { trackedItems } from '../../../database/schema';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing query ID' });
  }

  // Active items
  const activeItems = db.select()
    .from(trackedItems)
    .where(and(eq(trackedItems.queryId, id), eq(trackedItems.itemStatus, 'active')))
    .orderBy(desc(trackedItems.lastSeenAt))
    .all();

  // Price Drops (active where currentPrice < firstSeenPrice)
  // Wait, diff-engine just sets lastNotifiedPrice. Let's just find anything where currentTotalCost < firstSeenTotalCost
  const priceDrops = activeItems.filter(item => item.currentTotalCost < item.firstSeenTotalCost);
  
  // New Items (active where firstSeenAt within last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const newItems = activeItems
    .filter(item => item.firstSeenAt >= oneDayAgo)
    .sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt))
    .slice(0, 50);

  // Ended Items
  const endedItems = db.select()
    .from(trackedItems)
    .where(and(eq(trackedItems.queryId, id), eq(trackedItems.itemStatus, 'ended_or_sold')))
    .orderBy(desc(trackedItems.endedAt))
    .limit(50)
    .all();

  return {
    newItems: newItems.map(formatItem),
    priceDrops: priceDrops.map(formatItem).slice(0, 50),
    endedItems: endedItems.map(formatItem)
  };
});

function formatItem(item: any) {
  return {
    id: item.id,
    ebay_item_id: item.ebayItemId,
    title: item.title,
    item_url: item.itemUrl,
    image_url: item.imageUrl,
    buying_option: item.buyingOption,
    first_seen_total_cost: item.firstSeenTotalCost,
    current_total_cost: item.currentTotalCost,
    currency: item.currency,
    ended_at: item.endedAt
  };
}
