import type { InventoryListFilters, ProductRow } from './inventoryTypes';

// Category filter parameter kept for API compatibility but not used in current implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getInventorySelect = (_categoryFilter: string) => {
  return `
  id,
  name,
  slug,
  description,
  category_id,
  sku,
  is_active,
  deleted_at,
  product_variants(
    id,
    product_id,
    name,
    sku,
    price,
    stock,
    reserved_stock,
    attributes,
    is_active
  ),
  product_images(
    image_url,
    is_primary,
    display_order
  )
`;
};

export const normalizeSearchTerm = (searchQuery: string) =>
  searchQuery
    .trim()
    .replace(/[%_]/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ');

export const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const applyInventoryFilters = <T>(query: T, filters: InventoryListFilters): T => {
  let next = query as unknown as {
    or: (filters: string) => unknown;
    eq: (column: string, value: string) => unknown;
    is: (column: string, value: null) => unknown;
  };

  const normalizedSearch = normalizeSearchTerm(filters.searchQuery);
  if (normalizedSearch) {
    next = next.or(`name.ilike.%${normalizedSearch}%,sku.ilike.%${normalizedSearch}%`) as typeof next;
  }

  // Category filtering temporarily disabled since we removed categories from query
  // to avoid RLS issues. This will be fixed in a future update.
  const normalizedCategory = filters.categoryFilter.trim();
  if (normalizedCategory) {
    if (normalizedCategory === 'uncategorized') {
      next = next.is('category_id', null) as typeof next;
    }
    // Skip slug-based filtering since we don't join categories table anymore
  }

  return next as unknown as T;
};

export const orderProductsByIds = (products: ProductRow[], productIds: number[]) => {
  const orderMap = new Map<number, number>();
  productIds.forEach((productId, index) => {
    orderMap.set(productId, index);
  });

  return [...products].sort((a, b) => {
    const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return indexA - indexB;
  });
};
