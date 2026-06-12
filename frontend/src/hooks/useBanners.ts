import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { createQuerySignal } from "../lib/fetchers";
import { queryKeys } from "../lib/queryKeys";
import { resolvePublicAssetUrl } from "../lib/publicAssetUrl";

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  title_image_url: string | null;
  link_url: string | null;
  banner_type:
    | "hero"
    | "portrait-hero"
    | "stage"
    | "promo"
    | "events"
    | "shop"
    | "process"
    | "spark-map"
    | "spark-club";
  display_order: number;
  is_active: boolean;
}

async function fetchBanners(
  type?:
    | "hero"
    | "portrait-hero"
    | "stage"
    | "promo"
    | "events"
    | "shop"
    | "process"
    | "spark-map"
    | "spark-club",
  signal?: AbortSignal,
): Promise<Banner[]> {
  let query = supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (type) {
    query = query.eq("banner_type", type);
  }

  const { data, error } = signal
    ? await query.abortSignal(signal)
    : await query;

  if (error) throw error;
  return (data || []).map((banner) => ({
    ...banner,
    image_url: resolvePublicAssetUrl(banner.image_url) ?? banner.image_url,
    title_image_url: resolvePublicAssetUrl(banner.title_image_url),
  }));
}

export function useBanners(
  type?:
    | "hero"
    | "portrait-hero"
    | "stage"
    | "promo"
    | "events"
    | "shop"
    | "process"
    | "spark-map"
    | "spark-club",
) {
  return useQuery({
    queryKey: queryKeys.banners(type),
    queryFn: async ({ signal }) => {
      const {
        signal: timeoutSignal,
        cleanup,
        didTimeout,
      } = createQuerySignal(signal);
      try {
        return await fetchBanners(type, timeoutSignal);
      } catch (error) {
        if (didTimeout()) {
          throw new Error("Request timeout");
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
