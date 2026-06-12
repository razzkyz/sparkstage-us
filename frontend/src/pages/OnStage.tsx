import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useBanners } from "../hooks/useBanners";
import { useProductSummaries } from "../hooks/useProducts";
import { formatCurrency } from "../utils/formatters";
import { buildImageKitThumbUrl } from "../lib/imagekit";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCart } from "../contexts/cartStore";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import { useNavigate } from "react-router-dom";
import type { Product } from "../hooks/useProducts";
import { CHARM_BAR_CATEGORY_SLUGS } from "./shop/charmBarSlugs";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ─── Infinite Product Slider ──────────────────────────────────────────────────
const CARD_CLASS =
  "shrink-0 w-[65%] sm:w-[42%] md:w-[31%] lg:w-[21%] xl:w-[19%] group relative flex flex-col";

function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (p: Product) => void;
}) {
  return (
    <Link
      to={`/shop/product/${product.id}`}
      className="group cursor-pointer flex flex-col h-full rounded-xl border-2 border-gray-100 bg-white overflow-hidden duration-300 ux-transition-color hover:border-[#ff4b86] hover:shadow-lg hover:shadow-pink-100"
    >
      <div className="relative overflow-hidden aspect-square bg-gray-50 shrink-0">
        {product.image ? (
          <img
            src={buildImageKitThumbUrl(product.image, {
              width: 480,
              quality: 60,
            })}
            alt={product.name}
            className="w-full h-full object-cover duration-500 ux-transition-transform ux-motion-safe group-hover:scale-[1.03]"
            loading="eager"
            decoding="async"
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
        {product.badge && (
          <span className="absolute top-3 left-3 bg-[#ff4b86] text-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full shadow-sm">
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1 ux-transition-color group-hover:text-[#ff4b86]">
          {product.name}
        </h3>
        <p className="text-[11px] text-gray-400 mb-2 line-clamp-1 font-light min-h-[16px]">
          {product.description || "\u00A0"}
        </p>
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-base font-black text-[#ff4b86]">
            {formatCurrency(product.price)}
          </span>
          {product.originalPrice ? (
            <span className="text-xs text-gray-400 line-through font-light">
              {formatCurrency(product.originalPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function InfiniteProductSlider({
  title,
  titleImage,
  titleImageClassName,
  viewAllLink,
  products: rawProducts,
  loading,
  onAddToCart,
}: {
  title?: string;
  titleImage?: string;
  titleImageClassName?: string;
  viewAllLink: string;
  products: Product[];
  loading: boolean;
  onAddToCart: (p: Product) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const rafRef = useRef<number>(0);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartPosRef = useRef(0);

  // Clone array: [last6 ... originals ... first6]
  // We need enough clones to fill the screen on ultra-wide / 5-column views (xl:w-[19%])
  const CLONE = 6;
  const clonedProducts = useMemo(() => {
    if (rawProducts.length === 0) return [];

    // If we have fewer products than clones, we wrap the remainder safely
    let extended = [...rawProducts];
    while (extended.length < CLONE) {
      extended = [...extended, ...rawProducts];
    }

    const tail = extended.slice(-CLONE);
    const head = extended.slice(0, CLONE);
    return [...tail, ...rawProducts, ...head];
  }, [rawProducts]);

  // Get item width dynamically from the DOM
  const getItemWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 300;
    const firstChild = track.firstElementChild as HTMLElement | null;
    if (!firstChild) return 300;
    return firstChild.getBoundingClientRect().width + 16; // 16 = gap-4
  }, []);

  // Jump to real-items zone on mount (skip the clones at start)
  useEffect(() => {
    if (rawProducts.length === 0) return;
    const track = trackRef.current;
    if (!track) return;
    // Wait one frame so layout is settled
    const raf = requestAnimationFrame(() => {
      const itemW = getItemWidth();
      posRef.current = -(itemW * CLONE);
      track.style.transform = `translateX(${posRef.current}px)`;
    });
    return () => cancelAnimationFrame(raf);
  }, [rawProducts.length, getItemWidth]);

  // Infinite auto-scroll loop
  useEffect(() => {
    if (rawProducts.length === 0) return;
    const SPEED = 0.6; // px per frame

    const tick = () => {
      if (!isHoveredRef.current && !isDraggingRef.current) {
        const track = trackRef.current;
        if (!track) return;
        const itemW = getItemWidth();
        const totalReal = rawProducts.length * itemW;
        const cloneWidth = CLONE * itemW;

        posRef.current -= SPEED;

        // When we've scrolled into the tail clones, jump back
        if (posRef.current < -(cloneWidth + totalReal)) {
          posRef.current += totalReal;
        }
        // When we've scrolled into the head clones (going backward), jump forward
        if (posRef.current > -cloneWidth) {
          posRef.current -= totalReal;
        }

        track.style.transform = `translateX(${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rawProducts.length, getItemWidth]);

  // Drag/swipe support
  const isMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    isMovedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartPosRef.current = posRef.current;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 5) {
      isMovedRef.current = true;
    }
    const track = trackRef.current;
    if (!track) return;
    const itemW = getItemWidth();
    const totalReal = rawProducts.length * itemW;
    const cloneWidth = CLONE * itemW;
    let next = dragStartPosRef.current + dx;
    if (next < -(cloneWidth + totalReal)) next += totalReal;
    if (next > -cloneWidth) next -= totalReal;
    posRef.current = next;
    track.style.transform = `translateX(${next}px)`;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (isMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Step one card on button click
  const step = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const itemW = getItemWidth();
    const totalReal = rawProducts.length * itemW;
    const cloneWidth = CLONE * itemW;
    const target = posRef.current + dir * -itemW;
    const duration = 350;
    const start = performance.now();
    const from = posRef.current;

    const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      let val = from + (target - from) * ease(t);

      // wrap
      if (val < -(cloneWidth + totalReal)) val += totalReal;
      if (val > -cloneWidth) val -= totalReal;

      posRef.current = val;
      track.style.transform = `translateX(${val}px)`;
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  if (!loading && rawProducts.length === 0) return null;

  return (
    <section className="w-full bg-white pb-12 md:pb-16 mt-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 md:mb-8">
          {titleImage ? (
            <img
              src={titleImage}
              alt={title || "Section Title"}
              className={
                titleImageClassName ||
                "h-8 sm:h-10 md:h-12 lg:h-16 object-contain drop-shadow-sm"
              }
            />
          ) : (
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-black uppercase tracking-tighter leading-none drop-shadow-sm">
              {title}
            </h2>
          )}
          <Link
            to={viewAllLink}
            className="text-black font-bold uppercase tracking-widest border-b-2 border-black pb-0.5 hover:text-pink-400 transition-color whitespace-nowrap text-xs md:text-sm mb-1"
          >
            View More
          </Link>
        </div>

        {/* Track wrapper */}
        <div className="relative group/slider">
          {/* Left arrow */}
          <button
            type="button"
            onClick={() => step(-1)}
            className="absolute left-0 md:-left-5 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white text-black p-2.5 md:p-3 rounded-full shadow-md opacity-0 group-hover/slider:opacity-100 transition-opacity duration-200"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          {/* Right arrow */}
          <button
            type="button"
            onClick={() => step(1)}
            className="absolute right-0 md:-right-5 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white text-black p-2.5 md:p-3 rounded-full shadow-md opacity-0 group-hover/slider:opacity-100 transition-opacity duration-200"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Overflow mask */}
          <div
            className="overflow-hidden"
            onMouseEnter={() => {
              isHoveredRef.current = true;
            }}
            onMouseLeave={() => {
              isHoveredRef.current = false;
              isDraggingRef.current = false;
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClickCapture={handleClickCapture}
            style={{ cursor: isDraggingRef.current ? "grabbing" : "grab" }}
          >
            {loading ? (
              <div className="flex gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-[68%] sm:w-[42%] md:w-[31%] lg:w-[21%] xl:w-[19%] bg-gray-100 animate-pulse aspect-square rounded-xl"
                  />
                ))}
              </div>
            ) : (
              <div
                ref={trackRef}
                className="flex gap-4 will-change-transform select-none"
                style={{ transform: `translateX(0px)` }}
              >
                {clonedProducts.map((product, i) => (
                  <div key={`${product.id}-${i}`} className={CARD_CLASS}>
                    <ProductCard product={product} onAddToCart={onAddToCart} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const OnStage = () => {
  const [showModal, setShowModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem("hasSeenWelcomeModal");
    if (!hasSeenModal) {
      const timer = setTimeout(() => {
        setShowModal(true);
        sessionStorage.setItem("hasSeenWelcomeModal", "true");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: products = [], isLoading: productsLoading } =
    useProductSummaries();

  const GLAM_SLUGS = useMemo(
    () =>
      new Set([
        "makeup",
        "eyewear",
        "glitter",
        "headliner",
        "starglitter",
        "star-glitter",
        "popsocket",
        "pop-socket",
        "popsockets",
      ]),
    [],
  );

  const featuredProducts = useMemo(() => {
    if (!products.length) return [];
    return products
      .filter(
        (p) =>
          p.defaultVariantId &&
          !CHARM_BAR_CATEGORY_SLUGS.has(p.categorySlug?.toLowerCase() || "") &&
          !GLAM_SLUGS.has(p.categorySlug?.toLowerCase() || "") &&
          !p.name.toLowerCase().includes("headliner") &&
          !p.name.toLowerCase().includes("pop socket") &&
          !p.name.toLowerCase().includes("popsocket"),
      )
      .slice(0, 10);
  }, [products, GLAM_SLUGS]);

  const glamProducts = useMemo(() => {
    if (!products.length) return [];
    return products
      .filter(
        (p) =>
          p.defaultVariantId &&
          (GLAM_SLUGS.has(p.categorySlug?.toLowerCase() || "") ||
            p.name.toLowerCase().includes("headliner") ||
            p.name.toLowerCase().includes("pop socket") ||
            p.name.toLowerCase().includes("popsocket")),
      )
      .slice(0, 10);
  }, [products, GLAM_SLUGS]);

  const charmProducts = useMemo(() => {
    if (!products.length) return [];
    return products
      .filter(
        (p) =>
          p.defaultVariantId &&
          CHARM_BAR_CATEGORY_SLUGS.has(p.categorySlug?.toLowerCase() || ""),
      )
      .slice(0, 10);
  }, [products]);

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

  // GSAP animation refs
  const processTitleRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);

  const { data: heroBanners = [] } = useBanners("hero");
  const { data: portraitHeroBanners = [] } = useBanners("portrait-hero");

  const { data: processBanners = [] } = useBanners("process");

  const activeRealIndex = useMemo(() => {
    if (processBanners.length <= 1) return 0;
    if (currentIndex === 0) return processBanners.length - 1;
    if (currentIndex === processBanners.length + 1) return 0;
    return currentIndex - 1;
  }, [currentIndex, processBanners.length]);

  useEffect(() => {
    if (!isTransitionEnabled) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitionEnabled(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitionEnabled]);

  // Process banner auto-slide timer
  useEffect(() => {
    if (processBanners.length <= 1) return;

    // GSAP animation for process title
    if (processTitleRef.current) {
      gsap.fromTo(
        processTitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
      );
    }

    const interval = setInterval(() => {
      setIsTransitionEnabled(true);
      setCurrentIndex((prev) => prev + 1);
    }, 8000);
    return () => clearInterval(interval);
  }, [processBanners.length, activeRealIndex]);

  // Hero section fade-in animation
  useEffect(() => {
    if (heroSectionRef.current) {
      gsap.fromTo(
        heroSectionRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: "power2.inOut" },
      );
    }
  }, []);

  // if (loading) {
  //   return (
  //     <div className="bg-white min-h-screen flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" />
  //     </div>
  //   );
  // }

  // if (error && !hasData) {
  //   return (
  //     <div className="bg-white min-h-screen flex items-center justify-center">
  //       <div className="text-center px-6 py-12 bg-white rounded-none border-2 border-black">
  //         <div className="mb-4 text-4xl">⚠️</div>
  //         <p className="text-lg text-black mb-6 font-bold uppercase tracking-widest">
  //           Gagal memuat konten. Coba lagi.
  //         </p>
  //         <button
  //           type="button"
  //           onClick={() => {
  //             refetchProcess();
  //           }}
  //           className="inline-flex items-center justify-center rounded-full bg-pink-500 hover:bg-pink-600 active:bg-pink-700 px-10 py-4 text-white font-black uppercase tracking-widest transition-colors duration-300 hover:scale-105 active:scale-95"
  //         >
  //           🔄 Muat ulang
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="bg-white min-h-screen">
      {/* Landing Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-[95vw] sm:w-full max-w-3xl bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 bg-black/20 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
            <Link
              to="/booking"
              onClick={handleCloseModal}
              className="w-full flex flex-row bg-white items-center justify-center"
            >
              <img
                src="/images/landing/POP UP WEB VIP STAR 1.jpg.webp"
                alt="Welcome to Spark - VIP Star"
                className="w-1/2 h-auto max-h-[85vh] object-contain"
                loading="eager"
                decoding="async"
              />
              <img
                src="/images/landing/POP UP WEB VIP STAR 2.jpg.webp"
                alt="Welcome to Spark - VIP Star"
                className="w-1/2 h-auto max-h-[85vh] object-contain"
                loading="eager"
                decoding="async"
              />
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section ref={heroSectionRef} className="w-full flex flex-col bg-black">
        <img
          src="/images/heroBanner/homeBannerHeader.webp"
          alt="The most iconic content wins awards & rewards"
          className="w-full max-h-[10vh] object-contain"
          fetchPriority="high"
          loading="eager"
          decoding="sync"
          width={1920}
          height={108}
        />
        <Link
          to="/booking"
          className="w-full h-[75vh] relative group cursor-pointer overflow-hidden block"
        >
          {/* Mobile Banner */}
          <img
            src={
              portraitHeroBanners.length > 0
                ? portraitHeroBanners[0].image_url
                : "/images/heroBanner/NewHeroBanner.webp"
            }
            alt="Become the star"
            className="absolute inset-0 w-full h-full object-cover object-center sm:hidden"
            fetchPriority="high"
            loading="eager"
            decoding="sync"
          />
          {/* Desktop Banner */}
          <img
            src={
              heroBanners.length > 0
                ? heroBanners[0].image_url
                : "/images/heroBanner/LandscapeHeroBanner.webp"
            }
            alt="Become the star"
            className="absolute inset-0 w-full h-full object-cover object-center hidden sm:block"
            fetchPriority="high"
            loading="eager"
            decoding="sync"
          />

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

          {/* Overlay Button */}
          <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10 pointer-events-none opacity-95 hover:p-5 ">
            <div className="bg-white rounded-full min-w-[200px]  px-10 py-2 flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.15)] transform transition-transform group-hover:scale-105">
              <span className="text-[#ff6b9d] font-black text-sm md:text-xl tracking-[0.2em] leading-tight ">
                BECOME THE
              </span>
              <span className="text-[#ff6b9d] font-black text-sm md:text-xl tracking-[0.1em] leading-tight">
                ★ STAR ★
              </span>
            </div>
          </div>
        </Link>
      </section>
      <div className="block w-full bg-black hover:bg-neutral-900 transition-colors duration-300 border-t border-neutral-800">
        <div className="w-full py-4 md:py-0 md:h-[15vh] h-[15hv] flex md:flex-row items-center justify-center gap-6 md:gap-12 px-4">
          {/* Left Text: VIP STAR */}
          <div className="flex items-center gap-3 text-white font-serif font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tighter">
            <span className="text-5xl md:text-6xl lg:text-7xl pb-2">★</span>
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl lg:text-5xl">VIP</span>
              <span className="text-3xl md:text-4xl lg:text-5xl">STAR</span>
            </div>
          </div>

          {/* Right Text: Rewards info */}
          <div className="flex flex-col items-center text-center">
            <p className="text-pink-400 font-black text-base md:text-md lg:text-xl mb-0.5">
              POST.SHINE.WIN.
            </p>
            <Link
              to="/booking"
              className="flex flex-col bg-pink-400 px-5 py-1 rounded-full hover:bg-pink-500 hover:px-5.5 hover:py-1.5"
            >
              <span className="text-black font-black text-sm md:text-md lg:text-xl uppercase tracking-wide leading-tight">
                WINS AWARDS &
              </span>
              <span className="text-black font-black text-sm md:text-md lg:text-xl uppercase tracking-wide leading-tight">
                REWARDS UP TO 599K
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Ticket Banner */}
      <div className="w-full py-8  mt-2 flex flex-col items-center  justify-center px-4 sm:px-6">
        {/* Ticket Header Title */}
        <div className="text-center mb-4 lg:mb-6 px-4 relative z-20">
          <h2 className="text-xl md:text-3xl lg:text-5xl font-black tracking-tighter text-black uppercase pb-2">
            GET YOUR <span className="text-pink-400">TIKET</span> NOW
          </h2>
        </div>
        <Link to="/booking">
          <img
            src="/images/landing/TICKET BOARD ENTRANCE website.webp"
            alt="BE A STAR Ticket"
            className="w-full max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
          />
        </Link>
      </div>

      {/* Slider Card Product All */}
      <div className="py-7 shadow-sm">
        {/* Glam Room Slider */}
        <InfiniteProductSlider
          title="GLAM ROOM"
          titleImage="/images/landing/Glam.webp"
          titleImageClassName="h-18 sm:h-24 md:h-28 lg:h-36 object-cover drop-shadow-sm"
          viewAllLink="/glam"
          products={glamProducts}
          loading={productsLoading}
          onAddToCart={handleAddToCart}
        />

        {/* Charm Bar Slider */}
        <InfiniteProductSlider
          title="CHARM BAR"
          titleImage="/images/landing/Lucky Charm Bar.webp"
          titleImageClassName="h-16 sm:h-20 md:h-24 lg:h-32 object-cover drop-shadow-sm"
          viewAllLink="/charm-bar"
          products={charmProducts}
          loading={productsLoading}
          onAddToCart={handleAddToCart}
        />

        {/* Spark Club Slider */}
        <InfiniteProductSlider
          title="SPARK CLUB"
          titleImage="/images/landing/SPARK CLUB.webp"
          titleImageClassName="h-16 sm:h-20 md:h-22 lg:h-30 object-cover drop-shadow-sm"
          viewAllLink="/shop"
          products={featuredProducts}
          loading={productsLoading}
          onAddToCart={handleAddToCart}
        />
      </div>

      {/* News Banner Section */}
      <section
        className="w-full py-12 md:py-18 text-center relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/glam page assets/VISUAL 5.webp')",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="max-w-[1200px] mx-auto px-4 flex flex-col items-center relative z-10">
          <h2 className="text-5xl md:text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter mb-4 md:mb-6 drop-shadow-md">
            LATEST NEWS
          </h2>
          <p className="text-white text-lg md:text-xl lg:text-2xl font-bold italic tracking-widest mb-8 md:mb-12 max-w-2xl px-4">
            Stay up to date with exciting events, backstage passes and exclusive
            charm releases.
          </p>
          <Link
            to="/news"
            className="inline-block bg-pink-500 text-white font-black uppercase tracking-widest px-8 py-4 md:px-12 md:py-5 rounded-full hover:bg-white hover:text-black hover:-translate-y-1 transition-all duration-300 text-sm md:text-lg shadow-[0_4px_14px_0_rgba(236,107,173,0.39)]"
          >
            READ UPDATES
          </Link>
        </div>
      </section>
    </div>
  );
};

export default OnStage;
