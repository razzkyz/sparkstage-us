import { normalizeSectionFontMap, type SectionFontConfig } from '../lib/cmsTypography';
import { resolvePublicAssetString } from '../lib/publicAssetUrl';
import { useCmsSingletonSettings } from './useCmsSingletonSettings';

export interface NewsProduct {
  image: string;
  brand: string;
  name: string;
  price: string;
  link: string;
}

export type NewsExtraSectionType = 'article' | 'quote' | 'products';

export interface NewsExtraSection {
  id: string;
  type: NewsExtraSectionType;
  
  // Fields for 'article' & 'quote' & 'products' headers
  title: string;
  
  // Fields for 'article'
  category?: string;
  excerpt?: string;
  description?: string;
  author?: string;
  image?: string;
  
  // Fields for 'quote'
  subtitle1?: string;
  subtitle2?: string;
  quotes?: string;
  
  // Fields for 'products'
  products?: NewsProduct[];
}

export interface NewsPageSettings {
  id: string;
  section_1_category: string;
  section_1_title: string;
  section_1_excerpt: string;
  section_1_description: string;
  section_1_author: string;
  section_1_image: string;
  section_2_title: string;
  section_2_subtitle1: string;
  section_2_subtitle2: string;
  section_2_quotes: string;
  section_2_image: string;
  section_3_title: string;
  section_3_products: NewsProduct[];
  section_fonts: NewsSectionFonts;
  extra_sections: NewsExtraSection[];
  section_order: string[];
}

export interface NewsSectionFonts {
  section_1: SectionFontConfig;
  section_2: SectionFontConfig;
  section_3: SectionFontConfig;
}

export const DEFAULT_NEWS_PAGE_SETTINGS: NewsPageSettings = {
  id: 'default-news-page-settings',
  section_1_category: 'FASHION',
  section_1_title: 'HOW TO DRESS LIKE A STAR - GIRL?',
  section_1_excerpt: 'FROM FEATHER TOPS TO SAINT LAURENT HAND BAGS.',
  section_1_description:
    "They're the ysl girlies, with black nails and smokey eyes, glitter lovers. Usually spotted in Upper East Side leaving a party or listening to the weeknd. Learn everything about their lifestyle.",
  section_1_author: 'By Amélie Schiffer',
  section_1_image: '',
  section_2_title: 'SHE A COLD-HEARTED\nB!TCH WITH NO SHAME',
  section_2_subtitle1: 'Escape from LA',
  section_2_subtitle2: '(THE WEEKEND)',
  section_2_quotes: "SHE GOT\n*CHROME .. HEARTS*\nHANGIN' FROM HER NECK",
  section_2_image: '',
  section_3_title: 'HER ESSENTIALS !',
  section_3_products: [],
  section_fonts: {
    section_1: { heading: 'cardo', body: 'nunito_sans' },
    section_2: { heading: 'cardo', body: 'nunito_sans' },
    section_3: { heading: 'cardo', body: 'nunito_sans' },
  },
  extra_sections: [],
  section_order: ['section_1', 'section_2', 'section_3'],
};

function normalizeProducts(value: unknown): NewsProduct[] {
  if (!Array.isArray(value)) return DEFAULT_NEWS_PAGE_SETTINGS.section_3_products;

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      return {
        image: typeof record.image === 'string' ? resolvePublicAssetString(record.image) : '',
        brand: typeof record.brand === 'string' ? record.brand : '',
        name: typeof record.name === 'string' ? record.name : '',
        price: typeof record.price === 'string' ? record.price : '',
        link: typeof record.link === 'string' ? record.link : '',
      };
    })
    .filter((entry): entry is NewsProduct => entry !== null);
}

function normalizeExtraSections(value: unknown): NewsExtraSection[] {
  if (!Array.isArray(value)) return [];
  
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const record = entry as Record<string, unknown>;
    
    return {
      id: typeof record.id === 'string' ? record.id : Date.now().toString() + Math.random().toString(36).substring(7),
      type: (['article', 'quote', 'products'].includes(record.type as string) ? record.type : 'article') as NewsExtraSectionType,
      title: typeof record.title === 'string' ? record.title : '',
      
      category: typeof record.category === 'string' ? record.category : '',
      excerpt: typeof record.excerpt === 'string' ? record.excerpt : '',
      description: typeof record.description === 'string' ? record.description : '',
      author: typeof record.author === 'string' ? record.author : '',
      image: typeof record.image === 'string' ? resolvePublicAssetString(record.image) : '',
      
      subtitle1: typeof record.subtitle1 === 'string' ? record.subtitle1 : '',
      subtitle2: typeof record.subtitle2 === 'string' ? record.subtitle2 : '',
      quotes: typeof record.quotes === 'string' ? record.quotes : '',
      
      products: normalizeProducts(record.products || []),
    } as NewsExtraSection;
  }).filter((entry): entry is NewsExtraSection => entry !== null);
}

