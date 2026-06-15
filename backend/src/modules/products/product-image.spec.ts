import { normalizeImages, imageUrls } from './product-image';

describe('normalizeImages', () => {
  it('returns [] for non-array input', () => {
    expect(normalizeImages(undefined)).toEqual([]);
    expect(normalizeImages(null)).toEqual([]);
    expect(normalizeImages('nope')).toEqual([]);
  });

  it('converts legacy string urls to { url, alt: "" }', () => {
    expect(normalizeImages(['http://x/a.jpg'])).toEqual([
      { url: 'http://x/a.jpg', alt: '' },
    ]);
  });

  it('passes objects through and defaults a missing alt to ""', () => {
    expect(
      normalizeImages([
        { url: 'http://x/a.jpg', alt: 'A red tee' },
        { url: 'http://x/b.jpg' },
      ]),
    ).toEqual([
      { url: 'http://x/a.jpg', alt: 'A red tee' },
      { url: 'http://x/b.jpg', alt: '' },
    ]);
  });

  it('drops entries without a usable url and trims whitespace', () => {
    expect(
      normalizeImages(['   ', { alt: 'no url' }, { url: '  http://x/c.jpg  ' }]),
    ).toEqual([{ url: 'http://x/c.jpg', alt: '' }]);
  });

  it('imageUrls returns only the url strings', () => {
    expect(
      imageUrls(['http://x/a.jpg', { url: 'http://x/b.jpg', alt: 'B' }]),
    ).toEqual(['http://x/a.jpg', 'http://x/b.jpg']);
  });
});
