import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { uploadPublicAssetToImageKit } from '../lib/publicImagekitUpload';

export type RetailProductImage = {
  id: number;
  product_retail_id: number;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
};

async function fetchRetailProductImages(productId: number): Promise<RetailProductImage[]> {
  const { data, error } = await supabase
    .from('product_retail_images')
    .select('id, product_retail_id, image_url, is_primary, display_order, created_at')
    .eq('product_retail_id', productId)
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as RetailProductImage[];
}

export function useRetailProductImages(productId: number | null) {
  return useQuery({
    queryKey: ['retailProductImages', productId],
    queryFn: () => fetchRetailProductImages(productId!),
    enabled: productId !== null && productId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useRetailProductImageMutations(productId: number | null) {
  const qc = useQueryClient();
  const key = ['retailProductImages', productId];

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const addImage = useMutation({
    mutationFn: async ({
      imageUrl,
      isPrimary = false,
      displayOrder = 0,
    }: {
      imageUrl: string;
      isPrimary?: boolean;
      displayOrder?: number;
    }) => {
      if (!productId) throw new Error('No product ID');

      // If setting primary, unset other primaries first
      if (isPrimary) {
        await supabase
          .from('product_retail_images')
          .update({ is_primary: false })
          .eq('product_retail_id', productId);
      }

      const { data, error } = await supabase
        .from('product_retail_images')
        .insert({
          product_retail_id: productId,
          image_url: imageUrl,
          is_primary: isPrimary,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  const uploadAndAdd = useMutation({
    mutationFn: async ({
      file,
      isPrimary = false,
      displayOrder = 0,
    }: {
      file: File;
      isPrimary?: boolean;
      displayOrder?: number;
    }) => {
      if (!productId) throw new Error('No product ID');
      const fileName = `retail-${productId}-${Date.now()}`;
      const imageUrl = await uploadPublicAssetToImageKit({
        file,
        fileName,
        folderPath: `public/retail-products/${productId}`,
      });

      // If setting primary, unset other primaries first
      if (isPrimary) {
        await supabase
          .from('product_retail_images')
          .update({ is_primary: false })
          .eq('product_retail_id', productId);
      }

      const { data, error } = await supabase
        .from('product_retail_images')
        .insert({
          product_retail_id: productId,
          image_url: imageUrl,
          is_primary: isPrimary,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  const setPrimary = useMutation({
    mutationFn: async (imageId: number) => {
      if (!productId) throw new Error('No product ID');
      // Unset all primaries
      await supabase
        .from('product_retail_images')
        .update({ is_primary: false })
        .eq('product_retail_id', productId);
      // Set this one
      const { error } = await supabase
        .from('product_retail_images')
        .update({ is_primary: true })
        .eq('id', imageId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const updates = orderedIds.map((id, i) =>
        supabase
          .from('product_retail_images')
          .update({ display_order: i })
          .eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: invalidate,
  });

  const deleteImage = useMutation({
    mutationFn: async (imageId: number) => {
      const { error } = await supabase
        .from('product_retail_images')
        .delete()
        .eq('id', imageId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { addImage, uploadAndAdd, setPrimary, reorder, deleteImage };
}
