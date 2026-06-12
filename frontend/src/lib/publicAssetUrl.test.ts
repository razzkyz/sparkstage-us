import { describe, expect, it } from 'vitest';
import { mapSupabasePublicAssetUrlToImageKit, resolvePublicAssetValue } from './publicAssetUrl';

const SUPABASE_PUBLIC_BASE = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public';
const IMAGEKIT_PUBLIC_BASE = 'https://ik.imagekit.io/hjnuyz1t3/public';

describe('publicAssetUrl', () => {
  it('maps charm bar CMS assets to ImageKit', () => {
    const input = `${SUPABASE_PUBLIC_BASE}/charm-bar-assets/cms/charm-bar-hero.png`;
    expect(mapSupabasePublicAssetUrlToImageKit(input)).toBe(
      `${IMAGEKIT_PUBLIC_BASE}/charm-bar-assets/cms/charm-bar-hero.png`
    );
  });

  it('maps stage gallery assets to ImageKit', () => {
    const input = `${SUPABASE_PUBLIC_BASE}/stage-gallery/stage-1-photo.jpg`;
    expect(mapSupabasePublicAssetUrlToImageKit(input)).toBe(`${IMAGEKIT_PUBLIC_BASE}/stage-gallery/stage-1-photo.jpg`);
  });

  it('maps event/news settings assets to ImageKit', () => {
    const input = `${SUPABASE_PUBLIC_BASE}/events-schedule/settings/news-page-cover.webp`;
    expect(mapSupabasePublicAssetUrlToImageKit(input)).toBe(
      `${IMAGEKIT_PUBLIC_BASE}/events-schedule/settings/news-page-cover.webp`
    );
  });

  it('resolves nested CMS JSON media URLs without changing non-media strings', () => {
    const input = {
      title: 'Quick link',
      image_urls: [
        `${SUPABASE_PUBLIC_BASE}/charm-bar-assets/cms/card-1.jpg`,
        'https://images.unsplash.com/photo-1509631179647-0177331693ae',
      ],
      nested: {
        video_url: `${SUPABASE_PUBLIC_BASE}/charm-bar-assets/cms/video-1.mp4`,
        href: '/shop',
      },
    };

    expect(resolvePublicAssetValue(input)).toEqual({
      title: 'Quick link',
      image_urls: [
        `${IMAGEKIT_PUBLIC_BASE}/charm-bar-assets/cms/card-1.jpg`,
        'https://images.unsplash.com/photo-1509631179647-0177331693ae',
      ],
      nested: {
        video_url: `${IMAGEKIT_PUBLIC_BASE}/charm-bar-assets/cms/video-1.mp4`,
        href: '/shop',
      },
    });
  });
});
