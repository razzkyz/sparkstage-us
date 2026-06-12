import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface InventoryProduct {
  variant_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  variant_name: string;
  variant_sku: string;
  current_stock: number;
  reserved_stock: number;
  price: number;
  is_active: boolean;
}

export const useInventoryProducts = (searchQuery: string = '') => {
  return useQuery({
    queryKey: ['inventory-products', searchQuery],
    queryFn: async () => {
      console.log('🔍 Fetching inventory products, searchQuery:', searchQuery);
      
      try {
        // Fetch ALL products (no limit for complete inventory)
        const { data, error } = await supabase
          .from('product_variants')
          .select(`
            id,
            name,
            sku,
            stock,
            reserved_stock,
            price,
            is_active,
            product_id,
            products (
              id,
              name,
              sku,
              is_active
            )
          `)
          .eq('is_active', true)
          .order('product_id', { ascending: true });

        if (error) {
          console.error('❌ Supabase error:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log('📦 Raw data from database:', data?.length || 0, 'items');

        if (!data || data.length === 0) {
          console.warn('⚠️ No products found in database');
          return {
            data: [],
            total_count: 0,
          };
        }

        // Transform and filter
        let transformed: InventoryProduct[] = data
          .filter((v: any) => {
            // Filter out items where products is null or inactive
            return v.products && v.products.is_active === true;
          })
          .map((v: any) => ({
            variant_id: v.id,
            product_id: v.product_id,
            product_name: v.products?.name || 'Unknown Product',
            product_sku: v.products?.sku || '',
            variant_name: v.name || 'Default',
            variant_sku: v.sku || '',
            current_stock: v.stock || 0,
            reserved_stock: v.reserved_stock || 0,
            price: v.price || 0,
            is_active: v.is_active,
          }));

        console.log('✅ Transformed products:', transformed.length, 'items');

        // Client-side filtering for multi-field search
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          transformed = transformed.filter((item) => {
            const searchText = `${item.product_name} ${item.variant_name} ${item.variant_sku} ${item.product_sku}`.toLowerCase();
            const matches = searchText.includes(lowerQuery);
            return matches;
          });
          console.log('🔎 Filtered to:', transformed.length, 'items for query:', searchQuery);
        }

        return {
          data: transformed,
          total_count: transformed.length,
        };
      } catch (err) {
        console.error('❌ Error in useInventoryProducts:', err);
        throw err;
      }
    },
    enabled: true,
    retry: 1, // Only retry once
    staleTime: 30000, // Cache for 30 seconds
  });
};
