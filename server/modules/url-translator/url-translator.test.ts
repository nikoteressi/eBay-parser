import { describe, it, expect } from 'vitest';
import { translateUrl, validateUrl } from './index';

describe('URL Translator', () => {
  it('validates correct eBay URLs', () => {
    expect(validateUrl('https://www.ebay.com/sch/i.html?_nkw=lego').valid).toBe(true);
    expect(validateUrl('https://ebay.co.uk/sch/Cameras/625/i.html').valid).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(validateUrl('https://google.com/sch/').valid).toBe(false);
    expect(validateUrl('').valid).toBe(false);
  });

  it('translates URL to Browse API params', () => {
    const rawUrl = 'https://www.ebay.com/sch/i.html?_nkw=lego+castle&_udlo=50&_udhi=300&LH_BIN=1&_sop=10';
    const result = translateUrl(rawUrl);

    expect(result.apiParams).toEqual({
      q: 'lego castle',
      filter: [
        'price:[50..300],priceCurrency:USD',
        'buyingOptions:{FIXED_PRICE}',
      ],
      sort: 'newlyListed',
      limit: 50, // DEFAULT_LIMIT
    });

    expect(result.summary).toEqual({
      keywords: 'lego castle',
      minPrice: 50,
      maxPrice: 300,
      buyItNowOnly: true,
      sortLabel: 'Newly Listed',
      detectedMarketplace: 'EBAY_US',
    });
  });

  it('handles missing price bounds safely', () => {
    const result = translateUrl('https://www.ebay.com/sch/i.html?_nkw=test&_udhi=100');
    expect(result.apiParams.filter).toContain('price:[..100],priceCurrency:USD');
  });
});
