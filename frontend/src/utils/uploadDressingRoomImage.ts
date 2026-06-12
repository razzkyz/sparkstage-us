import { supabase } from '../lib/supabase';
import { deletePublicImageKitAssetByUrl } from '../lib/publicImagekitDelete';
import { uploadPublicAssetToImageKit } from '../lib/publicImagekitUpload';

const DRESSING_ROOM_BUCKET = 'dressing-room-images';
const LEGACY_BUCKET = 'fashion-images';

export async function uploadDressingRoomImage(
    file: File,
    collectionId: number | string,
    lookId?: number | string
): Promise<string> {
    void collectionId;
    // Only allow PNG for transparent cutouts
    const fileName = file.name.toLowerCase();
    const hasValidExt = /\.png$/i.test(fileName);
    const hasValidMime = file.type === 'image/png' || file.type === '';

    if (!hasValidMime && !hasValidExt) {
        throw new Error('Hanya file PNG yang diperbolehkan. Upload foto model dengan background transparan (PNG).');
    }

    if (file.size > 10 * 1024 * 1024) {
        throw new Error('Ukuran file maks 10MB.');
    }

    const uuid =
        globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if (!lookId) {
        throw new Error('Look ID is required for dressing room image uploads.');
    }

    return uploadPublicAssetToImageKit({
        file,
        fileName: `${uuid}.png`,
        folderPath: `/public/dressing-room/${lookId}`,
    });
}

export async function deleteDressingRoomImage(imageUrl: string): Promise<void> {
    if (typeof imageUrl !== 'string' || imageUrl.trim() === '') return;

    let url: URL;
    try {
        url = new URL(imageUrl);
    } catch {
        return;
    }

    if (url.hostname === 'ik.imagekit.io' || url.hostname.endsWith('.imagekit.io')) {
        await deletePublicImageKitAssetByUrl(imageUrl);
        return;
    }
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/(dressing-room-images|fashion-images)\/(.+)$/);
    if (!pathMatch) return;

    const bucketId = pathMatch[1];
    const objectPath = pathMatch[2];

    // Object should live in the new bucket after migration, but keep legacy cleanup just in case.
    if (bucketId === LEGACY_BUCKET) {
        await supabase.storage.from(DRESSING_ROOM_BUCKET).remove([objectPath]);
    }
    await supabase.storage.from(bucketId).remove([objectPath]);
}
