import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

// ============================================
// Types
// ============================================

export interface StockOpeningItem {
  product_id: number;
  variant_id: number;
  opening_quantity: number;
  unit?: string;
  notes?: string;
}

export interface StockOpening {
  id: number;
  opening_number: string;
  opening_date: string;
  location: string;
  notes?: string;
  status: 'draft' | 'confirmed';
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
  items_count: number;
}

export interface StockOpeningDetail extends StockOpening {
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    variant_id: number;
    variant_name: string;
    variant_sku: string;
    opening_quantity: number;
    unit: string;
    notes?: string;
  }>;
}

export interface StockAdjustmentItem {
  product_id: number;
  variant_id: number;
  quantity_change: number;
  unit?: string;
  notes?: string;
}

export interface StockAdjustment {
  id: number;
  adjustment_number: string;
  adjustment_date: string;
  adjustment_type: 'gift' | 'kol' | 'loss' | 'gain' | 'other';
  reason: string;
  notes?: string;
  location: string;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
  items_count: number;
}

export interface StockOpnameItem {
  product_id: number;
  variant_id: number;
  opening_stock: number;
  sold_quantity: number;
  adjustment_quantity: number;
  system_stock: number;
  physical_count: number;
  variance_reason?: string;
  unit?: string;
  notes?: string;
}

export interface StockOpname {
  id: number;
  opname_number: string;
  opname_date: string;
  location: string;
  notes?: string;
  status: 'draft' | 'finalized';
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
  items_count: number;
  variance_count: number;
}

export interface StockOpnameDetail extends StockOpname {
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    variant_id: number;
    variant_name: string;
    variant_sku: string;
    opening_stock: number;
    sold_quantity: number;
    adjustment_quantity: number;
    system_stock: number;
    physical_count: number;
    variance: number;
    variance_reason?: string;
    unit: string;
    notes?: string;
  }>;
}

export interface SystemStockCalculation {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  variant_sku: string;
  opening_stock: number;
  sold_quantity: number;
  adjustment_quantity: number;
  system_stock: number;
}

// ============================================
// Stock Opening Hooks
// ============================================

export const useStockOpeningList = (limit = 50, offset = 0) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stock-openings', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_stock_opening_list', {
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return data as {
        data: StockOpening[];
        total_count: number;
        limit: number;
        offset: number;
      };
    },
  });

  // ✨ Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('stock-openings-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'stock_openings',
        },
        () => {
          console.log('🔄 Stock opening changed, refreshing...');
          queryClient.invalidateQueries({ queryKey: ['stock-openings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export const useStockOpeningDetail = (openingId: number | null) => {
  return useQuery({
    queryKey: ['stock-opening-detail', openingId],
    queryFn: async () => {
      if (!openingId) return null;

      const { data, error } = await supabase.rpc('get_stock_opening_detail', {
        p_opening_id: openingId,
      });

      if (error) throw error;
      return data as StockOpeningDetail;
    },
    enabled: !!openingId,
  });
};

export const useCreateStockOpening = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      opening_date: string;
      location?: string;
      notes?: string;
      items: StockOpeningItem[];
    }) => {
      const { data, error } = await supabase.rpc('create_stock_opening', {
        p_opening_date: params.opening_date,
        p_location: params.location || 'SparkStage55',
        p_notes: params.notes || null,
        p_items: params.items,
      });

      if (error) throw error;
      return data as {
        opening_id: number;
        opening_number: string;
        items_processed: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-openings'] });
    },
  });
};

// ============================================
// Stock Adjustment Hooks
// ============================================

