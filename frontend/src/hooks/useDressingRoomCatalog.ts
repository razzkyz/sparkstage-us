import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface DressingRoomCatalogProduct {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  slug: string;
  is_active: boolean;
  dressing_room_category_id: number | null;
  dressing_room_product_variants?: {
    daily_rental_fee: number;
    deposit_amount: number;
  }[];
}

export interface DressingRoomCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
}

/**
 * Hook: Fetch dressing room categories
 */
export function useDressingRoomCategories() {
  return useQuery({
    queryKey: ['dressing-room-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dressing_room_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as DressingRoomCategory[];
    },
  });
}

/**
 * Hook: Fetch subcategories for a parent category
 */
export function useDressingRoomSubcategories(parentId?: number) {
  return useQuery({
    queryKey: ['dressing-room-subcategories', parentId],
    queryFn: async () => {
      if (!parentId) return [];

      const { data, error } = await supabase
        .from('dressing_room_categories')
        .select('*')
        .eq('parent_id', parentId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as DressingRoomCategory[];
    },
    enabled: !!parentId,
  });
}

/**
 * Hook: Fetch subcategories by parent slug (resilient to ID changes)
 */
export function useDressingRoomSubcategoriesBySlug(parentSlug: string) {
  return useQuery({
    queryKey: ['dressing-room-subcategories-by-slug', parentSlug],
    queryFn: async () => {
      // Fetch parent ID by slug
      const { data: parent, error: parentError } = await supabase
        .from('dressing_room_categories')
        .select('id')
        .eq('slug', parentSlug)
        .eq('is_active', true)
        .maybeSingle();

      if (parentError) throw parentError;
      if (!parent) return [];

      // Fetch subcategories under that parent
      const { data, error } = await supabase
        .from('dressing_room_categories')
        .select('*')
        .eq('parent_id', parent.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as DressingRoomCategory[];
    },
    enabled: !!parentSlug,
  });
}

/**
 * Hook: Fetch dressing room products from dressing_room_products table
 */
export function useDressingRoomCatalog() {
  return useQuery({
    queryKey: ['dressing-room-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dressing_room_products')
        .select(`
          id, name, description, image_url, category, slug, is_active, dressing_room_category_id,
          dressing_room_product_variants(daily_rental_fee, deposit_amount, available_quantity)
        `)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as DressingRoomCatalogProduct[];
    },
  });
}

/**
 * Hook: Fetch product variants for dressing room catalog
 */
export function useDressingRoomCatalogVariants(productId?: number) {
  return useQuery({
    queryKey: ['dressing-room-catalog-variants', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('dressing_room_product_variants')
        .select('id, name, sku, price, deposit_amount, daily_rental_fee, total_quantity, available_quantity, is_active')
        .eq('dressing_room_product_id', productId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

/**
 * Hook: Fetch products filtered by category ID
 */
export function useDressingRoomProductsByCategory(categoryId?: number) {
  return useQuery({
    queryKey: ['dressing-room-products-by-category', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from('dressing_room_products')
        .select(`
          id, name, description, image_url, category, slug, is_active, dressing_room_category_id,
          dressing_room_product_variants(daily_rental_fee, deposit_amount, available_quantity)
        `)
        .eq('dressing_room_category_id', categoryId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as DressingRoomCatalogProduct[];
    },
    enabled: !!categoryId,
  });
}
