import { describe, it, expect } from 'vitest';
import {
  computeActivityBadge,
  formatTimeAgo,
} from '../../app/utils/activity-badge';

const NOW = Date.parse('2026-04-15T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(NOW - h * 60 * 60_000).toISOString();
const minutesAgoMs = (m: number) => NOW - m * 60_000;

describe('formatTimeAgo', () => {
  it('returns "Just now" for future timestamps', () => {
    expect(formatTimeAgo(NOW + 5_000, NOW)).toBe('Just now');
  });

  it('formats sub-minute differences as seconds', () => {
    expect(formatTimeAgo(NOW - 30_000, NOW)).toBe('30s ago');
  });

  it('rolls over to minutes at the 60s boundary', () => {
    expect(formatTimeAgo(NOW - 60_000, NOW)).toBe('1m ago');
  });

  it('formats sub-hour differences as minutes', () => {
    expect(formatTimeAgo(NOW - 45 * 60_000, NOW)).toBe('45m ago');
  });

  it('rolls over to hours at the 60-minute boundary', () => {
    expect(formatTimeAgo(NOW - 60 * 60_000, NOW)).toBe('1h ago');
  });

  it('formats multi-hour differences as hours', () => {
    expect(formatTimeAgo(NOW - 5 * 60 * 60_000, NOW)).toBe('5h ago');
  });
});

describe('computeActivityBadge', () => {
  it('returns null when item is old and has no recent price drop', () => {
    const result = computeActivityBadge({
      firstSeenAt: hoursAgo(48),
      lastPriceDropAt: null,
      lastViewedAt: minutesAgoMs(60),
      nowMs: NOW,
    });
    expect(result).toBeNull();
  });

  describe('Just Found', () => {
    it('returns the "new" badge when first_seen is within 2h and newer than lastViewed', () => {
      const result = computeActivityBadge({
        firstSeenAt: minutesAgo(5),
        lastPriceDropAt: null,
        lastViewedAt: minutesAgoMs(10),
        nowMs: NOW,
      });
      expect(result).toEqual({
        type: 'new',
        icon: '🔥',
        label: 'Just Found',
        timeAgo: '5m ago',
      });
    });

    it('does not show the badge when item was already visible at last visit', () => {
      const result = computeActivityBadge({
        firstSeenAt: minutesAgo(30),
        lastPriceDropAt: null,
        lastViewedAt: minutesAgoMs(10),
        nowMs: NOW,
      });
      expect(result).toBeNull();
    });

    it('does not show the badge once first_seen is older than 2h', () => {
      const result = computeActivityBadge({
        firstSeenAt: hoursAgo(3),
        lastPriceDropAt: null,
        lastViewedAt: 0,
        nowMs: NOW,
      });
      expect(result).toBeNull();
    });

    it('treats missing lastViewedAt as 0 (always-newer)', () => {
      const result = computeActivityBadge({
        firstSeenAt: minutesAgo(5),
        lastPriceDropAt: null,
        nowMs: NOW,
      });
      expect(result?.type).toBe('new');
    });
  });

  describe('Just Dropped', () => {
    it('returns the "drop" badge when last_price_drop_at is within 24h', () => {
      const result = computeActivityBadge({
        firstSeenAt: hoursAgo(72),
        lastPriceDropAt: hoursAgo(2),
        lastViewedAt: minutesAgoMs(10),
        nowMs: NOW,
      });
      expect(result).toEqual({
        type: 'drop',
        icon: '📉',
        label: 'Just Dropped',
        timeAgo: '2h ago',
      });
    });

    it('does not show the drop badge once the drop is older than 24h', () => {
      const result = computeActivityBadge({
        firstSeenAt: hoursAgo(72),
        lastPriceDropAt: hoursAgo(25),
        lastViewedAt: minutesAgoMs(10),
        nowMs: NOW,
      });
      expect(result).toBeNull();
    });

    it('ignores a null last_price_drop_at', () => {
      const result = computeActivityBadge({
        firstSeenAt: hoursAgo(72),
        lastPriceDropAt: null,
        nowMs: NOW,
      });
      expect(result).toBeNull();
    });
  });

  it('prefers "new" over "drop" when both criteria are met', () => {
    const result = computeActivityBadge({
      firstSeenAt: minutesAgo(5),
      lastPriceDropAt: hoursAgo(1),
      lastViewedAt: minutesAgoMs(10),
      nowMs: NOW,
    });
    expect(result?.type).toBe('new');
  });
});
