import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import gsap from "gsap";
import { useQueryClient } from "@tanstack/react-query";
import { useProductSummaries, type Product } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import { useCart } from "../contexts/cartStore";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import { PageTransition } from "../components/PageTransition";
import ProductCardSkeleton from "../components/skeletons/ProductCardSkeleton";
import { useShopFilters } from "./shop/useShopFilters";
import { queryKeys } from "../lib/queryKeys";
import { fetchProductDetail } from "../hooks/useProduct";
import { AppLoadingScreen } from "../app/AppLoadingScreen";
import { buildImageKitThumbUrl } from "../lib/imagekit";
import useSeo from "../hooks/useSeo";

const PRODUCTS_PER_PAGE = 20;

// Charm Bar specific categories (all top-level)
const CHARM_BAR_CATEGORIES = [
  { slug: "charm",           name: "Charm" },
  { slug: "holiday",         name: "Holiday" },
  { slug: "hobby",           name: "Hobby" },
  { slug: "italian-bracket", name: "Italian Bracket" },
  { slug: "pendant-charm",   name: "Pendant Charm" },
  { slug: "welded-charm",    name: "Welded Charm" },
  { slug: "edgy-soul",       name: "Edgy Soul" },
  { slug: "foodie",          name: "Foodie" },
  { slug: "island-vibes",    name: "Island Vibes" },
  { slug: "love",            name: "Love" },
  { slug: "pets",            name: "Pets" },
  { slug: "pop-icon",        name: "Pop Icon" },
  { slug: "sky-dream",       name: "Sky Dream" },
  { slug: "soft-muse",       name: "Soft Muse" },
  { slug: "the-icon",        name: "The Icon" },
  { slug: "zodiac",          name: "Zodiac" },
  { slug: "lucky",           name: "Lucky" },
  { slug: "lucky-charm",     name: "Lucky Charm" },
  { slug: "golden-charm-pendant",  name: "Golden Charm Pendant" },
  { slug: "golden-charm-welded",   name: "Golden Charm Welded" },
  { slug: "silver-charm-pendant",  name: "Silver Charm Pendant" },
  { slug: "silver-charm-welded",   name: "Silver Charm Welded" },
];

type ShopResultsProps = {
  filteredProducts: Product[];
  loading: boolean;
  onPrefetchProduct: (productId: number) => void;
  onAddToCart: (product: Product) => void;
};

