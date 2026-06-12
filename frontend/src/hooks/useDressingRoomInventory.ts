import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  DressingRoomProduct,
  DressingRoomProductVariant,
  RentalItemStatusHistoryEntry,
  DressingRoomInventorySummary,
  RentalItemStatus,
} from '../types/dressingRoom';

/**
 * Hook: Fetch all active dressing room products
 */
export function useDressingRoomProducts() {
  return useQuery({
    queryKey: ['dressing-room-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dressing_room_products')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as DressingRoomProduct[];
    },
  });
}

/**
 * Hook: Fetch dressing room product variants (with optional product filter)
 */
export function useDressingRoomProductVariants(productId?: number) {
  return useQuery({
    queryKey: ['dressing-room-variants', productId],
    queryFn: async () => {
      let query = supabase
        .from('dressing_room_product_variants')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (productId) {
        query = query.eq('dressing_room_product_id', productId);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as DressingRoomProductVariant[];
    },
    enabled: true,
  });
}

/**
 * Hook: Fetch dressing room inventory summary
 */
export function useDressingRoomInventorySummary() {
  return useQuery({
    queryKey: ['dressing-room-inventory-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dressing_room_inventory_summary');

      if (error) throw error;
      return (data || []) as DressingRoomInventorySummary[];
    },
  });
}

/**
 * Hook: Fetch rental item status history
 */
export function useRentalItemStatusHistory(rentalOrderItemId?: number) {
  return useQuery({
    queryKey: ['rental-item-status-history', rentalOrderItemId],
    queryFn: async () => {
      if (!rentalOrderItemId) return [];

      const { data, error } = await supabase.rpc('get_rental_item_status_history', {
        p_rental_order_item_id: rentalOrderItemId,
      });

      if (error) throw error;
      return (data || []) as RentalItemStatusHistoryEntry[];
    },
    enabled: !!rentalOrderItemId,
  });
}

/**
 * Hook: Update rental item status
 */
export function useUpdateRentalItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      rentalOrderItemId: number;
      newStatus: RentalItemStatus;
      reason?: string;
      notes?: string;
      photoUrls?: string[];
    }) => {
      const { data, error } = await supabase.rpc('update_rental_item_status', {
        p_rental_order_item_id: params.rentalOrderItemId,
        p_new_status: params.newStatus,
        p_reason: params.reason || null,
        p_notes: params.notes || null,
        p_photo_urls: params.photoUrls || [],
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['rental-item-status-history', variables.rentalOrderItemId],
      });
      queryClient.invalidateQueries({
        queryKey: ['rental-orders'],
      });
    },
  });
}

/**
 * Hook: Update dressing room variant inventory
 */
export function useUpdateDressingRoomInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      variantId: number;
      totalQty?: number;
      availableQty?: number;
      reservedQty?: number;
      damagedQty?: number;
      inLaundryQty?: number;
    }) => {
      const { data, error } = await supabase.rpc('update_dressing_room_variant_inventory', {
        p_variant_id: params.variantId,
        p_total_qty: params.totalQty || null,
        p_available_qty: params.availableQty || null,
        p_reserved_qty: params.reservedQty || null,
        p_damaged_qty: params.damagedQty || null,
        p_in_laundry_qty: params.inLaundryQty || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate inventory queries
      queryClient.invalidateQueries({
        queryKey: ['dressing-room-variants'],
      });
      queryClient.invalidateQueries({
        queryKey: ['dressing-room-inventory-summary'],
      });
    },
  });
}

/**
 * Hook: Fetch single dressing room product with variants
 */
export function useDressingRoomProductDetail(productId?: number) {
  return useQuery({
    queryKey: ['dressing-room-product-detail', productId],
    queryFn: async () => {
      if (!productId) return null;

      const { data, error } = await supabase
        .from('dressing_room_products')
        .select(
          `
          *,
          variants:dressing_room_product_variants(*)
        `
        )
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
}
