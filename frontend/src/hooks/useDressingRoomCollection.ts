import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { resolvePublicAssetUrl } from '../lib/publicAssetUrl';

export interface DressingRoomLookItem {
    id: number;
    look_id: number;
    product_variant_id: number;
    label: string | null;
    sort_order: number;
    product_variant: {
        id: number;
        name: string;
        sku: string;
        price: number | null;
        deposit_amount: number | null;
        product: {
            id: number;
            name: string;
            slug: string;
            image_url: string | null;
        };
    } | null;
    resolved_image_url: string | null;
}

export interface DressingRoomLook {
    id: number;
    collection_id: number;
    look_number: number;
    model_image_url: string;
    model_name: string | null;
    sort_order: number;
    items: DressingRoomLookItem[];
}

export interface DressingRoomCollection {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    is_active: boolean;
    sort_order: number;
}

async function fetchDressingRoomCollection(slug?: string) {
    // Fetch collection — either by slug or the first active one
    let collectionQuery = supabase
        .from('dressing_room_collections')
        .select('*')
        .eq('is_active', true);

    if (slug) {
        collectionQuery = collectionQuery.eq('slug', slug);
    } else {
        collectionQuery = collectionQuery.order('sort_order', { ascending: true }).limit(1);
    }

    const { data: collections, error: collectionError } = await collectionQuery;

    if (collectionError) throw collectionError;
    if (!collections || collections.length === 0) return { collection: null, looks: [] };

    const collection = collections[0] as DressingRoomCollection;

    // Fetch looks for this collection
    const { data: looks, error: looksError } = await supabase
        .from('dressing_room_looks')
        .select('*')
        .eq('collection_id', collection.id)
        .order('sort_order', { ascending: true });

    if (looksError) throw looksError;

    if (!looks || looks.length === 0) {
        return { collection, looks: [] };
    }

    // Fetch look items without nested joins to avoid PostgREST 400 error
    const lookIds = looks.map((l) => l.id);
    const { data: items, error: itemsError } = await supabase
        .from('dressing_room_look_items')
        .select(`
      id,
      look_id,
      product_variant_id,
      label,
      sort_order
    `)
        .in('look_id', lookIds)
        .order('sort_order', { ascending: true });

    if (itemsError) throw itemsError;

    // Collect all product variant IDs to fetch variants and products separately
    const variantIds = new Set<number>();
    if (items) {
        for (const item of items) {
            if (item.product_variant_id) {
                variantIds.add(item.product_variant_id);
            }
        }
    }

    // Fetch product variants with products separately
    const variantMap = new Map<number, {
        id: number;
        name: string;
        sku: string;
        price: number | null;
        deposit_amount: number | null;
        products: {
            id: number;
            name: string;
            slug: string;
            image_url: string | null;
        }[];
    }>();
    if (variantIds.size > 0) {
        const { data: variants } = await supabase
            .from('product_variants')
            .select(`
          id,
          name,
          sku,
          price,
          deposit_amount,
          products (
            id,
            name,
            slug,
            image_url
          )
        `)
            .in('id', Array.from(variantIds));

        if (variants) {
            for (const variant of variants) {
                variantMap.set(variant.id, variant);
            }
        }
    }

    // Collect all product IDs to fetch primary images from product_images table
    const allProductIds = new Set<number>();
    variantMap.forEach((variant) => {
        if (variant.products && variant.products.length > 0) {
            allProductIds.add(variant.products[0].id);
        }
    });

    // Fetch primary images for all products in one query
    const productImageMap = new Map<number, string>();
    if (allProductIds.size > 0) {
        const { data: imgData } = await supabase
            .from('product_images')
            .select('product_id, image_url')
            .in('product_id', Array.from(allProductIds))
            .eq('is_primary', true)
            .limit(allProductIds.size);
        if (imgData) {
            for (const img of imgData) {
                productImageMap.set(img.product_id as number, img.image_url as string);
            }
        }
    }

    // Build look items map
    const itemsByLook = new Map<number, DressingRoomLookItem[]>();

    if (items) {
        for (const item of items) {
            const lookItems = itemsByLook.get(item.look_id) || [];
            const variant = variantMap.get(item.product_variant_id);
            const product = variant?.products && variant.products.length > 0 ? variant.products[0] : null;
            const productId = product?.id;
            const productImageUrl = resolvePublicAssetUrl(product?.image_url);
            const primaryImage = productId ? productImageMap.get(productId) : null;

            lookItems.push({
                id: item.id,
                look_id: item.look_id,
                product_variant_id: item.product_variant_id,
                label: item.label,
                sort_order: item.sort_order,
                resolved_image_url: primaryImage || productImageUrl || null,
                product_variant: variant ? {
                    id: variant.id,
                    name: variant.name,
                    sku: variant.sku,
                    price: variant.price,
                    deposit_amount: variant.deposit_amount,
                    product: product ? {
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        image_url: resolvePublicAssetUrl(product.image_url),
                    } : null as never,
                } : null,
            });
            itemsByLook.set(item.look_id, lookItems);
        }
    }

    const dressingRoomLooks: DressingRoomLook[] = looks.map((look) => ({
        id: look.id,
        collection_id: look.collection_id,
        look_number: look.look_number,
        model_image_url: resolvePublicAssetUrl(look.model_image_url) ?? look.model_image_url,
        model_name: look.model_name,
        sort_order: look.sort_order,
        items: itemsByLook.get(look.id) || [],
    }));

    return {
        collection: {
            ...collection,
            cover_image_url: resolvePublicAssetUrl(collection.cover_image_url),
        },
        looks: dressingRoomLooks,
    };
}

export function useDressingRoomCollection(slug?: string) {
    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['dressing-room-collection', slug ?? '__default__'],
        queryFn: () => fetchDressingRoomCollection(slug),
        staleTime: 5 * 60 * 1000,
    });

    return {
        collection: data?.collection ?? null,
        looks: data?.looks ?? [],
        isLoading,
        error,
        refetch,
    };
}
