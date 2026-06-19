import type { Category, CategoryDraft } from './categoryManagerTypes';

export const emptyCategoryDraft = (): CategoryDraft => ({
  name: '',
  slug: '',
  is_active: true,
  parent_id: null,
});

export const toCategoryDraft = (category: Category): CategoryDraft => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  is_active: category.is_active,
  parent_id: category.parent_id,
});

const isDescendant = (categoryId: number, targetId: number, allCategories: Category[]): boolean => {
  let current = allCategories.find((c) => c.id === categoryId);
  const visited = new Set<number>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.parent_id === targetId) return true;
    const parentId = current.parent_id;
    current = allCategories.find((c) => c.id === parentId);
  }
  return false;
};

export const getParentOptions = (categories: Category[], editingId: number | null): Category[] =>
  categories
    .filter((category) => {
      if (editingId === null) return true;
      if (category.id === editingId) return false;
      return !isDescendant(category.id, editingId, categories);
    })
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));

/**
 * Get hierarchical parent options with proper indentation for dropdown display
 * Returns an array of { category, level, hasChildren } objects
 */
export type HierarchicalCategoryOption = {
  category: Category;
  level: number;
  hasChildren: boolean;
};

export const getHierarchicalParentOptions = (
  categories: Category[],
  editingId: number | null
): HierarchicalCategoryOption[] => {
  // Filter out invalid options (self and descendants if editing)
  const validCategories = categories.filter((category) => {
    if (editingId === null) return true;
    if (category.id === editingId) return false;
    return !isDescendant(category.id, editingId, categories);
  });

  // Build children map
  const childrenMap = new Map<number, Category[]>();
  validCategories.forEach((cat) => {
    if (cat.parent_id !== null) {
      const children = childrenMap.get(cat.parent_id) || [];
      children.push(cat);
      childrenMap.set(cat.parent_id, children);
    }
  });

  // Get parent categories (no parent_id)
  const parents = validCategories
    .filter((cat) => cat.parent_id === null)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Build hierarchical list recursively
  const result: HierarchicalCategoryOption[] = [];

  const addCategoryWithChildren = (cat: Category, level: number) => {
    const children = childrenMap.get(cat.id) || [];
    const hasChildren = children.length > 0;

    result.push({ category: cat, level, hasChildren });

    // Add children recursively, sorted by name
    children.sort((a, b) => a.name.localeCompare(b.name)).forEach((child) => {
      addCategoryWithChildren(child, level + 1);
    });
  };

  // Add all parent categories and their children
  parents.forEach((parent) => {
    addCategoryWithChildren(parent, 0);
  });

  return result;
};

export const getParents = (categories: Category[]): Category[] =>
  categories
    .filter((category) => category.parent_id === null)
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));

export const getChildrenByParent = (categories: Category[]): Map<number, Category[]> => {
  const map = new Map<number, Category[]>();
  categories
    .filter((category) => category.parent_id !== null)
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((child) => {
      const parentId = child.parent_id as number;
      const list = map.get(parentId) ?? [];
      list.push(child);
      map.set(parentId, list);
    });
  return map;
};

export const getOrphanChildren = (categories: Category[]): Category[] => {
  const allCategoryIds = new Set(categories.map((c) => c.id));
  return categories
    .filter((category) => category.parent_id !== null && !allCategoryIds.has(category.parent_id))
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const getParentNameMap = (categories: Category[]): Map<number, string> =>
  new Map(categories.map((category) => [category.id, category.name]));

export const getAllDescendants = (categoryId: number, categories: Category[]): number[] => {
  const descendants: number[] = [];
  const queue = [categoryId];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const children = categories.filter((c) => c.parent_id === current);
    children.forEach((child) => {
      descendants.push(child.id);
      queue.push(child.id);
    });
  }

  return descendants;
};
