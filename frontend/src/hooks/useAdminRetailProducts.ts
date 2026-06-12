import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import type { ProductRetail } from '../types';

export function useAdminRetailProducts() {
  const queryClient = useQueryClient();

  // Fetch all products
  const productsQuery = useQuery({
    queryKey: ['admin-retail-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_retail')
        .select(`
          *,
          retail_categories!retail_category_id(id, name, department)
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      
      // Normalize relation
      return (data ?? []).map((row: any) => {
        const rCat = Array.isArray(row.retail_categories) ? row.retail_categories[0] : row.retail_categories;
        return {
          ...row,
          retail_categories: rCat || null
        } as ProductRetail;
      });
    },
  });

  // Create product
  const createProduct = useMutation({
    mutationFn: async (newProduct: Partial<ProductRetail>) => {
      const { data, error } = await supabase
        .from('product_retail')
        .insert([newProduct])
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-retail-products'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productRetailSummaries() });
    },
  });

  // Update product
  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ProductRetail> }) => {
      const { data, error } = await supabase
        .from('product_retail')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-retail-products'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productRetailSummaries() });
    },
  });

  // Delete product
  const deleteProduct = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('product_retail')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-retail-products'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productRetailSummaries() });
    },
  });

  return {
    products: productsQuery.data ?? [],
    isLoading: productsQuery.isLoading,
    error: productsQuery.error,
    createProduct: createProduct.mutateAsync,
    isCreating: createProduct.isPending,
    updateProduct: updateProduct.mutateAsync,
    isUpdating: updateProduct.isPending,
    deleteProduct: deleteProduct.mutateAsync,
    isDeleting: deleteProduct.isPending,
  };
}
