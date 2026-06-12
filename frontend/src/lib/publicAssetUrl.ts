const IMAGEKIT_PUBLIC_BASE_URL = 'https://ik.imagekit.io/hjnuyz1t3/public';

const PUBLIC_ASSET_RULES = [
  { sourcePrefix: 'banners/banners/', targetPrefix: 'banners/' },
  { sourcePrefix: 'beauty-images/posters/', targetPrefix: 'beauty/posters/' },
  { sourcePrefix: 'beauty-images/glam/', targetPrefix: 'beauty/glam/' },
  { sourcePrefix: 'dressing-room-images/1/', targetPrefix: 'dressing-room/' },
  { sourcePrefix: 'events-schedule/items/', targetPrefix: 'events-schedule/items/' },
  { sourcePrefix: 'events-schedule/settings/', targetPrefix: 'events-schedule/settings/' },
  { sourcePrefix: 'charm-bar-assets/', targetPrefix: 'charm-bar-assets/' },
  { sourcePrefix: 'stage-gallery/', targetPrefix: 'stage-gallery/' },
] as const;

function extractSupabasePublicStoragePath(inputUrl: string): string | null {
  try {
    const url = new URL(inputUrl);
    const match = url.pathname.match(/\/storage\/v1\/(?:object|render\/image)\/public\/(.+)$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function mapSupabasePublicAssetUrlToImageKit(inputUrl: string): string {
  const storagePath = extractSupabasePublicStoragePath(inputUrl);
  if (!storagePath) return inputUrl;

  for (const rule of PUBLIC_ASSET_RULES) {
    if (storagePath.startsWith(rule.sourcePrefix)) {
      return `${IMAGEKIT_PUBLIC_BASE_URL}/${rule.targetPrefix}${storagePath.slice(rule.sourcePrefix.length)}`;
    }
  }

  return inputUrl;
}

export function resolvePublicAssetUrl(inputUrl: string | null | undefined): string | null {
  if (typeof inputUrl !== 'string' || inputUrl.trim() === '') return null;
  return mapSupabasePublicAssetUrlToImageKit(inputUrl);
}

export function resolvePublicAssetString(inputUrl: string): string {
  return mapSupabasePublicAssetUrlToImageKit(inputUrl);
}

export function resolvePublicAssetStringArray(inputUrls: string[]): string[] {
  return inputUrls.map(resolvePublicAssetString);
}

export function resolvePublicAssetValue<T>(value: T): T {
  if (typeof value === 'string') {
    return resolvePublicAssetString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolvePublicAssetValue(entry)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolvePublicAssetValue(entry)])
    ) as T;
  }

  return value;
}