export const useStockAdjustmentList = (limit = 50, offset = 0) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stock-adjustments', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_stock_adjustment_list', {
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return data as {
        data: StockAdjustment[];
        total_count: number;
        limit: number;
        offset: number;
      };
    },
  });

  // ✨ Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('stock-adjustments-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'stock_adjustments',
        },
        () => {
          console.log('🔄 Stock adjustment changed, refreshing...');
          queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export const useCreateStockAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      adjustment_date: string;
      adjustment_type: 'gift' | 'kol' | 'loss' | 'gain' | 'other';
      reason: string;
      notes?: string;
      location?: string;
      items: StockAdjustmentItem[];
    }) => {
      const { data, error } = await supabase.rpc('create_stock_adjustment', {
        p_adjustment_date: params.adjustment_date,
        p_adjustment_type: params.adjustment_type,
        p_reason: params.reason,
        p_notes: params.notes || null,
        p_location: params.location || 'SparkStage55',
        p_items: params.items,
      });

      if (error) throw error;
      return data as {
        adjustment_id: number;
        adjustment_number: string;
        items_processed: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// ============================================
// Stock Opname Hooks
// ============================================

export const useStockOpnameList = (limit = 50, offset = 0) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stock-opnames', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_stock_opname_list', {
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return data as {
        data: StockOpname[];
        total_count: number;
        limit: number;
        offset: number;
      };
    },
  });

  // ✨ Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('stock-opnames-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'stock_opnames',
        },
        () => {
          console.log('🔄 Stock opname changed, refreshing...');
          queryClient.invalidateQueries({ queryKey: ['stock-opnames'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export const useStockOpnameDetail = (opnameId: number | null) => {
  return useQuery({
    queryKey: ['stock-opname-detail', opnameId],
    queryFn: async () => {
      if (!opnameId) return null;

      const { data, error } = await supabase.rpc('get_stock_opname_detail', {
        p_opname_id: opnameId,
      });

      if (error) throw error;
      return data as StockOpnameDetail;
    },
    enabled: !!opnameId,
  });
};

export const useCalculateSystemStock = (opnameDate: string | null, location = 'SparkStage55') => {
  return useQuery({
    queryKey: ['system-stock-calculation', opnameDate, location],
    queryFn: async () => {
      if (!opnameDate) return [];

      console.log('📊 Calculating system stock for:', { opnameDate, location });

      try {
        const { data, error } = await supabase.rpc('calculate_system_stock_for_opname', {
          p_opname_date: opnameDate,
          p_location: location,
        });

        if (error) {
          console.error('❌ RPC Error:', error);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
          
          // More helpful error message
          if (error.message?.includes('function') || error.message?.includes('does not exist')) {
            throw new Error('Function calculate_system_stock_for_opname belum di-deploy. Jalankan: npm run supabase:db:push');
          }
          
          throw new Error(`Database error: ${error.message || 'Unknown error'}`);
        }

        console.log('✅ System stock calculated:', data?.length || 0, 'variants');
        console.log('📦 Sample data:', data?.[0]);
        
        if (!data || data.length === 0) {
          console.warn('⚠️ No stock opening found for:', { opnameDate, location });
          console.warn('💡 Possible causes:');
          console.warn('   1. No stock opening exists for this date/location');
          console.warn('   2. Stock opening status is not "confirmed"');
          console.warn('   3. Date format mismatch (should be YYYY-MM-DD)');
          console.warn('   4. Location string mismatch (case-sensitive)');
        }

        return data as SystemStockCalculation[];
      } catch (err) {
        console.error('❌ Error calculating system stock:', err);
        throw err;
      }
    },
    enabled: !!opnameDate,
    retry: false, // Don't retry on error
  });
};

export const useConfirmStockOpening = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (openingId: number) => {
      // Update status to confirmed via direct update
      const { data, error } = await supabase
        .from('stock_openings')
        .update({ status: 'confirmed' })
        .eq('id', openingId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error confirming stock opening:', error);
        throw new Error(`Gagal confirm stock opening: ${error.message}`);
      }

      console.log('✅ Stock opening confirmed:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opening-list'] });
      queryClient.invalidateQueries({ queryKey: ['stock-opening-detail'] });
    },
  });
};

