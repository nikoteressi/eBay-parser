import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../../database/index';
import { trackedItems } from '../../../database/schema';

type TrackedItem = typeof trackedItems.$inferSelect;

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing query ID' });
  }

  // Active items (base set for price-drop and new-item filters below)
  const activeItems = db
    .select()
    .from(trackedItems)
    .where(and(eq(trackedItems.queryId, id), eq(trackedItems.itemStatus, 'active')))
    .orderBy(desc(trackedItems.lastSeenAt))
    .all();

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const priceDrops = activeItems.filter(item => item.currentTotalCost < item.firstSeenTotalCost);

  const newItems = activeItems
    .filter(item => item.firstSeenAt >= oneDayAgo)
    .sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt))
    .slice(0, 50);

  const endedItems = db
    .select()
    .from(trackedItems)
    .where(and(eq(trackedItems.queryId, id), eq(trackedItems.itemStatus, 'ended_or_sold')))
    .orderBy(desc(trackedItems.endedAt))
    .limit(50)
    .all();

  return {
    serverTime: new Date().toISOString(),
    newItems: newItems.map(formatItem),
    priceDrops: priceDrops.map(formatItem).slice(0, 50),
    endedItems: endedItems.map(formatItem),
  };
});

function formatItem(item: TrackedItem) {
  return {
    id: item.id,
    ebay_item_id: item.ebayItemId,
    title: item.title,
    item_url: item.itemUrl,
    image_url: item.imageUrl,
    buying_option: item.buyingOption,
    current_price: item.currentPrice,
    current_shipping: item.currentShipping,
    first_seen_price: item.firstSeenPrice,
    first_seen_shipping: item.firstSeenShipping,
    first_seen_total_cost: item.firstSeenTotalCost,
    current_total_cost: item.currentTotalCost,
    currency: item.currency,
    first_seen_at: item.firstSeenAt,
    last_seen_at: item.lastSeenAt,
    last_price_drop_at: item.lastPriceDropAt,
    ended_at: item.endedAt,
    accepts_offers: item.acceptsOffers,
  };
}
