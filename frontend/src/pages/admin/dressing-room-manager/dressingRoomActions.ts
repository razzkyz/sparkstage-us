import { supabase } from '../../../lib/supabase';
import { deleteDressingRoomImage, uploadDressingRoomImage } from '../../../utils/uploadDressingRoomImage';
import { toSlug } from './dressingRoomManagerHelpers';
import type { DressingRoomCollection, DressingRoomLook } from './dressingRoomManagerTypes';

type DressingRoomLookCleanupState = {
  modelImageUrl: string;
  photoUrls: string[];
};

function normalizeAssetUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

async function cleanupDressingRoomAssets(urls: Array<string | null | undefined>): Promise<void> {
  const uniqueUrls = Array.from(new Set(urls.map(normalizeAssetUrl).filter((value): value is string => value !== null)));
  for (const url of uniqueUrls) {
    await deleteDressingRoomImage(url);
  }
}

async function cleanupDressingRoomAssetsBestEffort(urls: Array<string | null | undefined>): Promise<void> {
  try {
    await cleanupDressingRoomAssets(urls);
  } catch (error) {
    // Cleanup failure should not rollback successful DB mutations.
    console.warn('Failed to cleanup dressing-room assets in provider:', error);
  }
}

async function fetchDressingRoomLookCleanupState(lookId: number): Promise<DressingRoomLookCleanupState> {
  const { data: look, error: lookError } = await supabase
    .from('dressing_room_looks')
    .select('model_image_url')
    .eq('id', lookId)
    .single();
  if (lookError) throw lookError;

  const { data: photos, error: photosError } = await supabase
    .from('dressing_room_look_photos')
    .select('id, image_url')
    .eq('look_id', lookId)
    .order('sort_order', { ascending: true });
  if (photosError) throw photosError;

  return {
    modelImageUrl: look?.model_image_url ?? '',
    photoUrls: (photos ?? []).map((photo) => photo.image_url).filter((value): value is string => typeof value === 'string'),
  };
}

async function fetchDressingRoomCollectionCleanupUrls(collectionId: number): Promise<string[]> {
  const { data: collection, error: collectionError } = await supabase
    .from('dressing_room_collections')
    .select('cover_image_url')
    .eq('id', collectionId)
    .single();
  if (collectionError) throw collectionError;

  const { data: looks, error: looksError } = await supabase
    .from('dressing_room_looks')
    .select('id, model_image_url')
    .eq('collection_id', collectionId);
  if (looksError) throw looksError;

  const lookIds = (looks ?? []).map((look) => look.id);
  let photoUrls: string[] = [];

  if (lookIds.length > 0) {
    const { data: photos, error: photosError } = await supabase
      .from('dressing_room_look_photos')
      .select('image_url')
      .in('look_id', lookIds);
    if (photosError) throw photosError;
    photoUrls = (photos ?? []).map((photo) => photo.image_url).filter((value): value is string => typeof value === 'string');
  }

  return [
    collection?.cover_image_url ?? null,
    ...(looks ?? []).map((look) => look.model_image_url),
    ...photoUrls,
  ].filter((value): value is string => typeof value === 'string' && value.trim() !== '');
}