export const useUpdateStockOpening = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      opening_id: number;
      opening_date: string;
      location: string;
      notes?: string;
      items: StockOpeningItem[];
    }) => {
      const { data, error } = await supabase.rpc('update_stock_opening', {
        p_opening_id: params.opening_id,
        p_opening_date: params.opening_date,
        p_location: params.location,
        p_notes: params.notes || null,
        p_items: params.items,
      });

      if (error) {
        console.error('❌ Error updating stock opening:', error);
        throw new Error(`Gagal update stock opening: ${error.message}`);
      }

      console.log('✅ Stock opening updated:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opening-list'] });
      queryClient.invalidateQueries({ queryKey: ['stock-opening-detail'] });
    },
  });
};

export const useDeleteStockOpening = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (openingId: number) => {
      const { data, error } = await supabase.rpc('delete_stock_opening', {
        p_opening_id: openingId,
      });

      if (error) {
        console.error('❌ Error deleting stock opening:', error);
        throw new Error(`Gagal hapus stock opening: ${error.message}`);
      }

      console.log('✅ Stock opening deleted:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opening-list'] });
    },
  });
};

// ============================================
// Stock Adjustment Mutations
// ============================================

export const useUpdateStockAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      adjustment_id: number;
      adjustment_date: string;
      adjustment_type: 'gift' | 'kol' | 'loss' | 'gain' | 'other';
      reason: string;
      notes?: string;
      location?: string;
      items: StockAdjustmentItem[];
    }) => {
      const { data, error } = await supabase.rpc('update_stock_adjustment', {
        p_adjustment_id: params.adjustment_id,
        p_adjustment_date: params.adjustment_date,
        p_adjustment_type: params.adjustment_type,
        p_reason: params.reason,
        p_notes: params.notes || null,
        p_location: params.location || 'SparkStage55',
        p_items: params.items,
      });

      if (error) {
        console.error('❌ Error updating stock adjustment:', error);
        throw new Error(`Gagal update stock adjustment: ${error.message}`);
      }

      console.log('✅ Stock adjustment updated:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment-list'] });
    },
  });
};

export const useDeleteStockAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adjustmentId: number) => {
      const { data, error } = await supabase.rpc('delete_stock_adjustment', {
        p_adjustment_id: adjustmentId,
      });

      if (error) {
        console.error('❌ Error deleting stock adjustment:', error);
        throw new Error(`Gagal hapus stock adjustment: ${error.message}`);
      }

      console.log('✅ Stock adjustment deleted:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment-list'] });
    },
  });
};

// ============================================
// Stock Opname Mutations
// ============================================

export const useDeleteStockOpname = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opnameId: number) => {
      const { data, error } = await supabase.rpc('delete_stock_opname', {
        p_opname_id: opnameId,
      });

      if (error) {
        console.error('❌ Error deleting stock opname:', error);
        throw new Error(`Gagal hapus stock opname: ${error.message}`);
      }

      console.log('✅ Stock opname deleted:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-list'] });
    },
  });
};

export const useFinalizeStockOpname = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opnameId: number) => {
      const { data, error } = await supabase.rpc('finalize_stock_opname', {
        p_opname_id: opnameId,
      });

      if (error) {
        console.error('❌ Error finalizing stock opname:', error);
        throw new Error(`Gagal finalize stock opname: ${error.message}`);
      }

      console.log('✅ Stock opname finalized:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-list'] });
      queryClient.invalidateQueries({ queryKey: ['stock-opname-detail'] });
    },
  });
};

export const useCreateStockOpname = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      opname_date: string;
      location?: string;
      notes?: string;
      items: StockOpnameItem[];
    }) => {
      const { data, error } = await supabase.rpc('create_stock_opname', {
        p_opname_date: params.opname_date,
        p_location: params.location || 'SparkStage55',
        p_notes: params.notes || null,
        p_items: params.items,
      });

      if (error) throw error;
      return data as {
        opname_id: number;
        opname_number: string;
        items_processed: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opnames'] });
    },
  });
};
