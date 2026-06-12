import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';

export interface RetailCategory {
  id: number;
  department: 'glam' | 'charmbar' | 'sparkclub';
  name: string;
  slug: string;
  parent_id: number | null;
  is_active: boolean;
  created_at: string;
}

// Custom type for nesting categories
export type RetailCategoryNested = RetailCategory & {
  children?: RetailCategoryNested[];
};

export function useRetailCategories() {
  const queryClient = useQueryClient();

  // Fetch all active categories
  const categoriesQuery = useQuery({
    queryKey: ['retail-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retail_categories')
        .select('*')
        .order('department', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      return data as RetailCategory[];
    },
  });

  // Create a category
  const createCategory = useMutation({
    mutationFn: async (newCategory: Omit<RetailCategory, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('retail_categories')
        .insert(newCategory)
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('A category with this slug already exists. Please choose a different name or slug.');
        }
        throw new Error(error.message);
      }
      return data as RetailCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-categories'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productRetailSummaries() });
    },
  });

  // Update a category
  const updateCategory = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<RetailCategory> }) => {
      const { data, error } = await supabase
        .from('retail_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data as RetailCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-categories'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productRetailSummaries() });
    },
  });

  // Delete a category
  const deleteCategory = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('retail_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-categories'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productRetailSummaries() });
    },
  });

  // Helper to build tree
  const buildCategoryTree = (categories: RetailCategory[], department?: string): RetailCategoryNested[] => {
    let filtered = categories;
    if (department) {
      filtered = categories.filter((c) => c.department === department);
    }

    const map = new Map<number, RetailCategoryNested>();
    const roots: RetailCategoryNested[] = [];

    // First pass: map all items
    filtered.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    filtered.forEach((cat) => {
      const node = map.get(cat.id);
      if (!node) return;

      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)?.children?.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  return {
    categories: categoriesQuery.data ?? [],
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    createCategory: createCategory.mutateAsync,
    isCreating: createCategory.isPending,
    updateCategory: updateCategory.mutateAsync,
    isUpdating: updateCategory.isPending,
    deleteCategory: deleteCategory.mutateAsync,
    isDeleting: deleteCategory.isPending,
    buildCategoryTree,
  };
}
