import type { HierarchicalCategoryOption } from '../category-manager/categoryManagerHelpers';
import type { CategoryOption } from './productFormModalTypes';

/**
 * Convert CategoryOption array to hierarchical structure for dropdown
 */
export function getHierarchicalCategoryOptions(
  categories: CategoryOption[]
): HierarchicalCategoryOption[] {
  // Build children map
  const childrenMap = new Map<number, CategoryOption[]>();
  categories.forEach((cat) => {
    if (cat.parent_id !== null && cat.parent_id !== undefined) {
      const children = childrenMap.get(cat.parent_id) || [];
      children.push(cat);
      childrenMap.set(cat.parent_id, children);
    }
  });

  // Get parent categories (no parent_id)
  const parents = categories
    .filter((cat) => !cat.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Build hierarchical list recursively
  const result: HierarchicalCategoryOption[] = [];

  const addCategoryWithChildren = (cat: CategoryOption, level: number) => {
    const children = childrenMap.get(cat.id) || [];
    const hasChildren = children.length > 0;

    result.push({
      category: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        is_active: cat.is_active ?? true,
        parent_id: cat.parent_id ?? null,
      },
      level,
      hasChildren,
    });

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
}
