import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import type { ProductRetail } from "../types";

async function fetchProductRetailSummaries(
  signal?: AbortSignal,
): Promise<ProductRetail[]> {
  const query = supabase
    .from("product_retail")
    .select(
      `
      id,
      name,
      slug,
      description,
      category_id,
      price,
      stock,
      weight,
      length,
      width,
      height,
      image,
      is_active,
      created_at,
      updated_at,
      retail_category,
      retail_category_id,
      retail_subcategory_id,
      variant,
      categories(id, name, slug, is_active),
      retail_categories!retail_category_id(id, department, name, slug)
    `,
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (signal) {
    query.abortSignal(signal);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  // Supabase mengembalikan relasi JOIN sebagai array; normalise ke objek tunggal | null
  return (data ?? []).map((row) => {
    const cat = Array.isArray(row.categories)
      ? (row.categories[0] ?? null)
      : (row.categories ?? null);
    const rCat = Array.isArray(row.retail_categories)
      ? (row.retail_categories[0] ?? null)
      : (row.retail_categories ?? null);

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      category_id: row.category_id ?? null,
      price: Number(row.price ?? 0),
      stock: Number(row.stock ?? 0),
      weight: Number(row.weight ?? 0),
      length: row.length ?? null,
      width: row.width ?? null,
      height: row.height ?? null,
      image: row.image ?? null,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      retail_category: row.retail_category as
        | "glam"
        | "charmbar"
        | "sparkclub"
        | null,
      retail_category_id: (row as any).retail_category_id ?? null,
      categories: cat
        ? {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            is_active: Boolean(cat.is_active),
          }
        : null,
      retail_subcategory_id: row.retail_subcategory_id ?? null,
      variant: (row as any).variant ?? null,
      retail_categories: rCat
        ? {
            id: rCat.id,
            department: rCat.department,
            name: rCat.name,
            slug: rCat.slug,
          }
        : null,
    } satisfies ProductRetail;
  });
}

export function useProductRetailSummaries() {
  return useQuery({
    queryKey: queryKeys.productRetailSummaries(),
    queryFn: ({ signal }) => fetchProductRetailSummaries(signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export async function fetchProductRetailDetail(
  id: number,
  signal?: AbortSignal,
): Promise<ProductRetail> {
  const query = supabase
    .from("product_retail")
    .select(
      `
      id,
      name,
      slug,
      description,
      category_id,
      price,
      stock,
      weight,
      length,
      width,
      height,
      image,
      is_active,
      created_at,
      updated_at,
      retail_category,
      retail_category_id,
      retail_subcategory_id,
      variant,
      categories(id, name, slug, is_active),
      retail_categories!retail_category_id(id, department, name, slug),
      product_retail_images(image_url, is_primary, display_order)
    `,
    )
    .eq("id", id);

  if (signal) {
    query.abortSignal(signal);
  }

  const { data: row, error } = await query.single();

  if (error || !row) throw new Error(error?.message || "Product not found");

  const cat = Array.isArray(row.categories)
    ? (row.categories[0] ?? null)
    : (row.categories ?? null);
  const rCat = Array.isArray(row.retail_categories)
    ? (row.retail_categories[0] ?? null)
    : (row.retail_categories ?? null);

  // Mapping product_retail_images to imageUrls
  const productImages = ((row as any).product_retail_images || []) as {
    image_url: string;
    is_primary: boolean;
    display_order: number;
  }[];
  const sortedImages = productImages.slice().sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.display_order - b.display_order;
  });
  const imageUrls = sortedImages.map((img) => img.image_url).filter(Boolean);

  if (row.image && !imageUrls.includes(row.image)) {
    imageUrls.unshift(row.image);
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    category_id: row.category_id ?? null,
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    weight: Number(row.weight ?? 0),
    length: row.length ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    image: row.image ?? null,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    retail_category: row.retail_category as
      | "glam"
      | "charmbar"
      | "sparkclub"
      | null,
    retail_category_id: (row as any).retail_category_id ?? null,
    categories: cat
      ? {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          is_active: Boolean(cat.is_active),
        }
      : null,
    retail_subcategory_id: row.retail_subcategory_id ?? null,
    variant: (row as any).variant ?? null,
    retail_categories: rCat
      ? {
          id: rCat.id,
          department: rCat.department,
          name: rCat.name,
          slug: rCat.slug,
        }
      : null,
    imageUrls,
    product_retail_images: productImages,
  } satisfies ProductRetail;
}

export function useProductRetailDetail(id: string | undefined) {
  const numericId = Number(id);
  const enabled = Number.isFinite(numericId);

  return useQuery({
    queryKey: enabled
      ? ["productRetail", numericId]
      : ["productRetail", "invalid"],
    enabled,
    queryFn: ({ signal }) => fetchProductRetailDetail(numericId, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
