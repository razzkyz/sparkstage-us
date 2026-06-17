import { upload } from '@imagekit/javascript';
import type { UploadResponse } from '@imagekit/javascript';
import { ensureFreshToken } from '../utils/auth';
// @ts-expect-error - Unused import, will be removed during ImageKit→R2 migration
import { invokeSupabaseFunction } from './supabaseFunctionInvoke';
import { supabase } from './supabase';

type ImageKitUploadAuthResponse = {
  publicKey: string;
  urlEndpoint: string;
  token: string;
  expire: number;
  signature: string;
  folder: string;
};

type PublicImageKitUploadParams = {
  file: File;
  fileName: string;
  folderPath: string;
};

// @ts-expect-error - Unused function, will be removed during ImageKit→R2 migration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// @ts-expect-error - Unused param, will be removed during ImageKit→R2 migration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getPublicImageKitUploadAuth(folderPath: string): Promise<ImageKitUploadAuthResponse> {
  // ImageKit is not used in US version - all images are in R2
  throw new Error('ImageKit upload is not available in US version. Please use R2 upload instead.');
}

function extractImageUrl(uploadResponse: UploadResponse): string {
  if (!uploadResponse.url) {
    throw new Error('ImageKit upload response did not include a public URL');
  }

  return uploadResponse.url;
}

export async function uploadPublicAssetToImageKit(params: PublicImageKitUploadParams): Promise<string> {
  const auth = await getPublicImageKitUploadAuth(params.folderPath);
  const uploadResponse = await upload({
    file: params.file,
    fileName: params.fileName,
    publicKey: auth.publicKey,
    token: auth.token,
    signature: auth.signature,
    expire: auth.expire,
    folder: auth.folder,
    useUniqueFileName: false,
    overwriteFile: false,
  });

  return extractImageUrl(uploadResponse);
}