export async function createDressingRoomCollection(params: {
  title: string;
  description: string;
  sortOrder: number;
}) {
  const { title, description, sortOrder } = params;
  const { error } = await supabase.from('dressing_room_collections').insert({
    title: title.trim(),
    slug: toSlug(title),
    description: description.trim() || null,
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function toggleDressingRoomCollection(collection: DressingRoomCollection) {
  const { error } = await supabase
    .from('dressing_room_collections')
    .update({ is_active: !collection.is_active, updated_at: new Date().toISOString() })
    .eq('id', collection.id);
  if (error) throw error;
}

export async function deleteDressingRoomCollection(id: number) {
  const cleanupUrls = await fetchDressingRoomCollectionCleanupUrls(id);
  const { error } = await supabase.from('dressing_room_collections').delete().eq('id', id);
  if (error) throw error;
  await cleanupDressingRoomAssetsBestEffort(cleanupUrls);
}

export async function saveDressingRoomCollectionInfo(params: {
  id: number;
  title: string;
  description: string;
}) {
  const { id, title, description } = params;
  const slug = toSlug(title);
  const { error } = await supabase
    .from('dressing_room_collections')
    .update({
      title: title.trim(),
      description: description.trim() || null,
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
  return slug;
}

export async function addDressingRoomLook(params: {
  collectionId: number;
  nextNumber: number;
  sortOrder: number;
}) {
  const { collectionId, nextNumber, sortOrder } = params;
  const { error } = await supabase.from('dressing_room_looks').insert({
    collection_id: collectionId,
    look_number: nextNumber,
    model_image_url: '',
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function addDressingRoomPhoto(params: {
  collectionId: number;
  lookId: number;
  file: File;
  existingLooks: DressingRoomLook[];
}) {
  const { collectionId, lookId, file, existingLooks } = params;
  const url = await uploadDressingRoomImage(file, collectionId, lookId);
  const existingPhotos = existingLooks.find((look) => look.id === lookId)?.photos ?? [];
  const nextSortOrder = existingPhotos.length === 0 ? 0 : Math.max(...existingPhotos.map((photo) => photo.sort_order)) + 1;

  const { error: insertError } = await supabase.from('dressing_room_look_photos').insert({
    look_id: lookId,
    image_url: url,
    sort_order: nextSortOrder,
  });
  if (insertError) throw new Error(insertError.message);

  const existingCover = (existingLooks.find((look) => look.id === lookId)?.model_image_url ?? '').trim();
  if (!existingCover) {
    const { error: coverError } = await supabase
      .from('dressing_room_looks')
      .update({ model_image_url: url, updated_at: new Date().toISOString() })
      .eq('id', lookId);
    if (coverError) throw new Error(coverError.message);
  }

  return nextSortOrder;
}

export async function replaceDressingRoomPhoto(params: {
  collectionId: number;
  lookId: number;
  photoId: number;
  previousUrl: string;
  file: File;
}) {
  const { collectionId, lookId, photoId, previousUrl, file } = params;
  const cleanupState = await fetchDressingRoomLookCleanupState(lookId);
  const { data: existingPhoto, error: existingPhotoError } = await supabase
    .from('dressing_room_look_photos')
    .select('image_url')
    .eq('id', photoId)
    .single();
  if (existingPhotoError) throw existingPhotoError;

  const previousPhotoUrl = normalizeAssetUrl(existingPhoto?.image_url) ?? normalizeAssetUrl(previousUrl);
  const url = await uploadDressingRoomImage(file, collectionId, lookId);
  const { error } = await supabase.from('dressing_room_look_photos').update({ image_url: url }).eq('id', photoId);
  if (error) throw new Error(error.message);

  if (previousPhotoUrl && cleanupState.modelImageUrl === previousPhotoUrl) {
    const { error: lookError } = await supabase
      .from('dressing_room_looks')
      .update({ model_image_url: url, updated_at: new Date().toISOString() })
      .eq('id', lookId);
    if (lookError) throw new Error(lookError.message);
  }

  await cleanupDressingRoomAssetsBestEffort([previousPhotoUrl]);
}

export async function deleteDressingRoomPhoto(params: { photoId: number; imageUrl: string }) {
  const { photoId, imageUrl } = params;
  const { data: photo, error: photoError } = await supabase
    .from('dressing_room_look_photos')
    .select('look_id, image_url')
    .eq('id', photoId)
    .single();
  if (photoError) throw photoError;

  const cleanupState = await fetchDressingRoomLookCleanupState(photo.look_id);
  const deletedPhotoUrl = normalizeAssetUrl(photo.image_url) ?? normalizeAssetUrl(imageUrl);
  const { error } = await supabase.from('dressing_room_look_photos').delete().eq('id', photoId);
  if (error) throw error;

  if (deletedPhotoUrl && cleanupState.modelImageUrl === deletedPhotoUrl) {
    const nextModelImageUrl =
      cleanupState.photoUrls.find((url) => url !== deletedPhotoUrl) ??
      '';

    const { error: lookError } = await supabase
      .from('dressing_room_looks')
      .update({ model_image_url: nextModelImageUrl, updated_at: new Date().toISOString() })
      .eq('id', photo.look_id);
    if (lookError) throw lookError;
  }

  await cleanupDressingRoomAssetsBestEffort([deletedPhotoUrl]);
}

export async function saveDressingRoomModelName(params: { lookId: number; modelName: string }) {
  const { lookId, modelName } = params;
  const { error } = await supabase
    .from('dressing_room_looks')
    .update({ model_name: modelName.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', lookId);
  if (error) throw error;
}

export async function deleteDressingRoomLook(params: { lookId: number; imageUrl: string }) {
  const { lookId, imageUrl } = params;
  const cleanupState = await fetchDressingRoomLookCleanupState(lookId);
  const { error } = await supabase.from('dressing_room_looks').delete().eq('id', lookId);
  if (error) throw error;
  await cleanupDressingRoomAssetsBestEffort([imageUrl, cleanupState.modelImageUrl, ...cleanupState.photoUrls]);
}

export async function linkDressingRoomProduct(params: { lookId: number; variantId: number; sortOrder: number }) {
  const { lookId, variantId, sortOrder } = params;
  const { error } = await supabase.from('dressing_room_look_items').insert({
    look_id: lookId,
    product_variant_id: variantId,
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function unlinkDressingRoomProduct(itemId: number) {
  const { error } = await supabase.from('dressing_room_look_items').delete().eq('id', itemId);
  if (error) throw error;
}
