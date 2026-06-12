import { useCmsSingletonSettings } from './useCmsSingletonSettings';
import { normalizeSectionFontMap, type SectionFontConfig } from '../lib/cmsTypography';
import { resolvePublicAssetUrl } from '../lib/publicAssetUrl';

const GLAM_ASSET_BASE = '/images/glam%20page%20assets';

export interface GlamSectionFonts {
  hero: SectionFontConfig;
  look: SectionFontConfig;
  products: SectionFontConfig;
}

export interface GlamPageSettings {
  id: string;
  hero_title: string;
  hero_description: string;
  hero_image_url: string;
  look_heading: string;
  look_model_image_url: string;
  look_star_links: GlamStarLink[];
  product_section_title: string;
  product_search_placeholder: string;
  section_fonts: GlamSectionFonts;
  product_categories: string[];
}

export interface GlamStarLink {
  slot: string;
  product_id: number | null;
  image_url: string | null;
}

export const DEFAULT_GLAM_PAGE_SETTINGS: GlamPageSettings = {
  id: 'default-glam-page-settings',
  hero_title: 'Glam Makeup',
  hero_description:
    'Craft a luminous signature look with Spark\'s curated glam direction, polished textures, and camera-ready finishing touches for every close-up.',
  hero_image_url: `${GLAM_ASSET_BASE}/VISUAL%201.png`,
  look_heading: 'Get The Look',
  look_model_image_url: `${GLAM_ASSET_BASE}/ChatGPT_Image_10_Mar_2026__21.13.39-removebg-preview.png`,
  look_star_links: [
    { slot: 'pink-rush', product_id: null, image_url: null },
    { slot: 'silver-blink', product_id: null, image_url: null },
    { slot: 'bronze', product_id: null, image_url: null },
    { slot: 'aura-pop', product_id: null, image_url: null },
  ],
  product_section_title: 'Charm Bar',
  product_search_placeholder: 'Search products...',
  section_fonts: {
    hero: { heading: 'great_vibes', body: 'nunito_sans' },
    look: { heading: 'great_vibes', body: 'nunito_sans' },
    products: { heading: 'cardo', body: 'nunito_sans' },
  },
  product_categories: [
    'makeup',
    'eyewear',
    'glitter',
    'headliner',
    'popsocket',
    'pop-socket',
    'popsockets',
    'body-glitter',
    'patches',
    'patch',
    'speckles',
    'freckles',
  ],
};

function normalizeStarLinks(value: unknown): GlamStarLink[] {
  if (!Array.isArray(value)) return DEFAULT_GLAM_PAGE_SETTINGS.look_star_links;

  const parsed = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const slot = typeof record.slot === 'string' ? record.slot : null;
      const productId =
        typeof record.product_id === 'number'
          ? record.product_id
          : typeof record.product_id === 'string' && record.product_id.trim() !== ''
            ? Number(record.product_id)
            : null;
      const imageUrl = typeof record.image_url === 'string' && record.image_url.trim() !== '' ? record.image_url : null;

      if (!slot) return null;
      return {
        slot,
        product_id: Number.isFinite(productId) ? Number(productId) : null,
        image_url: imageUrl,
      };
    })
    .filter((entry): entry is GlamStarLink => entry !== null);

  if (parsed.length === 0) return DEFAULT_GLAM_PAGE_SETTINGS.look_star_links;
  return parsed;
}

export function useGlamPageSettings() {
  return useCmsSingletonSettings<GlamPageSettings>({
    table: 'glam_page_settings',
    defaultId: DEFAULT_GLAM_PAGE_SETTINGS.id,
    normalize: (data) => ({
      id: typeof data.id === 'string' ? data.id : DEFAULT_GLAM_PAGE_SETTINGS.id,
      hero_title:
        typeof data.hero_title === 'string' && data.hero_title.trim() !== ''
          ? data.hero_title
          : DEFAULT_GLAM_PAGE_SETTINGS.hero_title,
      hero_description:
        typeof data.hero_description === 'string' && data.hero_description.trim() !== ''
          ? data.hero_description
          : DEFAULT_GLAM_PAGE_SETTINGS.hero_description,
      hero_image_url:
        typeof data.hero_image_url === 'string' && data.hero_image_url.trim() !== ''
          ? (resolvePublicAssetUrl(data.hero_image_url) ?? DEFAULT_GLAM_PAGE_SETTINGS.hero_image_url)
          : DEFAULT_GLAM_PAGE_SETTINGS.hero_image_url,
      look_heading:
        typeof data.look_heading === 'string' && data.look_heading.trim() !== ''
          ? data.look_heading
          : DEFAULT_GLAM_PAGE_SETTINGS.look_heading,
      look_model_image_url:
        typeof data.look_model_image_url === 'string' && data.look_model_image_url.trim() !== ''
          ? (resolvePublicAssetUrl(data.look_model_image_url) ?? DEFAULT_GLAM_PAGE_SETTINGS.look_model_image_url)
          : DEFAULT_GLAM_PAGE_SETTINGS.look_model_image_url,
      look_star_links: normalizeStarLinks(data.look_star_links).map((link) => ({
        ...link,
        image_url: resolvePublicAssetUrl(link.image_url),
      })),
      product_section_title:
        typeof data.product_section_title === 'string' && data.product_section_title.trim() !== ''
          ? data.product_section_title
          : DEFAULT_GLAM_PAGE_SETTINGS.product_section_title,
      product_search_placeholder:
        typeof data.product_search_placeholder === 'string' && data.product_search_placeholder.trim() !== ''
          ? data.product_search_placeholder
          : DEFAULT_GLAM_PAGE_SETTINGS.product_search_placeholder,
      section_fonts: normalizeSectionFontMap(data.section_fonts, DEFAULT_GLAM_PAGE_SETTINGS.section_fonts),
      product_categories: Array.isArray(data.product_categories)
        ? data.product_categories.filter((c): c is string => typeof c === 'string')
        : DEFAULT_GLAM_PAGE_SETTINGS.product_categories,
    }),
    errorLabel: 'glam page settings',
  });
}
