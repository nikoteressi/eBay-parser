import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { computeDiff } from './index';
import { computeTotalCost } from './total-cost';
import { db } from '../../database/index';
import { trackedQueries, trackedItems } from '../../database/schema';
import { ulid } from 'ulid';
import type { NormalizedEbayItem } from '../ebay-client/index';

const TEST_QUERY_ID = ulid();

describe('DiffEngine', () => {
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

  it('computes total cost correctly', () => {
    expect(computeTotalCost(100.5, 10)).toBe(110.5);
  });

  it('detects new items correctly', () => {
    const apiItems: NormalizedEbayItem[] = [
      { itemId: '100', title: 'New Item', itemUrl: 'link', imageUrl: null, buyingOption: 'FIXED_PRICE', price: 10, shippingCost: 2, currency: 'USD' }
    ];

    const result = computeDiff(TEST_QUERY_ID, apiItems);
    expect(result.newItems).toHaveLength(1);
    expect(result.updatedCount).toBe(0);
    expect(result.outOfViewCount).toBe(0);
    expect(result.priceDrops).toHaveLength(0);

    const saved = db.select().from(trackedItems).where(eq(trackedItems.ebayItemId, '100')).get()!;
    expect(saved.currentTotalCost).toBe(12);
  });

  it('detects out of view items', () => {
    const apiItems: NormalizedEbayItem[] = [
      { itemId: '100', title: 'New Item', itemUrl: 'link', imageUrl: null, buyingOption: 'FIXED_PRICE', price: 10, shippingCost: 2, currency: 'USD' }
    ];
    computeDiff(TEST_QUERY_ID, apiItems); // first run

    const result = computeDiff(TEST_QUERY_ID, []); // second run empty
    expect(result.outOfViewCount).toBe(1);

    const saved = db.select().from(trackedItems).where(eq(trackedItems.ebayItemId, '100')).get()!;
    expect(saved.itemStatus).toBe('out_of_view');
  });

  it('detects price drops', () => {
    const apiItems: NormalizedEbayItem[] = [
      { itemId: '200', title: 'Drop Item', itemUrl: 'link', imageUrl: null, buyingOption: 'FIXED_PRICE', price: 50, shippingCost: 0, currency: 'USD' }
    ];
    computeDiff(TEST_QUERY_ID, apiItems); 

    const apiItemsDropped = [
      { ...apiItems[0], price: 40 }
    ] as NormalizedEbayItem[];
    const dropResult = computeDiff(TEST_QUERY_ID, apiItemsDropped);

    expect(dropResult.priceDrops).toHaveLength(1);
    expect(dropResult.priceDrops[0]!.previousTotalCost).toBe(50);
    expect(dropResult.priceDrops[0]!.currentTotalCost).toBe(40);
  });
});
