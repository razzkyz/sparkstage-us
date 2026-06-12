import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { mapSearchQueryToRoute } from "../lib/searchRouteMap";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import ProductQuickViewModal from "../components/ProductQuickViewModal";
import {
  DEFAULT_GLAM_PAGE_SETTINGS,
  useGlamPageSettings,
} from "../hooks/useGlamPageSettings";
import { useProductSummaries } from "../hooks/useProducts";
import { formatCurrency } from "../utils/formatters";
import { getCmsFontStyle } from "../lib/cmsTypography";
import { AppLoadingScreen } from "../app/AppLoadingScreen";
import { buildImageKitThumbUrl } from "../lib/imagekit";
import { useCart } from "../contexts/cartStore";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import useSeo from "../hooks/useSeo";
import type { Product } from "../hooks/useProducts";

const GLAM_ASSET_BASE = "/images/glam%20page%20assets";
const STAR_ASSET_BASE = `${GLAM_ASSET_BASE}/STAR%20GLITTER%20TRANSPARENT%20BG`;

const decorativeStars = [
  {
    slot: "pink-rush",
    src: `${STAR_ASSET_BASE}/PINK%20RUSH.png`,
    alt: "Pink glitter star",
    className:
      "left-[2%] top-[5.5rem] w-24 sm:w-28 lg:left-[4%] lg:top-20 lg:w-32",
  },
  {
    slot: "silver-blink",
    src: `${STAR_ASSET_BASE}/SILVER%20BLINK.png`,
    alt: "Silver glitter star",
    className:
      "left-[4%] bottom-6 w-28 sm:w-32 lg:left-[1%] lg:bottom-2 lg:w-36",
  },
  {
    slot: "bronze",
    src: `${STAR_ASSET_BASE}/BRONZE.png`,
    alt: "Bronze glitter star",
    className: "left-[30%] bottom-0 w-20 sm:w-24 lg:left-[28%] lg:w-28",
  },
  {
    slot: "aura-pop",
    src: `${STAR_ASSET_BASE}/AURA%20POP.png`,
    alt: "Sparkly mini star",
    className: "left-[14%] top-[44%] w-12 sm:w-16 lg:w-20",
  },
];

type QuickViewState = {
  open: boolean;
  productId: number | null;
};

