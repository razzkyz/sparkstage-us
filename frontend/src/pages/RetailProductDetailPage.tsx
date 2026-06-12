import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { formatCurrency } from "../utils/formatters";
import { useCart } from "../contexts/cartStore";
import { useProductRetailDetail } from "../hooks/useProductRetail";
import { useToast } from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { PageTransition } from "../components/PageTransition";
import { LazyMotion, m } from "framer-motion";
import { ProductImageCarousel } from "../components/ProductImageCarousel";
import { ShoppingBag, ChevronLeft, ShieldCheck, Truck } from "lucide-react";
import { buildImageKitThumbUrl } from "../lib/imagekit";
import useSeo from "../hooks/useSeo";

export default function RetailProductDetailPage() {
  const { productId } = useParams();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: product, error, isLoading } = useProductRetailDetail(productId);

  useSeo({
    title: product ? `${product.name} · Stage 55 Retail` : "Retail Product · Stage 55",
    description: product?.description || "Retail product at Stage 55",
    canonical: product ? `${window.location.origin}/shop/retail/product/${product.id}` : undefined,
  });
  const [imageIndex, setImageIndex] = useState(0);

  const handleAddToCart = () => {
    if (!user) {
      showToast("error", "Please login to add items to cart");
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }
    if (!product || product.stock <= 0) return;

    try {
      const imageUrl = product.image
        ? buildImageKitThumbUrl(product.image, { width: 800, quality: 80 })
        : undefined;

      addItem(
        {
          productId: product.id,
          productName: product.name,
          productImageUrl: imageUrl,
          variantId: 0, // Fallback variant ID for retail products
          variantName: product.variant || "Default",
          unitPrice: product.price,
        },
        1,
      );
      showToast("success", "Added to shopping bag");
    } catch {
      showToast("error", "Failed to add to cart");
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      showToast("error", "Please login to checkout");
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }
    if (!product || product.stock <= 0) return;

    const imageUrl = product.image
      ? buildImageKitThumbUrl(product.image, { width: 800, quality: 80 })
      : undefined;

    const directItem = {
      productId: product.id,
      productName: product.name,
      productImageUrl: imageUrl,
      variantId: 0,
      variantName: product.variant || "Default",
      unitPrice: product.price,
      quantity: 1,
      isRental: false,
    };

    navigate("/checkout/product", { state: { directItem } });
  };

  // Pass raw URLs to carousel — same as ProductDetailPage (no thumb transformation needed)
  const productImages = product?.imageUrls?.length
    ? product.imageUrls
    : product?.image
      ? [product.image]
      : [];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#FAFAFA]">
        <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12 w-full">
          {/* Breadcrumb */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#e63d75] transition-colors text-sm font-medium uppercase tracking-widest group bg-transparent border-none cursor-pointer p-0"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
          </div>

          {error && (
            <div className="mb-12 rounded-xl border border-red-500/20 bg-red-50 p-6 text-center">
              <p className="text-red-600 font-medium">
                {error instanceof Error
                  ? error.message
                  : "Failed to load product"}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
              <div className="rounded-3xl overflow-hidden bg-gray-100 animate-pulse aspect-[4/5]" />
              <div className="flex flex-col gap-8 pt-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-12 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-3 pt-8">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ) : product ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
              {/* Product Gallery */}
              <div>
                <div className="sticky top-28 flex flex-col items-center justify-center">
                  <ProductImageCarousel
                    images={productImages}
                    alt={product.name}
                    onIndexChange={setImageIndex}
                    currentIndex={imageIndex}
                  />

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-[#e63d75]">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          Original
                        </p>
                        <p className="text-xs text-gray-500">100% Authentic</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-[#e63d75]">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          Store Pickup
                        </p>
                        <p className="text-xs text-gray-500">
                          Pick up at studio
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="flex flex-col pt-2">
                <div className="mb-8 border-b border-gray-100 pb-8">
                  <div className="flex items-center gap-2 mb-4">
                    {product.categories?.name && (
                      <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest rounded-sm">
                        {product.categories.name}
                      </span>
                    )}
                    {product.retail_category && (
                      <span className="bg-[#ff4b86] text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest rounded-sm">
                        {product.retail_category === "glam"
                          ? "Glam"
                          : product.retail_category === "charmbar"
                            ? "Charm Bar"
                            : product.retail_category === "sparkclub"
                              ? "Spark Club"
                              : product.retail_category}
                      </span>
                    )}
                  </div>

                  <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-[1.1] mb-6">
                    {product.name}
                  </h1>

                  <p className="text-lg text-gray-500 leading-relaxed font-light font-sans max-w-xl">
                    {product.description || "No description available."}
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Price */}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#e63d75] font-bold mb-2">
                      Price
                    </p>
                    <p className="font-serif text-4xl text-gray-900">
                      {formatCurrency(product.price)}
                    </p>
                  </div>

                  {/* Stock info */}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">
                      Availability
                    </p>
                    <span
                      className={`text-sm font-medium ${product.stock > 0 ? "text-green-600" : "text-red-500"}`}
                    >
                      {product.stock > 0
                        ? `${product.stock} in stock`
                        : "Out of Stock"}
                    </span>
                  </div>

                  {/* Actions */}
                  <LazyMotion
                    features={() =>
                      import("framer-motion").then((mod) => mod.domAnimation)
                    }
                  >
                    <div className="pt-4 flex flex-col gap-3">
                      <m.button
                        onClick={handleBuyNow}
                        disabled={product.stock <= 0}
                        className="w-full bg-[#e63d75] text-white py-5 rounded-xl uppercase tracking-widest text-sm font-bold shadow-xl shadow-pink-200 hover:bg-[#cc2f64] hover:shadow-pink-300 active:bg-[#a32550] ux-transition-color disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 disabled:bg-gray-400"
                      >
                        {product.stock <= 0
                          ? "Out of Stock"
                          : `Pay ${formatCurrency(product.price)}`}
                      </m.button>

                      <m.button
                        onClick={handleAddToCart}
                        disabled={product.stock <= 0}
                        className="w-full bg-[#e63d75] text-white py-5 rounded-xl uppercase tracking-widest text-sm font-bold shadow-xl shadow-pink-200 hover:bg-[#cc2f64] hover:shadow-pink-300 active:bg-[#a32550] ux-transition-color disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 disabled:bg-gray-400"
                      >
                        <ShoppingBag className="w-5 h-5" />
                        Add to Shopping Bag
                      </m.button>

                      <p className="text-center text-xs text-gray-400 mt-4">
                        Free pickup at Spark Studio • Secure Payment
                      </p>
                    </div>
                  </LazyMotion>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="font-serif text-3xl text-gray-900 mb-2">
                Product Not Found
              </h2>
              <p className="text-gray-500 mb-8">
                The product you are looking for might have been removed or is
                unavailable.
              </p>
              <Link
                to="/shop/retail"
                className="bg-gray-900 text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors"
              >
                Back to Retail Shop
              </Link>
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
