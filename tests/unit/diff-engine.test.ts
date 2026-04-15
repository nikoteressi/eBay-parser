import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { computeDiff } from '../../server/modules/diff-engine/index';
import { computeTotalCost } from '../../server/modules/diff-engine/total-cost';
import { db } from '../../server/database/index';
import { trackedQueries, trackedItems } from '../../server/database/schema';
import { ulid } from 'ulid';
import type { NormalizedEbayItem } from '../../server/modules/ebay-client/index';

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

  describe('computeTotalCost', () => {
    it('adds price and shipping', () => {
      expect(computeTotalCost(100.5, 10)).toBe(110.5);
    });

    it('treats negative shipping as zero', () => {
      expect(computeTotalCost(50, -5)).toBe(50);
    });

    it('treats negative price as zero', () => {
      expect(computeTotalCost(-10, 5)).toBe(5);
    });

    it('rounds to 2 decimal places', () => {
      expect(computeTotalCost(10.005, 0.001)).toBe(10.01);
    });

    it('handles zero shipping (free shipping)', () => {
      expect(computeTotalCost(25, 0)).toBe(25);
    });
  });

  it('detects new items and persists total_cost', () => {
    const apiItems: NormalizedEbayItem[] = [
      { itemId: '100', title: 'New Item', itemUrl: 'link', imageUrl: null, buyingOption: 'FIXED_PRICE', price: 10, shippingCost: 2, currency: 'USD' },
    ];

    const result = computeDiff(TEST_QUERY_ID, apiItems);
    expect(result.newItems).toHaveLength(1);
    expect(result.updatedCount).toBe(0);
    expect(result.outOfViewCount).toBe(0);
    expect(result.priceDrops).toHaveLength(0);

    const saved = db.select().from(trackedItems).where(eq(trackedItems.ebayItemId, '100')).get()!;
    expect(saved.currentTotalCost).toBe(12);
    expect(saved.firstSeenTotalCost).toBe(12);
  });

  it('detects out-of-view items', () => {
    const apiItems: NormalizedEbayItem[] = [
      { itemId: '100', title: 'New Item', itemUrl: 'link', imageUrl: null, buyingOption: 'FIXED_PRICE', price: 10, shippingCost: 2, currency: 'USD' },
    ];
    computeDiff(TEST_QUERY_ID, apiItems);

    const result = computeDiff(TEST_QUERY_ID, []);
    expect(result.outOfViewCount).toBe(1);

    const saved = db.select().from(trackedItems).where(eq(trackedItems.ebayItemId, '100')).get()!;
    expect(saved.itemStatus).toBe('out_of_view');
  });

  it('detects price drops via total_cost (not price alone)', () => {
    const apiItems: NormalizedEbayItem[] = [
      { itemId: '200', title: 'Drop Item', itemUrl: 'link', imageUrl: null, buyingOption: 'FIXED_PRICE', price: 50, shippingCost: 0, currency: 'USD' },
    ];
    computeDiff(TEST_QUERY_ID, apiItems);

    const dropped: NormalizedEbayItem[] = [
      { ...apiItems[0]!, price: 40 },
    ];
    const dropResult = computeDiff(TEST_QUERY_ID, dropped);

    expect(dropResult.priceDrops).toHaveLength(1);
    expect(dropResult.priceDrops[0]!.previousTotalCost).toBe(50);
    expect(dropResult.priceDrops[0]!.currentTotalCost).toBe(40);
  });

  it('does NOT flag a price drop when shipping rises to compensate', () => {
    const apiItems: NormalizedEbayItem[] = [
      { itemId: '300', title: 'Shipping Trick', itemUrl: 'link', imageUrl: null, buyingOption: 'FIXED_PRICE', price: 50, shippingCost: 5, currency: 'USD' },
    ];
    computeDiff(TEST_QUERY_ID, apiItems);

    const adjusted: NormalizedEbayItem[] = [
      { ...apiItems[0]!, price: 45, shippingCost: 10 },
    ];
    const result = computeDiff(TEST_QUERY_ID, adjusted);

    expect(result.priceDrops).toHaveLength(0);
  });
});