function normalizeSectionOrder(value: unknown, extraSections: NewsExtraSection[]): string[] {
  if (!Array.isArray(value)) return DEFAULT_NEWS_PAGE_SETTINGS.section_order;
  
  // ensure it contains section_1, section_2, section_3, and all extra section IDs exactly once
  const baseOrder = value.filter(v => typeof v === 'string') as string[];
  const requiredIds = new Set(['section_1', 'section_2', 'section_3', ...extraSections.map(s => s.id)]);
  
  const finalOrder: string[] = [];
  
  // Add items that are in baseOrder and also in requiredIds
  for (const item of baseOrder) {
    if (requiredIds.has(item) && !finalOrder.includes(item)) {
      finalOrder.push(item);
    }
  }
  
  // Add any missing items to the end
  for (const item of requiredIds) {
    if (!finalOrder.includes(item)) {
      finalOrder.push(item);
    }
  }
  
  return finalOrder;
}

function normalizeSettings(data: Record<string, unknown>): NewsPageSettings {
  const extraSections = normalizeExtraSections(data.extra_sections);
  return {
    id: typeof data.id === 'string' ? data.id : DEFAULT_NEWS_PAGE_SETTINGS.id,
    section_1_category:
      typeof data.section_1_category === 'string' && data.section_1_category.trim() !== ''
        ? data.section_1_category
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_category,
    section_1_title:
      typeof data.section_1_title === 'string' && data.section_1_title.trim() !== ''
        ? data.section_1_title
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_title,
    section_1_excerpt:
      typeof data.section_1_excerpt === 'string' && data.section_1_excerpt.trim() !== ''
        ? data.section_1_excerpt
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_excerpt,
    section_1_description:
      typeof data.section_1_description === 'string' && data.section_1_description.trim() !== ''
        ? data.section_1_description
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_description,
    section_1_author:
      typeof data.section_1_author === 'string' && data.section_1_author.trim() !== ''
        ? data.section_1_author
        : DEFAULT_NEWS_PAGE_SETTINGS.section_1_author,
    section_1_image: typeof data.section_1_image === 'string' ? resolvePublicAssetString(data.section_1_image) : DEFAULT_NEWS_PAGE_SETTINGS.section_1_image,
    section_2_title:
      typeof data.section_2_title === 'string' && data.section_2_title.trim() !== ''
        ? data.section_2_title
        : DEFAULT_NEWS_PAGE_SETTINGS.section_2_title,
    section_2_subtitle1:
      typeof data.section_2_subtitle1 === 'string' && data.section_2_subtitle1.trim() !== ''
        ? data.section_2_subtitle1
        : DEFAULT_NEWS_PAGE_SETTINGS.section_2_subtitle1,
    section_2_subtitle2:
      typeof data.section_2_subtitle2 === 'string' && data.section_2_subtitle2.trim() !== ''
        ? data.section_2_subtitle2
        : DEFAULT_NEWS_PAGE_SETTINGS.section_2_subtitle2,
    section_2_quotes:
      typeof data.section_2_quotes === 'string' && data.section_2_quotes.trim() !== ''
        ? data.section_2_quotes
        : DEFAULT_NEWS_PAGE_SETTINGS.section_2_quotes,
    section_2_image: typeof data.section_2_image === 'string' ? resolvePublicAssetString(data.section_2_image) : DEFAULT_NEWS_PAGE_SETTINGS.section_2_image,
    section_3_title:
      typeof data.section_3_title === 'string' && data.section_3_title.trim() !== ''
        ? data.section_3_title
        : DEFAULT_NEWS_PAGE_SETTINGS.section_3_title,
    section_3_products: normalizeProducts(data.section_3_products),
    section_fonts: normalizeSectionFontMap(data.section_fonts, DEFAULT_NEWS_PAGE_SETTINGS.section_fonts),
    extra_sections: extraSections,
    section_order: normalizeSectionOrder(data.section_order, extraSections),
  };
}

export function useNewsSettings() {
  return useCmsSingletonSettings<NewsPageSettings>({
    table: 'news_page_settings',
    defaultId: DEFAULT_NEWS_PAGE_SETTINGS.id,
    normalize: normalizeSettings,
    errorLabel: 'news page settings',
  });
}
