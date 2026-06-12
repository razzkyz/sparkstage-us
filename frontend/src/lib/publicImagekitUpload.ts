import { upload } from '@imagekit/javascript';
import type { UploadResponse } from '@imagekit/javascript';
import { ensureFreshToken } from '../utils/auth';
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

async function getPublicImageKitUploadAuth(folderPath: string): Promise<ImageKitUploadAuthResponse> {
  const accessToken = await getCurrentAccessToken();
  const data = await invokeSupabaseFunction<ImageKitUploadAuthResponse>({
    functionName: 'imagekit-auth',
    body: { folderPath },
    headers: { Authorization: `Bearer ${accessToken}` },
    fallbackMessage: 'Failed to fetch ImageKit upload auth',
  });

  const payload = data as Partial<ImageKitUploadAuthResponse> | null;
  if (
    !payload ||
    !payload.publicKey ||
    !payload.signature ||
    !payload.token ||
    !payload.expire ||
    !payload.folder ||
    !payload.urlEndpoint
  ) {
    throw new Error('ImageKit upload auth response was incomplete');
  }

  return payload as ImageKitUploadAuthResponse;
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