function ShopResults({
  filteredProducts,
  loading,
  onPrefetchProduct,
  onAddToCart,
}: ShopResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalProducts = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, page]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          No products found in Charm Bar collection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {paginatedProducts.map((product) => (
          <div key={product.id} data-product-card>
            <Link
              to={`/shop/product/${product.id}`}
              className="group cursor-pointer"
              onMouseEnter={() => onPrefetchProduct(product.id)}
            >
              <div className="rounded-xl border-2 border-gray-100 bg-white overflow-hidden duration-300 ux-transition-color hover:border-[#ff4b86] hover:shadow-lg hover:shadow-pink-100">
                <div className="relative overflow-hidden aspect-square bg-gray-50">
                  {product.image ? (
                    <img
                      src={buildImageKitThumbUrl(product.image, {
                        width: 480,
                        quality: 60,
                      })}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                      <span className="material-symbols-outlined text-5xl">
                        {product.placeholder}
                      </span>
                    </div>
                  )}
                  {!product.defaultVariantId && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                      <span className="text-white text-xs font-bold uppercase tracking-widest px-3 py-1 border border-white/50 bg-black/20 backdrop-blur-sm">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddToCart(product);
                    }}
                    disabled={!product.defaultVariantId}
                    className="absolute bottom-3 right-3 bg-[#ff4b86] text-white p-2.5 rounded-full opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 shadow-lg hover:bg-[#e63d75] ux-transition-color ux-transition-opacity ux-transition-transform ux-motion-safe disabled:opacity-0 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">
                      add_shopping_cart
                    </span>
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1 ux-transition-color group-hover:text-[#ff4b86]">
                    {product.name}
                  </h3>
                  <p className="text-sm font-semibold text-[#ff4b86]">
                    ${(product.price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-full border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-full border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CharmBar() {
  useSeo({
    title: "Charm Bar · Stage 55",
    description: "Shop charms and accessories at Charm Bar.",
    canonical: `${window.location.origin}/charm-bar`,
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useProductSummaries();
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const productsRef = useRef<HTMLDivElement>(null);

  const loading =
    (productsLoading || categoriesLoading) && products.length === 0;

  const {
    activeCategory,
    searchQuery,
    updateFilters,
  } = useShopFilters();
  const filteredProducts = useMemo(() => {
    if (!products || !categories) return [];

    // All Charm Bar category slugs (no isActive filter — show everything)
    const charmBarSlugSet = new Set(CHARM_BAR_CATEGORIES.map((cat) => cat.slug));
    const charmBarProducts = products.filter((product) => {
      if (!product.categorySlug) return false;
      return charmBarSlugSet.has(product.categorySlug);
    });

    // Apply category select filter
    const categoryFiltered =
      activeCategory && activeCategory !== "all"
        ? charmBarProducts.filter((p) => p.categorySlug === activeCategory)
        : charmBarProducts;

    // Apply search filter
    const q = (searchQuery || "").toLowerCase().trim();
    return q
      ? categoryFiltered.filter((p) => p.name.toLowerCase().includes(q))
      : categoryFiltered;
  }, [
    products,
    categories,
    activeCategory,
    searchQuery,
  ]);

  // GSAP product cards stagger animation
  useEffect(() => {
    if (productsRef.current) {
      const productCards = productsRef.current.querySelectorAll(
        "[data-product-card]",
      );
      gsap.fromTo(
        Array.from(productCards),
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.03,
          ease: "back.out",
        },
      );
    }
  }, [filteredProducts.length]);

  // Get available categories for Charm Bar
  // const availableCategories = useMemo(() => {
  //   if (!categories) return [];

  //   const charmBarSlugs = CHARM_BAR_CATEGORIES.filter(cat => cat.isActive).map(cat => cat.slug);
  //   return categories.filter((cat) => charmBarSlugs.includes(cat.slug));
  // }, [categories]);

  // const activeSubcategories = useMemo(() => {
  //   if (!activeCategory || activeCategory === 'all' || !categoryIndex) return [];
  //   return categoryIndex.childCategoriesByParentSlug.get(activeCategory) || [];
  // }, [activeCategory, categoryIndex]);

  // const activeSubSubcategories = useMemo(() => {
  //   if (!activeSubcategory || activeSubcategory === 'all' || !categoryIndex) return [];
  //   return categoryIndex.childCategoriesByParentSlug.get(activeSubcategory) || [];
  // }, [activeSubcategory, categoryIndex]);

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
      showToast("success", `${product.name} added to cart`);
    } catch {
      showToast("error", "Failed to add to cart");
    }
  };

  const prefetchProduct = (productId: number) => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.product(productId),
      queryFn: ({ signal }) => fetchProductDetail(productId, signal),
      staleTime: 60000,
    });
  };

  // const scrollToCategory = (index: number) => {
  //   const container = document.getElementById('category-scroll-container');
  //   if (container) {
  //     const buttons = container.querySelectorAll('button');
  //     if (buttons[index]) {
  //       buttons[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  //     }
  //   }
  // };

  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-white">
        {/* menonaktifkan banner untuk sementara */}
        {/* <div className="relative w-full overflow-hidden bg-black">
          <img
            ref={heroRef}
            src={buildImageKitThumbUrl(charmBarSettings?.hero_image_url || `${CHARM_BAR_ASSET_BASE}/43620168072.png`, {
              width: 1600,
              quality: 70,
            })}
            alt="Charm bar hero"
            className="w-full h-auto object-contain"
          />
        </div> */}

        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-5">
          {/* ── Shop Section Navigator ──────────────────────────── */}
          <div className="mb-6">
            <div className="flex gap-3 sm:gap-4 justify-center flex-nowrap w-full px-2 sm:px-0 pb-2 -mb-2">
              {/* Glam — current page (active) */}
              <Link
                to="/beauty"
                className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-gray-200 text-gray-600 text-[11px] sm:text-sm font-bold uppercase tracking-wider hover:border-[#ff4b86] hover:text-[#ff4b86] hover:shadow-md transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
                  face_retouching_natural
                </span>
                Glam
              </Link>

              {/* Charm Bar */}
              <Link
                to="/charm-bar"
                className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-[#ff4b86] bg-[#ff4b86] text-white text-[11px] sm:text-sm font-bold uppercase tracking-wider shadow-sm"
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
          </div>

          <div className="flex justify-center mb-6 mt-4">
            <img
              src="/images/landing/Lucky Charm Bar.webp"
              alt="Charm Bar"
              className="h-16 sm:h-20 md:h-24 lg:h-32 object-contain drop-shadow-sm"
            />
          </div>

          <div className="relative w-full max-w-md mx-auto mb-2 px-2">
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  updateFilters({ q: e.target.value });
                }}
                placeholder="Search Charm Bar products..."
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] ux-transition-color"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    updateFilters({ q: null });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 ux-transition-color"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Category Select Dropdown */}
          <div className="mb-5 flex justify-center">
            <div className="relative w-full max-w-xs">
              <select
                id="charm-bar-category-select"
                value={activeCategory || "all"}
                onChange={(e) => {
                  const val = e.target.value;
                  updateFilters({
                    category: val === "all" ? null : val,
                    subcategory: null,
                    subsubcategory: null,
                  });
                }}
                className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border-2 border-gray-200 rounded-full text-sm font-semibold text-gray-700 cursor-pointer focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] transition-colors duration-200 hover:border-[#ff4b86]"
              >
                <option value="all">✨ All Categories</option>
                {CHARM_BAR_CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {/* chevron icon */}
              <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* <div ref={productsRef} className="mb-8 border-b border-gray-100 pb-0 sticky top-0 md:top-4 bg-white z-40 pt-4 -mt-6">
            <div className="flex flex-col space-y-4">

              <div className="relative">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const container = document.getElementById('category-scroll-container');
                      if (container) {
                        container.scrollBy({ left: -200, behavior: 'smooth' });
                      }
                    }}
                    className="absolute left-0 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:shadow-xl hover:scale-105 md:p-2.5 md:block hidden -mt-2"
                  >
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 text-gray-700" />
                  </button>
                  
                  <div 
                    id="category-scroll-container"
                    className="flex space-x-4 md:space-x-6 overflow-x-auto w-full pb-0 hide-scrollbar px-8 md:px-12 justify-center md:justify-start scroll-smooth"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        updateFilters({
                          category: null,
                          subcategory: null,
                          subsubcategory: null,
                        });
                        scrollToCategory(0);
                      }}
                      className={`text-sm whitespace-nowrap pb-3 border-b-2 px-2 ux-transition-color ${
                        activeCategory === null
                          ? 'font-semibold text-[#ff4b86] border-[#ff4b86]'
                          : 'font-semibold text-gray-500 border-transparent hover:text-[#ff4b86]'
                      }`}
                    >
                      All Products
                    </button>
                    {availableCategories.map((category, index) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          updateFilters({
                            category: category.slug,
                            subcategory: null,
                            subsubcategory: null,
                          });
                          scrollToCategory(index + 1);
                        }}
                        className={`text-sm whitespace-nowrap pb-3 border-b-2 px-2 ux-transition-color ${
                          activeCategory === category.slug
                            ? 'font-semibold text-[#ff4b86] border-[#ff4b86]'
                            : 'font-semibold text-gray-500 border-transparent hover:text-[#ff4b86]'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const container = document.getElementById('category-scroll-container');
                      if (container) {
                        container.scrollBy({ left: 200, behavior: 'smooth' });
                      }
                    }}
                    className="absolute right-0 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:shadow-xl hover:scale-105 md:p-2.5 md:block hidden -mt-2"
                  >
                    <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-gray-700" />
                  </button>
                </div>
              </div>

              {activeCategory !== 'all' && activeSubcategories.length > 0 ? (
                <div className="w-full justify-center md:justify-start flex overflow-x-auto hide-scrollbar pb-2 px-2">
                  <div className="flex gap-1.5 md:gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateFilters({
                          subcategory: null,
                          subsubcategory: null,
                        });
                      }}
                      className={`px-3 md:px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ux-transition-color ${
                        activeSubcategory === null
                          ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-sm'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                      }`}
                    >
                      All
                    </button>
                    {activeSubcategories.map((subcategory) => (
                      <button
                        key={subcategory.slug}
                        type="button"
                        onClick={() => {
                          updateFilters({
                            subcategory: subcategory.slug,
                            subsubcategory: null,
                          });
                        }}
                        className={`px-3 md:px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ux-transition-color ${
                          activeSubcategory === subcategory.slug
                            ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                        }`}
                      >
                        {subcategory.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeCategory !== 'all' && activeSubcategory !== 'all' && activeSubSubcategories.length > 0 ? (
                <div className="w-full justify-center md:justify-start flex overflow-x-auto hide-scrollbar pb-3 px-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateFilters({ subsubcategory: null })}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border ux-transition-color ${
                        activeSubSubcategory === null
                          ? 'bg-[#ff4b86]/10 text-[#ff4b86] border-[#ff4b86]/30'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#ff4b86]/50 hover:text-[#ff4b86]'
                      }`}
                    >
                      All
                    </button>
                    {activeSubSubcategories.map((subcategory) => (
                      <button
                        key={subcategory.slug}
                        type="button"
                        onClick={() => updateFilters({ subsubcategory: subcategory.slug })}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border ux-transition-color ${
                          activeSubSubcategory === subcategory.slug
                            ? 'bg-[#ff4b86]/10 text-[#ff4b86] border-[#ff4b86]/30'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#ff4b86]/50 hover:text-[#ff4b86]'
                        }`}
                      >
                        {subcategory.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div> */}

          {productsError ? (
            <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-700 mb-4">
                {productsError instanceof Error
                  ? productsError.message
                  : "Failed to load charm bar data"}
              </p>
              <button
                type="button"
                onClick={() => {
                  refetchProducts();
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark ux-transition-color text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : null}

          <ShopResults
            filteredProducts={filteredProducts}
            loading={loading}
            onPrefetchProduct={prefetchProduct}
            onAddToCart={handleAddToCart}
          />
        </main>
      </div>
    </PageTransition>
  );
}