export default function BeautyPage() {
  useSeo({
    title: "Glam Room · Stage 55",
    description: "Explore Glam Room curated makeup and accessories.",
    canonical: `${window.location.origin}/glam`,
  });
  const { settings, error: settingsError } = useGlamPageSettings();
  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
  } = useProductSummaries();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [quickView, setQuickView] = useState<QuickViewState>({
    open: false,
    productId: null,
  });
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleAddToCart = (product: Product) => {
    if (!user) {
      showToast("error", "Please login to add items to cart");
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }
    if (!product.defaultVariantId || !product.defaultVariantName) return;

    try {
      addItem(
        {
          productId: product.id,
          productName: product.name,
          productImageUrl: product.image,
          variantId: product.defaultVariantId,
          variantName: product.defaultVariantName,
          unitPrice: product.price,
        },
        1,
      );
      showToast("success", "Berhasil memasukkan ke keranjang");
    } catch {
      showToast("error", "Gagal menambahkan ke keranjang");
    }
  };

  useEffect(() => {
    setPage(1);
  }, [deferredSearchQuery]);

  const content = settings ?? DEFAULT_GLAM_PAGE_SETTINGS;
  const heroFonts = content.section_fonts.hero;
  const lookFonts = content.section_fonts.look;
  const productFonts = content.section_fonts.products;
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
  const starLinkMap = useMemo(
    () => new Map(content.look_star_links.map((link) => [link.slot, link])),
    [content.look_star_links],
  );
  const productLookup = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const BASE_MAKEUP_SLUGS = [
    "makeup",
    "eyewear",
    "glitter",
    "headliner",
    "popsocket",
    "pop-socket",
    "popsockets",
    "body-glitter",
  ];

  const makeupProducts = useMemo(() => {
    const slugs = new Set([
      ...BASE_MAKEUP_SLUGS,
      ...(content.product_categories || []),
    ]);
    return products.filter(
      (p) =>
        (p.categorySlug != null && slugs.has(p.categorySlug)) ||
        p.name.toLowerCase().includes("speckles") ||
        p.name.toLowerCase().includes("patch"),
    );
  }, [products, content.product_categories]);

  const filteredProducts = useMemo(() => {
    const matches = makeupProducts.filter((product) => {
      if (!normalizedQuery) return true;
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery)
      );
    });

    // Sort to put Speckles/Patch products first so they appear together side-by-side
    return matches.sort((a, b) => {
      const aIsSpeckles =
        a.name.toLowerCase().includes("speckles") ||
        a.name.toLowerCase().includes("patch");
      const bIsSpeckles =
        b.name.toLowerCase().includes("speckles") ||
        b.name.toLowerCase().includes("patch");
      if (aIsSpeckles && !bIsSpeckles) return -1;
      if (!aIsSpeckles && bIsSpeckles) return 1;
      return 0;
    });
  }, [normalizedQuery, makeupProducts]);

  const PAGE_SIZE = 8;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const hasProductsError = productsError instanceof Error;
  const hasSettingsError = settingsError instanceof Error;

  if (productsLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <PageTransition>
      <main className="min-h-[calc(100vh-64px)] bg-white text-black py-5">
        {/* ── Shop Section Navigator ──────────────────────────── */}
        <div className="flex gap-3 sm:gap-4 justify-center flex-nowrap w-full px-2 sm:px-0 pb-2 -mb-2">
          {/* Glam — current page (active) */}
          <Link
            to="/beauty"
            className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-[#ff4b86] bg-[#ff4b86] text-white text-[11px] sm:text-sm font-bold uppercase tracking-wider shadow-sm"
          >
            <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
              face_retouching_natural
            </span>
            Glam
          </Link>

          {/* Charm Bar */}
          <Link
            to="/charm-bar"
            className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-gray-200 text-gray-600 text-[11px] sm:text-sm font-bold uppercase tracking-wider hover:border-[#ff4b86] hover:text-[#ff4b86] hover:shadow-md transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
              diamond
            </span>
            Charm
          </Link>

          {/* Spark Club */}
          <Link
            to="/shop"
            className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-gray-200 text-gray-600 text-[11px] sm:text-sm font-bold uppercase tracking-wider hover:border-[#ff4b86] hover:text-[#ff4b86] hover:shadow-md transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
              shopping_bag
            </span>
            Spark
          </Link>
        </div>
        <section className="">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 sm:gap-8 sm:px-8 sm:py-12 md:flex-row md:justify-center md:gap-10 lg:gap-20 lg:px-12 lg:py-16">
            {/* Title for Mobile (Hidden on md and up) */}
            <h1
              className="text-center text-5xl leading-none sm:text-6xl md:hidden w-full"
              style={getCmsFontStyle(heroFonts.heading)}
            >
              {content.hero_title}
            </h1>

            {/* Image */}
            <div className="aspect-[4/5] w-full max-w-[280px] sm:max-w-[320px] md:w-[280px] md:max-w-none lg:w-[340px] xl:w-[380px] shrink-0 overflow-hidden rounded-xl bg-[#f5f1f0]">
              <img
                src={content.hero_image_url}
                alt={content.hero_title}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Title & Paragraph Container */}
            <div className="flex w-full flex-col items-center text-center md:items-end md:text-right md:max-w-md lg:max-w-lg xl:max-w-xl">
              {/* Title for Tablet/Desktop (Hidden on mobile) */}
              <h1
                className="hidden md:block md:text-5xl lg:text-7xl xl:text-[5rem] leading-none"
                style={getCmsFontStyle(heroFonts.heading)}
              >
                {content.hero_title}
              </h1>
              <p
                className="mt-4 max-w-md text-[13px] leading-relaxed text-black/85 sm:text-base md:mt-5 md:max-w-full md:text-sm lg:mt-6 lg:text-lg xl:text-xl"
                style={getCmsFontStyle(heroFonts.body)}
              >
                {content.hero_description}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          <h2
            className="text-center text-4xl leading-none sm:text-6xl"
            style={getCmsFontStyle(lookFonts.heading)}
          >
            {content.look_heading}
          </h2>

          <div className="mt-8 grid grid-cols-[1fr_1fr] items-stretch gap-4 border-b border-black/20 pb-8 sm:gap-6 lg:gap-8">
            {/* Left: 2x2 star product grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {decorativeStars.map((star) => {
                const starLink = starLinkMap.get(star.slot) ?? null;
                const productId = starLink?.product_id ?? null;
                const linkedProduct = productId
                  ? (productLookup.get(productId) ?? null)
                  : null;
                const starImage = (
                  <img
                    src={starLink?.image_url ?? star.src}
                    alt={star.alt}
                    className="h-full w-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.12)] transition-transform duration-200"
                  />
                );

                if (!productId) {
                  return (
                    <div
                      key={star.slot}
                      className="flex aspect-square items-center justify-center p-4"
                    >
                      {starImage}
                    </div>
                  );
                }

                return (
                  <button
                    key={star.slot}
                    type="button"
                    title={
                      linkedProduct
                        ? `Open ${linkedProduct.name}`
                        : "Open linked product"
                    }
                    aria-label={
                      linkedProduct
                        ? `Open ${linkedProduct.name}`
                        : "Open linked product"
                    }
                    onClick={() => setQuickView({ open: true, productId })}
                    className="flex aspect-square cursor-pointer items-center justify-center p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b86] focus-visible:ring-offset-2"
                  >
                    <span className="block h-full w-full transition-transform duration-200 hover:scale-[1.06] active:scale-[0.98]">
                      {starImage}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: large model photo */}
            <div className="flex items-end justify-center overflow-hidden rounded-lg">
              <img
                src={content.look_model_image_url}
                alt="GLAM editorial model"
                className="h-full max-h-[600px] w-full object-cover object-top"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-5 sm:px-8 lg:px-12">
          <div className="flex flex-col items-center gap-4">
            <h3
              className="text-3xl italic tracking-wide"
              style={getCmsFontStyle(productFonts.heading)}
            >
              {content.product_section_title}
            </h3>

            <label className="relative w-full max-w-[400px]">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const mapped = mapSearchQueryToRoute(searchQuery || "");
                    if (mapped) {
                      (e.currentTarget as HTMLInputElement).blur();
                      navigate(mapped);
                    }
                  }
                }}
                placeholder={content.product_search_placeholder}
                className="w-full rounded-full border border-black/30 bg-white py-3.5 pl-12 pr-6 text-sm outline-none transition-colors focus:border-black"
              />
            </label>
          </div>

          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mx-auto">
            {paginatedProducts.map((product) => (
              <Link
                key={product.id}
                to={`/shop/product/${product.id}`}
                className="group cursor-pointer flex flex-col h-full rounded-2xl bg-white overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_35px_-10px_rgba(255,75,134,0.25)] border border-gray-100 hover:border-pink-200"
              >
                <div className="relative overflow-hidden  bg-[#faf9f9] shrink-0">
                  {product.image ? (
                    <>
                      <img
                        src={buildImageKitThumbUrl(product.image, {
                          width: 480,
                          quality: 75,
                        })}
                        alt={product.name}
                        className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-pink-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <span className="material-symbols-outlined text-5xl">
                        {product.placeholder}
                      </span>
                    </div>
                  )}
                  {!product.defaultVariantId && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                      <span className="text-[#ff4b86] text-xs font-bold uppercase tracking-[0.2em] px-4 py-2 bg-white/90 rounded-full shadow-sm">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    disabled={!product.defaultVariantId}
                    className="absolute bottom-4 right-4 flex items-center justify-center w-10 h-10 bg-[#ff4b86] shadow-[0_4px_12px_rgba(255,75,134,0.3)] text-white rounded-full opacity-0 translate-y-4 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:opacity-100 group-hover:translate-y-0 hover:bg-[#e63d75] hover:scale-110 hover:shadow-pink-500/40 disabled:opacity-0 disabled:cursor-not-allowed z-20"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      add_shopping_cart
                    </span>
                  </button>
                  {product.badge && (
                    <span className="absolute top-4 left-4 bg-[#ff4b86] text-white px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-bold rounded-full shadow-md z-20">
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-grow bg-white z-10 relative">
                  <h3
                    className="font-bold text-[14px] text-gray-900 mb-1 line-clamp-1 transition-colors duration-300 group-hover:text-[#ff4b86]"
                    style={getCmsFontStyle(productFonts.body)}
                  >
                    {product.name}
                  </h3>
                  <p
                    className="text-[12px] text-gray-400 mb-3 line-clamp-2 leading-relaxed min-h-[2.25rem]"
                    style={getCmsFontStyle(productFonts.body)}
                  >
                    {product.description || "\u00A0"}
                  </p>
                  <div className="flex items-end gap-2 mt-auto">
                    <span
                      className="text-[15px] font-black tracking-tight text-[#ff4b86]"
                      style={getCmsFontStyle(productFonts.body)}
                    >
                      {formatCurrency(product.price)}
                    </span>
                    {product.originalPrice ? (
                      <span
                        className="text-[11px] text-gray-400 line-through font-medium mb-[2px]"
                        style={getCmsFontStyle(productFonts.body)}
                      >
                        {formatCurrency(product.originalPrice)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex justify-center items-center gap-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-black/20 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className="text-xs font-medium text-black/50 tracking-wide"
              style={getCmsFontStyle(productFonts.body)}
            >
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 border border-black/20 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!productsLoading && filteredProducts.length === 0 ? (
            <div
              className="mt-10 border border-dashed border-black/20 px-6 py-12 text-center text-black/55"
              style={getCmsFontStyle(productFonts.body)}
            >
              No products match your search yet.
            </div>
          ) : null}

          {productsLoading ? (
            <div
              className="mt-10 text-center text-sm text-black/45"
              style={getCmsFontStyle(productFonts.body)}
            >
              Loading products...
            </div>
          ) : null}

          {hasProductsError ? (
            <div
              className="mt-8 text-center text-sm text-red-600"
              style={getCmsFontStyle(productFonts.body)}
            >
              Product catalog failed to load. The page content is still
              available.
            </div>
          ) : null}

          {hasSettingsError ? (
            <div
              className="mt-3 text-center text-xs uppercase tracking-[0.2em] text-black/40"
              style={getCmsFontStyle(productFonts.body)}
            >
              Using default GLAM content while saved settings are unavailable.
            </div>
          ) : null}
        </section>

        <ProductQuickViewModal
          open={quickView.open}
          productId={quickView.productId}
          onClose={() => setQuickView({ open: false, productId: null })}
        />
      </main>
    </PageTransition>
  );
}
