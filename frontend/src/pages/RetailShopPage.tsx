import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, X, ShoppingBag } from 'lucide-react';

import { useProductRetailSummaries } from '../hooks/useProductRetail';
import { formatCurrency } from '../utils/formatters';
import { buildImageKitThumbUrl } from '../lib/imagekit';
import { PageTransition } from '../components/PageTransition';
import ProductCardSkeleton from '../components/skeletons/ProductCardSkeleton';
import type { ProductRetail } from '../types';

const PRODUCTS_PER_PAGE = 20;

// ── Category Tabs ─────────────────────────────────────────────────────────────
function CategoryTabs({
  categories,
  active,
  onChange,
}: {
  categories: { name: string; slug: string }[];
  active: string;
  onChange: (slug: string) => void;
}) {
  return (
    <div className="relative">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('retail-cat-scroll');
            el?.scrollBy({ left: -200, behavior: 'smooth' });
          }}
          className="absolute left-0 z-10 bg-white shadow-lg rounded-full p-2 border border-gray-200 hover:bg-gray-50 hover:shadow-xl hover:scale-105 transition-all duration-200 hidden md:block -mt-2"
        >
          <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 text-gray-700" />
        </button>

        <div
          id="retail-cat-scroll"
          className="flex space-x-4 md:space-x-6 overflow-x-auto w-full pb-0 hide-scrollbar px-4 md:px-12 justify-start md:justify-center scroll-smooth"
        >
          <button
            type="button"
            onClick={() => onChange('all')}
            className={`text-sm whitespace-nowrap pb-3 border-b-2 px-2 transition-colors ${
              active === 'all'
                ? 'font-semibold text-[#ff4b86] border-[#ff4b86]'
                : 'font-semibold text-gray-500 border-transparent hover:text-[#ff4b86]'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onChange(cat.slug)}
              className={`text-sm whitespace-nowrap pb-3 border-b-2 px-2 transition-colors ${
                active === cat.slug
                  ? 'font-semibold text-[#ff4b86] border-[#ff4b86]'
                  : 'font-semibold text-gray-500 border-transparent hover:text-[#ff4b86]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('retail-cat-scroll');
            el?.scrollBy({ left: 200, behavior: 'smooth' });
          }}
          className="absolute right-0 z-10 bg-white shadow-lg rounded-full p-2 border border-gray-200 hover:bg-gray-50 hover:shadow-xl hover:scale-105 transition-all duration-200 hidden md:block -mt-2"
        >
          <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-gray-700" />
        </button>
      </div>
    </div>
  );
}

