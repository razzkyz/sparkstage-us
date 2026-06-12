import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StockOpname, StockOpnameDetail, StockOpnameFormData } from '../types';

interface StockOpnameListResponse {
  data: StockOpname[];
  total_count: number;
  limit: number;
  offset: number;
}

interface CreateStockOpnameResponse {
  opname_id: number;
  opname_number: string;
  items_processed: number;
}

export const useStockOpnameList = (limit = 50, offset = 0) => {
  return useQuery({
    queryKey: ['stock-opname-list', limit, offset],
    queryFn: async (): Promise<StockOpnameListResponse> => {
      const { data, error } = await supabase.rpc('get_stock_opname_list', {
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as StockOpnameListResponse;
    },
  });
};

export const useStockOpnameDetail = (opnameId: number | null) => {
  return useQuery({
    queryKey: ['stock-opname-detail', opnameId],
    queryFn: async (): Promise<StockOpnameDetail> => {
      if (!opnameId) {
        throw new Error('Opname ID is required');
      }

      const { data, error } = await supabase.rpc('get_stock_opname_detail', {
        p_opname_id: opnameId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as StockOpnameDetail;
    },
    enabled: !!opnameId,
  });
};

export const useCreateStockOpname = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: StockOpnameFormData): Promise<CreateStockOpnameResponse> => {
      const { data, error } = await supabase.rpc('create_stock_opname', {
        p_location: formData.location,
        p_transaction_date: formData.transaction_date,
        p_transaction_type: formData.transaction_type,
        p_reason: formData.reason,
        p_notes: formData.notes,
        p_opname_start_date: formData.opname_start_date,
        p_opname_end_date: formData.opname_end_date,
        p_items: formData.items,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as CreateStockOpnameResponse;
    },
    onSuccess: () => {
      // Invalidate stock opname list to refetch
      queryClient.invalidateQueries({ queryKey: ['stock-opname-list'] });
      // Invalidate inventory to reflect updated stock
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

interface DeleteStockOpnameResponse {
  success: boolean;
  opname_number: string;
  items_deleted: number;
  message: string;
}

export const useDeleteStockOpname = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opnameId: number): Promise<DeleteStockOpnameResponse> => {
      const { data, error } = await supabase.rpc('delete_stock_opname', {
        p_opname_id: opnameId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as DeleteStockOpnameResponse;
    },
    onSuccess: () => {
      // Invalidate stock opname list
      queryClient.invalidateQueries({ queryKey: ['stock-opname-list'] });
      queryClient.invalidateQueries({ queryKey: ['stock-opname-detail'] });
      // Invalidate inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

interface UpdateStockOpnameResponse {
  success: boolean;
  message: string;
}

export const useUpdateStockOpname = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: {
        opname_id: number;
        reason?: string;
        notes?: string;
      }
    ): Promise<UpdateStockOpnameResponse> => {
      const { data: result, error } = await supabase.rpc('update_stock_opname', {
        p_opname_id: data.opname_id,
        p_reason: data.reason,
        p_notes: data.notes,
      });

      if (error) {
        throw new Error(error.message);
      }

      return result as UpdateStockOpnameResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-detail'] });
      queryClient.invalidateQueries({ queryKey: ['stock-opname-list'] });
    },
  });
};

interface BulkImportResponse {
  opname_id: number;
  total_imported: number;
  total_errors: number;
  message: string;
}

export const useBulkImportStockOpname = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importData: any[]): Promise<BulkImportResponse> => {
      const { data, error } = await supabase.rpc('bulk_import_stock_opname', {
        p_data: importData,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as BulkImportResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-list'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};
