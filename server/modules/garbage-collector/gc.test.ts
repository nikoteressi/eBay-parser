import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { runGC } from './index';
import { db } from '../../database/index';
import { trackedQueries, trackedItems } from '../../database/schema';
import { ulid } from 'ulid';

const TEST_QUERY_ID = ulid();

describe('Garbage Collector', () => {
  beforeEach(() => {
    db.delete(trackedItems).where(eq(trackedItems.queryId, TEST_QUERY_ID)).run();
    db.delete(trackedQueries).where(eq(trackedQueries.id, TEST_QUERY_ID)).run();

    db.insert(trackedQueries).values({
      id: TEST_QUERY_ID,
      rawUrl: 'http://test',
      parsedParams: '{}',
      pollingInterval: '5m',
      trackPrices: true,
      notifyChannel: 'both',
      status: 'active',
      isPaused: false,
    }).run();
  });

  function daysAgoStr(days: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString();
  }

  it('promotes out_of_view items past grace period', () => {
    db.insert(trackedItems).values({
      id: ulid(),
      queryId: TEST_QUERY_ID,
      ebayItemId: 'old-item',
      title: 'Old Item',
      itemUrl: 'link',
      buyingOption: 'FIXED_PRICE',
      firstSeenPrice: 10,
      currentPrice: 10,
      firstSeenShipping: 0,
      currentShipping: 0,
      firstSeenTotalCost: 10,
      currentTotalCost: 10,
      itemStatus: 'out_of_view',
      firstSeenAt: daysAgoStr(20),
      lastSeenAt: daysAgoStr(15),
      outOfViewSince: daysAgoStr(10), // > 7 days ago
    }).run();

    const gc = runGC(TEST_QUERY_ID);
    expect(gc.promoted).toBe(1);

    const saved = db.select().from(trackedItems).where(eq(trackedItems.ebayItemId, 'old-item')).get()!;
    expect(saved.itemStatus).toBe('ended_or_sold');
  });

  it('deletes ended_or_sold items past retention', () => {
    db.insert(trackedItems).values({
      id: ulid(),
      queryId: TEST_QUERY_ID,
      ebayItemId: 'deleted-item',
      title: 'Deleted Item',
      itemUrl: 'link',
      buyingOption: 'FIXED_PRICE',
      firstSeenPrice: 10,
      currentPrice: 10,
      firstSeenShipping: 0,
      currentShipping: 0,
      firstSeenTotalCost: 10,
      currentTotalCost: 10,
      itemStatus: 'ended_or_sold',
      firstSeenAt: daysAgoStr(50),
      lastSeenAt: daysAgoStr(45),
      endedAt: daysAgoStr(35), // > 30 days ago
    }).run();

    const gc = runGC(TEST_QUERY_ID);
    expect(gc.deleted).toBe(1);

    const saved = db.select().from(trackedItems).where(eq(trackedItems.ebayItemId, 'deleted-item')).get();
    expect(saved).toBeUndefined();
  });
});
