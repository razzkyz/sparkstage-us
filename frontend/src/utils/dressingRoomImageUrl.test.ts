import { describe, expect, it } from 'vitest';
import { getOptimizedDressingRoomImageUrl, parseDressingRoomStorageObjectPath } from './dressingRoomImageUrl';
import { mapSupabasePublicAssetUrlToImageKit } from '../lib/publicAssetUrl';

describe('dressingRoomImageUrl', () => {
  it('parses object path from public object URL', () => {
    const input = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/dressing-room-images/1/2/abc.png';
    expect(parseDressingRoomStorageObjectPath(input)).toBe('1/2/abc.png');
  });

  it('parses object path from public render URL', () => {
    const input = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/render/image/public/dressing-room-images/1/2/abc.png?height=800';
    expect(parseDressingRoomStorageObjectPath(input)).toBe('1/2/abc.png');
  });

  it('returns unchanged for non-supabase URLs', () => {
    const input = 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80&auto=format';
    expect(getOptimizedDressingRoomImageUrl(input, { height: 1600 })).toBe(input);
  });

  it('redirects known dressing-room object URLs to ImageKit delivery with height transform', () => {
    const input = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/dressing-room-images/1/2/abc.png';
    const output = getOptimizedDressingRoomImageUrl(input, { height: 1600 });
    expect(output).toContain('https://ik.imagekit.io/hjnuyz1t3/public/dressing-room/2/abc.png');
    expect(output).toContain('tr=');
    expect(output).toContain('h-1600');
  });

  it('handles legacy fashion-images object URLs', () => {
    const input = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/fashion-images/1/2/abc.png';
    const output = getOptimizedDressingRoomImageUrl(input, { height: 1200 });
    expect(output).toContain('/storage/v1/render/image/public/dressing-room-images/1/2/abc.png');
  });

  it('maps known public Supabase asset URLs to ImageKit', () => {
    const input = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/glam/model.png';
    expect(mapSupabasePublicAssetUrlToImageKit(input)).toBe('https://ik.imagekit.io/hjnuyz1t3/public/beauty/glam/model.png');
  });

  it('builds ImageKit transformed URL for migrated dressing room images', () => {
    const input = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/dressing-room-images/1/2/abc.png';
    const output = getOptimizedDressingRoomImageUrl(input, { height: 900 });
    expect(output).toContain('https://ik.imagekit.io/hjnuyz1t3/public/dressing-room/2/abc.png');
    expect(output).toContain('tr=');
    expect(output).toContain('h-900');
  });
});
