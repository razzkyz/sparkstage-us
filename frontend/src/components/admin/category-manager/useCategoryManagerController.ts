import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  emptyCategoryDraft,
  getAllDescendants,
  getChildrenByParent,
  getOrphanChildren,
  getParentNameMap,
  getParentOptions,
  getParents,
  toCategoryDraft,
} from './categoryManagerHelpers';
import type { Category, CategoryDraft, CategoryManagerProps } from './categoryManagerTypes';

export function useCategoryManagerController({ isOpen, onUpdate }: Pick<CategoryManagerProps, 'isOpen' | 'onUpdate'>) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>(emptyCategoryDraft);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<number[]>([]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (caughtError) {
      console.error('Error fetching categories:', caughtError);
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void fetchCategories();
  }, [fetchCategories, isOpen]);

  const handleEdit = useCallback((category: Category) => {
    setEditingId(category.id);
    setDraft(toCategoryDraft(category));
    setSlugTouched(true);
    setError(null);
  }, []);

  const handleNew = useCallback(() => {
    setEditingId(null);
    setDraft(emptyCategoryDraft());
    setSlugTouched(false);
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft.name.trim()) {
      setError('Category name is required');
      return;
    }
    if (!draft.slug.trim()) {
      setError('Category slug is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (draft.id) {
        const { error: updateError } = await supabase
          .from('categories')
          .update({
            name: draft.name,
            slug: draft.slug,
            is_active: draft.is_active,
            parent_id: draft.parent_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draft.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('categories').insert({
          name: draft.name,
          slug: draft.slug,
          is_active: draft.is_active,
          parent_id: draft.parent_id,
        });
        if (insertError) throw insertError;
      }

      await fetchCategories();
      onUpdate();
      setEditingId(null);
      setDraft(emptyCategoryDraft());
      setSlugTouched(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  }, [draft, fetchCategories, onUpdate]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        setLoading(true);
        setError(null);

        // Check if there are products using this category
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', id)
          .is('deleted_at', null);

        if (countError) throw countError;

        const hasProducts = (count ?? 0) > 0;
        const confirmMessage = hasProducts
          ? `AWAS: Ada ${count} produk di kategori ini. Menghapus kategori ini akan ikut MENGHAPUS SEMUA produk tersebut secara PERMANEN. Sebaiknya pindahkan produk ke kategori lain dulu.\n\nTetap hapus?`
          : 'Hapus kategori ini?';

        if (!confirm(confirmMessage)) {
          setLoading(false);
          return;
        }

        const { error: deleteError } = await supabase.from('categories').delete().eq('id', id);
        if (deleteError) throw deleteError;

        await fetchCategories();
        onUpdate();
      } catch (caughtError) {
        console.error('Error deleting category:', caughtError);
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to delete category');
      } finally {
        setLoading(false);
      }
    },
    [fetchCategories, onUpdate]
  );

  const handleToggleActive = useCallback(
    async (id: number, newStatus?: boolean) => {
      try {
        setLoading(true);
        setError(null);

        const category = categories.find((c) => c.id === id);
        if (!category) throw new Error('Category not found');

        const resolvedStatus = newStatus !== undefined ? newStatus : !category.is_active;
        const descendants = getAllDescendants(id, categories);
        const allAffectedIds = [id, ...descendants];

        // Update all affected categories (parent and descendants)
        const { error: updateError } = await supabase
          .from('categories')
          .update({
            is_active: resolvedStatus,
            updated_at: new Date().toISOString(),
          })
          .in('id', allAffectedIds);

        if (updateError) throw updateError;

        // Also update all products in these categories to match the new status
        const { error: productUpdateError } = await supabase
          .from('products')
          .update({
            is_active: resolvedStatus,
            updated_at: new Date().toISOString(),
          })
          .in('category_id', allAffectedIds)
          .is('deleted_at', null); // Only update non-deleted products

        if (productUpdateError) throw productUpdateError;

        await fetchCategories();
        onUpdate();
      } catch (caughtError) {
        console.error('Error toggling category status:', caughtError);
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to toggle category status');
      } finally {
        setLoading(false);
      }
    },
    [categories, fetchCategories, onUpdate]
  );

  const parentOptions = useMemo(() => getParentOptions(categories, editingId), [categories, editingId]);
  const parents = useMemo(() => getParents(categories), [categories]);
  const childrenByParent = useMemo(() => getChildrenByParent(categories), [categories]);
  const orphanChildren = useMemo(() => getOrphanChildren(categories), [categories]);
  const parentNameMap = useMemo(() => getParentNameMap(categories), [categories]);

  useEffect(() => {
    if (!editingId) return;
    const editing = categories.find((category) => category.id === editingId);
    if (!editing) return;
    const parentId = editing.parent_id ?? editing.id;
    setExpandedParents((current) => (current.includes(parentId) ? current : [...current, parentId]));
  }, [categories, editingId]);

  const toggleExpanded = useCallback((parentId: number) => {
    setExpandedParents((current) => (current.includes(parentId) ? current.filter((id) => id !== parentId) : [...current, parentId]));
  }, []);

  return {
    categories,
    loading,
    editingId,
    draft,
    slugTouched,
    error,
    expandedParents,
    setDraft,
    setSlugTouched,
    handleEdit,
    handleNew,
    handleSave,
    handleDelete,
    handleToggleActive,
    toggleExpanded,
    parentOptions,
    parents,
    childrenByParent,
    orphanChildren,
    parentNameMap,
  };
}
