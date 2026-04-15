import { describe, it, expect } from 'vitest';
import { translateUrl, validateUrl } from '../../server/modules/url-translator/index';

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
      limit: 50,
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

  describe('Location Filtering (LH_PrefLoc)', () => {
    it('maps LH_PrefLoc=1 to US Only', () => {
      const result = translateUrl('https://www.ebay.com/sch/i.html?_nkw=lego&LH_PrefLoc=1');
      expect(result.apiParams.filter).toContain('itemLocationCountry:US');
      expect(result.summary.locationLabel).toBe('US Only');
    });

    it('maps LH_PrefLoc=3 to North America', () => {
      const result = translateUrl('https://www.ebay.com/sch/i.html?_nkw=lego&LH_PrefLoc=3');
      expect(result.apiParams.filter).toContain('itemLocationCountry:US|CA|MX');
      expect(result.summary.locationLabel).toBe('North America');
    });

    it('handles LH_PrefLoc=2 as Worldwide without API filter', () => {
      const result = translateUrl('https://www.ebay.com/sch/i.html?_nkw=lego&LH_PrefLoc=2');
      expect(result.apiParams.filter.some(f => f.startsWith('itemLocationCountry:'))).toBe(false);
      expect(result.summary.locationLabel).toBe('Worldwide');
    });

    it('ignores unknown LH_PrefLoc values', () => {
      const result = translateUrl('https://www.ebay.com/sch/i.html?_nkw=lego&LH_PrefLoc=99');
      expect(result.apiParams.filter.some(f => f.startsWith('itemLocationCountry:'))).toBe(false);
      expect(result.summary.locationLabel).toBeUndefined();
    });
  });
});
