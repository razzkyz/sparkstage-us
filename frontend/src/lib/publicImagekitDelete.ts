import { ensureFreshToken } from '../utils/auth';
import { isImageKitUrl } from './imagekit';
import { invokeSupabaseFunction } from './supabaseFunctionInvoke';
import { supabase } from './supabase';

async function getCurrentAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = await ensureFreshToken(session);
  if (!accessToken) {
    throw new Error('Sesi login kadaluarsa. Silakan login ulang.');
  }

  return accessToken;
}

export async function deletePublicImageKitAsset(filePath: string): Promise<void> {
  const accessToken = await getCurrentAccessToken();
  await invokeSupabaseFunction({
    functionName: 'imagekit-delete',
    body: { filePath },
    headers: { Authorization: `Bearer ${accessToken}` },
    fallbackMessage: 'Failed to delete ImageKit asset',
  });
}

export function getImageKitFilePathFromUrl(imageUrl: string): string | null {
  if (!isImageKitUrl(imageUrl)) return null;

  try {
    const url = new URL(imageUrl);
    let normalizedPath = decodeURIComponent(url.pathname).replace(/\/{2,}/g, '/').trim();
    
    // Strip the ImageKit endpoint ID (e.g., /my_id/public/...)
    const publicIndex = normalizedPath.indexOf('/public/');
    if (publicIndex !== -1) {
      normalizedPath = normalizedPath.substring(publicIndex);
    }
    
    return normalizedPath || null;
  } catch {
    return null;
  }
}

export async function deletePublicImageKitAssetByUrl(imageUrl: string | null | undefined): Promise<void> {
  if (typeof imageUrl !== 'string' || imageUrl.trim() === '') return;
  const filePath = getImageKitFilePathFromUrl(imageUrl);
  if (!filePath) return;
  await deletePublicImageKitAsset(filePath);
}