// ── Card Grid ─────────────────────────────────────────────────────────────────
function RetailProductGrid({
  products,
  loading,
  resetSignal,
}: {
  products: ProductRetail[];
  loading: boolean;
  resetSignal: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetSignal]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    return products.slice(start, start + PRODUCTS_PER_PAGE);
  }, [products, page]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }, (_, i) => (
          <ProductCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-16 text-center">
        <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">No products found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {paginated.map((product) => (
          <Link
            to={`/shop/retail/product/${product.id}`}
            key={product.id}
            className="group flex flex-col h-full rounded-xl border-2 border-gray-100 bg-white overflow-hidden duration-300 hover:border-[#ff4b86] hover:shadow-lg hover:shadow-pink-100"
          >
            {/* Image */}
            <div className="relative overflow-hidden aspect-square bg-gray-50 shrink-0">
              {product.image ? (
                <img
                  alt={product.name}
                  className="w-full h-full object-cover duration-500 group-hover:scale-[1.03]"
                  src={buildImageKitThumbUrl(product.image, { width: 480, quality: 60 })}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                  <span className="material-symbols-outlined text-5xl">inventory_2</span>
                </div>
              )}

              {product.stock <= 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <span className="text-white text-xs font-bold uppercase tracking-widest px-3 py-1 border border-white/50 bg-black/20 backdrop-blur-sm">
                    Out of Stock
                  </span>
                </div>
              )}

              {product.retail_category && (
                <span className="absolute top-3 left-3 bg-[#ff4b86] text-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full shadow-sm">
                  {product.retail_category === 'glam' ? 'Glam' : 
                   product.retail_category === 'charmbar' ? 'Charm Bar' : 
                   product.retail_category === 'sparkclub' ? 'Spark Club' : 
                   product.retail_category}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col flex-grow">
              <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1 group-hover:text-[#ff4b86] duration-200">
                {product.name}
              </h3>
              <p className="text-[11px] text-gray-400 mb-2 line-clamp-1 font-light min-h-[16px]">
                {product.description || '\u00A0'}
              </p>
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-base font-black text-[#ff4b86]">
                  {formatCurrency(product.price)}
                </span>
                {product.weight > 0 && (
                  <span className="text-[10px] text-gray-400 font-light ml-auto">
                    {product.weight}g
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {products.length > PRODUCTS_PER_PAGE && (
        <div className="mt-14 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({products.length} products)
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 duration-200 hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 duration-200 hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RetailShopPage() {
  const { data: products = [], isLoading, error } = useProductRetailSummaries();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Define the main retail categories
  const categories = useMemo(() => [
    { name: 'Glam', slug: 'glam' },
    { name: 'Charm Bar', slug: 'charmbar' },
    { name: 'Spark Club', slug: 'sparkclub' },
  ], []);

  // Reset to "all" if the active category no longer exists in the data
  useEffect(() => {
    if (activeCategory !== 'all' && !categories.find((c) => c.slug === activeCategory)) {
      setActiveCategory('all');
    }
  }, [categories, activeCategory]);

  const resetSignal = `${activeCategory}__${search}`;

  // Client-side filter: category + search
  const filtered = useMemo(() => {
    let list = products;

    if (activeCategory !== 'all') {
      list = list.filter((p) => p.retail_category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.retail_category ?? '').toLowerCase().includes(q),
      );
    }

    return list;
  }, [products, activeCategory, search]);

  return (
    <PageTransition>
      <div className="bg-white min-h-screen">
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-5">

          {/* ── Section Navigator ── */}
          <div className="mb-6">
            <div className="flex gap-2 sm:gap-3 justify-center flex-nowrap w-full px-2 sm:px-0 pb-2 -mb-2">
              <Link
                to="/beauty"
                className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-gray-200 text-gray-600 text-[11px] sm:text-sm font-bold uppercase tracking-wider hover:border-[#ff4b86] hover:text-[#ff4b86] hover:shadow-md transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[14px] sm:text-[16px]">auto_awesome</span>
                Glam
              </Link>
              <Link
                to="/charm-bar"
                className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-gray-200 text-gray-600 text-[11px] sm:text-sm font-bold uppercase tracking-wider hover:border-[#ff4b86] hover:text-[#ff4b86] hover:shadow-md transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[14px] sm:text-[16px]">diamond</span>
                Charm
              </Link>
              <Link
                to="/shop"
                className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-gray-200 text-gray-600 text-[11px] sm:text-sm font-bold uppercase tracking-wider hover:border-[#ff4b86] hover:text-[#ff4b86] hover:shadow-md transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[14px] sm:text-[16px]">storefront</span>
                Spark
              </Link>
              <Link
                to="/shop/retail"
                className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-[#ff4b86] bg-[#ff4b86] text-white text-[11px] sm:text-sm font-bold uppercase tracking-wider shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px] sm:text-[16px]">local_shipping</span>
                Retail
              </Link>
            </div>
          </div>

          <h3 className="text-2xl italic tracking-wide text-center mb-6">
            Spark Retail
          </h3>

          {/* ── Sticky filter bar ── */}
          <div className="sticky top-0 md:top-4 bg-white z-40 pt-4 -mt-6 mb-8 border-b border-gray-100 pb-4">
            {/* Search */}
            <div className="relative w-full max-w-md mx-auto px-2 mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search retail products..."
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86] transition-colors"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category tabs — only render once data is loaded */}
            {!isLoading && categories.length > 0 && (
              <CategoryTabs
                categories={categories}
                active={activeCategory}
                onChange={setActiveCategory}
              />
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-700">
                {error instanceof Error ? error.message : 'Failed to load retail products'}
              </p>
            </div>
          )}

          {/* ── Product Grid ── */}
          <RetailProductGrid
            products={filtered}
            loading={isLoading}
            resetSignal={resetSignal}
          />
        </main>
      </div>
    </PageTransition>
  );
}
