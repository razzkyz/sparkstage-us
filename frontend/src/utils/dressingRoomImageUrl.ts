import { buildSrc } from '@imagekit/javascript';
import { isImageKitUrl } from '../lib/imagekit';
import { resolvePublicAssetUrl } from '../lib/publicAssetUrl';

const DRESSING_ROOM_BUCKET = 'dressing-room-images';
const LEGACY_BUCKET = 'fashion-images';

const OBJECT_PUBLIC_PREFIX = `/storage/v1/object/public/${DRESSING_ROOM_BUCKET}/`;
const RENDER_PUBLIC_PREFIX = `/storage/v1/render/image/public/${DRESSING_ROOM_BUCKET}/`;
const LEGACY_OBJECT_PUBLIC_PREFIX = `/storage/v1/object/public/${LEGACY_BUCKET}/`;
const LEGACY_RENDER_PUBLIC_PREFIX = `/storage/v1/render/image/public/${LEGACY_BUCKET}/`;

export function parseDressingRoomStorageObjectPath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const pathname = url.pathname;

    if (pathname.startsWith(OBJECT_PUBLIC_PREFIX)) {
      return pathname.slice(OBJECT_PUBLIC_PREFIX.length);
    }

    if (pathname.startsWith(RENDER_PUBLIC_PREFIX)) {
      return pathname.slice(RENDER_PUBLIC_PREFIX.length);
    }

    if (pathname.startsWith(LEGACY_OBJECT_PUBLIC_PREFIX)) {
      return pathname.slice(LEGACY_OBJECT_PUBLIC_PREFIX.length);
    }

    if (pathname.startsWith(LEGACY_RENDER_PUBLIC_PREFIX)) {
      return pathname.slice(LEGACY_RENDER_PUBLIC_PREFIX.length);
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizeDressingRoomImageUrl(inputUrl: string): string {
  const resolvedUrl = resolvePublicAssetUrl(inputUrl);
  if (resolvedUrl) return resolvedUrl;
  return inputUrl.replace(`/${LEGACY_BUCKET}/`, `/${DRESSING_ROOM_BUCKET}/`);
}

export function getOptimizedDressingRoomImageUrl(
  inputUrl: string,
  opts: { height: number }
): string {
  const normalizedUrl = normalizeDressingRoomImageUrl(inputUrl);
  const height = Number.isFinite(opts.height) ? Math.max(1, Math.round(opts.height)) : 1;

  if (isImageKitUrl(normalizedUrl)) {
    try {
      const urlEndpoint = new URL(normalizedUrl).origin;
      return buildSrc({
        src: normalizedUrl,
        urlEndpoint,
        transformation: [{ height }],
      });
    } catch {
      return normalizedUrl;
    }
  }

  const objectPath = parseDressingRoomStorageObjectPath(normalizedUrl);
  if (!objectPath) return inputUrl;

  try {
    const url = new URL(normalizedUrl);
    url.pathname = `${RENDER_PUBLIC_PREFIX}${objectPath}`;
    url.searchParams.set('height', String(height));
    return url.toString();
  } catch {
    return inputUrl;
  }
}
