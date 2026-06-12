import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Heart, ShieldCheck, Zap, ArrowRight, Star, Package } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import useSeo from '../hooks/useSeo';
import { HeroCarousel } from '../components/dressing-room/HeroCarousel';
import { DRESSING_ROOM_DEMO } from '../mock/dressingRoomDemo';
import { useDressingRoomCollection } from '../hooks/useDressingRoomCollection';
import { useDressingRoomCatalog, useDressingRoomCatalogVariants, useDressingRoomSubcategoriesBySlug } from '../hooks/useDressingRoomCatalog';
import type { DressingRoomCatalogProduct } from '../hooks/useDressingRoomCatalog';
import { AppLoadingScreen } from '../app/AppLoadingScreen';
import RentalFlowModal from '../components/dressing-room/RentalFlowModal';



// ─── Catalog Product Card ────────────────────────────────────────────────────
function DressingRoomProductCard({
  product,
  onClick,
}: {
  product: DressingRoomCatalogProduct;
  onClick: () => void;
}) {
  const dailyFee = product.dressing_room_product_variants?.[0]?.daily_rental_fee ?? 35000;
  const deposit = product.dressing_room_product_variants?.[0]?.deposit_amount ?? 50000;
  const totalAvailable = product.dressing_room_product_variants?.reduce((sum, v) => sum + ((v as any).available_quantity || 0), 0) || 0;
  const isOutOfStock = totalAvailable <= 0;

  return (
    <div
      className="group cursor-pointer flex flex-col h-full"
      onClick={onClick}
    >
      <div className="flex flex-col h-full rounded-xl border-2 border-gray-100 bg-white overflow-hidden duration-300 hover:border-[#ff4b86] hover:shadow-lg hover:shadow-pink-100">
        <div className="relative overflow-hidden aspect-square bg-gray-50 shrink-0">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className={`w-full h-full object-cover duration-500 group-hover:scale-[1.03] ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
              onError={(e) => { (e.target as HTMLImageElement).src = '/images/landing/neon.png'; }}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isOutOfStock ? 'grayscale opacity-60' : ''}`}>
              <Package className="w-12 h-12 text-gray-300" />
            </div>
          )}
          
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-black/70 text-white font-bold py-1.5 px-4 rounded-md uppercase tracking-wider text-sm">
                Stok Habis
              </span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="absolute bottom-3 right-3 bg-[#ff4b86] text-white p-2.5 rounded-full opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 shadow-lg hover:bg-[#e63d75] transition-all duration-300"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 flex flex-col flex-grow">
          <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1 group-hover:text-[#ff4b86] transition-colors">
            {product.name}
          </h3>
          <p className="text-[11px] text-gray-400 mb-2 line-clamp-1 font-light min-h-[16px]">
            {product.description || '\u00A0'}
          </p>
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-base font-black text-[#ff4b86]">Rp {dailyFee.toLocaleString('id-ID')}</span>
            <span className="text-[10px] text-gray-400 font-light">/hari</span>
          </div>
          <p className="text-[10px] text-gray-400 font-light mt-1">+ Deposit Rp {deposit.toLocaleString('id-ID')}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Variant Picker Modal ─────────────────────────────────────────────────────
function VariantPickerModal({
  product,
  onSelect,
  onClose,
}: {
  product: DressingRoomCatalogProduct;
  onSelect: (product: DressingRoomCatalogProduct, variant: any) => void;
  onClose: () => void;
}) {
  const { data: variants = [], isLoading } = useDressingRoomCatalogVariants(product.id);
  const availableVariants = variants.filter((v: any) => (v.available_quantity || 0) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{product.name}</h3>
            <p className="text-xs text-gray-500">Pilih ukuran / varian</p>
          </div>
          <button type="button" onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
            ✕
          </button>
        </div>
        <div className="px-6 py-5 max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-sm text-gray-400 py-4">Memuat varian...</p>
          ) : availableVariants.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">Stok sedang habis 😔</p>
          ) : (
            <div className="space-y-2">
              {availableVariants.map(variant => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => onSelect(product, variant)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-main-500 hover:bg-main-50 transition-all text-left group"
                >
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{variant.name}</p>
                    <ArrowRight className="w-4 h-4 text-main-500 opacity-0 group-hover:opacity-100 ml-auto transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function DressingRoomLandingPage() {
  const { collection, looks: dbLooks, isLoading: looksLoading } = useDressingRoomCollection();
  const { data: drProducts = [], isLoading: productsLoading } = useDressingRoomCatalog();
  const { data: subcategories = [] } = useDressingRoomSubcategoriesBySlug('dressing-room');

  const title = collection?.title || DRESSING_ROOM_DEMO.title;
  const description = collection?.description || DRESSING_ROOM_DEMO.description;

  useSeo({
    title: `${title} · Fashion On Demand · Stage 55`,
    description,
    canonical: `${window.location.origin}/dressing-room`,
  });
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<DressingRoomCatalogProduct | null>(null);
  const [rentalProduct, setRentalProduct] = useState<DressingRoomCatalogProduct | null>(null);
  const [rentalVariant, setRentalVariant] = useState<any>(null);
  const [showRentalModal, setShowRentalModal] = useState(false);

  // Collect all model images from looks for carousel
  const carouselImages = dbLooks
    .map((look) => look.model_image_url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

  // Filtered products by selected category
  const filteredDrProducts = useMemo(() => {
    if (activeCategory === 'all') return drProducts;
    // Filter products by category_id matching the selected category
    return drProducts.filter(p => {
      if (!selectedCategoryId) return false;
      return p.dressing_room_category_id === selectedCategoryId;
    });
  }, [drProducts, activeCategory, selectedCategoryId]);

  const handleProductClick = (product: DressingRoomCatalogProduct) => {
    setSelectedProduct(product);
  };

  const handleCategoryClick = (categorySlug: string, categoryId?: number) => {
    setActiveCategory(categorySlug);
    setSelectedCategoryId(categoryId || null);
  };

  const handleVariantSelect = (product: DressingRoomCatalogProduct, variant: any) => {
    setSelectedProduct(null);
    setRentalProduct(product);
    setRentalVariant(variant);
    setShowRentalModal(true);
  };

  if (looksLoading || productsLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <PageTransition>
      <div className="bg-white">
        {/* Hero Carousel Section */}
        {carouselImages.length > 0 && (
          <HeroCarousel images={carouselImages} />
        )}

        {/* Hero Section - Enhanced */}
        <section className="relative bg-linear-to-b from-[#f6dbe6] to-white border-b border-gray-300 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 right-10 w-64 h-64 bg-main-200 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-10 w-96 h-96 bg-pink-100 rounded-full blur-3xl"></div>
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              <div className="inline-block mb-4 px-3 py-1 bg-main-100 text-main-700 rounded-full text-xs font-bold uppercase tracking-widest">
                ✨ Sewa Baju Impianmu
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-black leading-tight">
                {title}
              </h1>
              <p className="mt-6 text-base md:text-lg text-gray-700 max-w-2xl leading-relaxed italic">
                {description}
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => document.querySelector('[data-scroll-to="looks"]')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-main-500 text-white font-bold uppercase tracking-wider hover:bg-main-600 transition-colors text-sm sm:text-base rounded-lg"
                >
                  Lihat Koleksi <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-900 text-gray-900 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors text-sm sm:text-base rounded-lg"
                >
                  Pelajari Lebih <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  Pembayaran Aman
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Proses Mudah
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Heart className="w-4 h-4 text-red-500" />
                  +1000 Customer
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-white border-b border-gray-300 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-gray-500 sm:text-xs">
                Mudah & Cepat
              </p>
              <h2 className="mt-4 font-serif text-4xl italic text-gray-900 sm:text-5xl">
                Cara Kerja Rental
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
              {[
                { number: '1', title: 'Pilih Look', desc: 'Browse koleksi dan pilih look favorit Anda' },
                { number: '2', title: 'Tentukan Durasi', desc: 'Pilih berapa hari Anda ingin menyewa (1-7 hari)' },
                { number: '3', title: 'Isi Data', desc: 'Lengkapi data pribadi dan rekening bank Anda' },
                { number: '4', title: 'Bayar & Terima', desc: 'Bayar dan tunggu barang sampai ke alamat' },
              ].map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="relative text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-main-100 text-main-600 font-black text-xl mb-4">
                    {step.number}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.desc}</p>

                  {idx < 3 && (
                    <div className="hidden md:flex absolute top-8 -right-4 text-main-300">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-gray-50 border-b border-gray-300 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-gray-500 sm:text-xs">
                Keuntungan
              </p>
              <h2 className="mt-4 font-serif text-4xl italic text-gray-900 sm:text-5xl">
                Mengapa Pilih Kami?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Zap className="w-6 h-6" />,
                  title: 'Hemat Biaya',
                  desc: 'Sewa jauh lebih murah dibanding membeli. Bayar hanya untuk waktu yang Anda gunakan.',
                },
                {
                  icon: <CheckCircle2 className="w-6 h-6" />,
                  title: 'Kualitas Terjamin',
                  desc: 'Setiap item sudah dicek kondisinya. Asuransi damage protection tersedia.',
                },
                {
                  icon: <Heart className="w-6 h-6" />,
                  title: 'Berbagai Pilihan',
                  desc: '1000+ item terbaru dalam koleksi kami. Update setiap minggu dengan trends terkini.',
                },
                {
                  icon: <ShieldCheck className="w-6 h-6" />,
                  title: 'Deposit Aman',
                  desc: 'Deposit dikembalikan penuh jika tidak ada kerusakan. Proses cepat tanpa ribet.',
                },
                {
                  icon: <Zap className="w-6 h-6" />,
                  title: 'Ambil di Tempat',
                  desc: 'Ambil dan kembalikan baju langsung di studio kami. Praktis, cepat, dan pastinya hemat ongkos kirim!',
                },
                {
                  icon: <Star className="w-6 h-6" />,
                  title: 'Customer Support 24/7',
                  desc: 'Tim kami siap membantu melalui chat, email, dan WhatsApp kapan saja.',
                },
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-main-100 text-main-600 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Info Section */}
        <section className="bg-white border-b border-gray-300 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-gray-500 sm:text-xs">
                Transparansi Harga
              </p>
              <h2 className="mt-4 font-serif text-4xl italic text-gray-900 sm:text-5xl">
                Cara Perhitungan Biaya Baru
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left - Example */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-linear-to-br from-main-50 to-pink-50 rounded-2xl p-8 border border-main-200"
              >
                <h3 className="font-bold text-lg text-gray-900 mb-6">Contoh Perhitungan</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-start pb-3 border-b border-main-200">
                    <div>
                      <p className="font-semibold text-gray-900">Baju Pilihanmu</p>
                      <p className="text-sm text-gray-600">Harga produk asli tidak dihitung</p>
                    </div>
                    <p className="font-bold text-gray-400 line-through">Rp XXX.XXX</p>
                  </div>

                  <div className="flex justify-between items-start pb-3 border-b border-main-200">
                    <div>
                      <p className="font-semibold text-gray-900">Sewa (35.000/hari × 3 hari)</p>
                      <p className="text-sm text-gray-600">Biaya rental per item</p>
                    </div>
                    <p className="font-bold text-gray-900">Rp 105.000</p>
                  </div>

                  <div className="flex justify-between items-start pb-3 border-b border-main-200">
                    <div>
                      <p className="font-semibold text-gray-900">Deposit</p>
                      <p className="text-sm text-gray-600">Jaminan kondisi barang (fixed per item)</p>
                    </div>
                    <p className="font-bold text-yellow-700">Rp 50.000</p>
                  </div>

                  <div className="flex justify-between items-start pt-3">
                    <p className="font-black text-gray-900">TOTAL DIBAYAR</p>
                    <p className="text-2xl font-black text-main-600">Rp 155.000</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 text-xs text-gray-600 space-y-1">
                  <p>📝 Deposit dikembalikan saat pengembalian jika:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Tidak ada noda atau kerusakan</li>
                    <li>Kembali tepat waktu</li>
                    <li>Semua aksesoris lengkap</li>
                  </ul>
                </div>
              </motion.div>

              {/* Right - Rules */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 text-sm mb-2">💡 Durasi Sewa</h4>
                  <p className="text-sm text-blue-800">Mulai dihitung sejak pembayaran selesai, jam yang sama. Contoh: bayar jam 10.00 → kembali besok jam 10.00 untuk 1 hari sewa.</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-bold text-yellow-900 text-sm mb-2">⚠️ Keterlambatan</h4>
                  <p className="text-sm text-yellow-800">Telat Rp 10.000/jam. Contoh: kembali 2 jam telat = Rp 20.000 dari deposit.</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-bold text-red-900 text-sm mb-2">🚨 Kerusakan</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Noda kecil: -Rp 10.000</li>
                    <li>• Kancing copot: -Rp 10.000</li>
                    <li>• Rusak parah: Deposit hangus</li>
                    <li>• Jika kerusakan {'>'} deposit → bayar selisih</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-green-900 text-sm mb-2">✅ Pengalaman Lancar</h4>
                  <p className="text-sm text-green-800">Lihat item dengan baik sebelum menerima. Foto kondisi awal jika perlu sebagai bukti. Hubungi support jika ada pertanyaan!</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Looks Grid Section */}
        <section className="bg-gray-50 border-b border-gray-300 py-16 sm:py-24" data-scroll-to="looks">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-gray-500 sm:text-xs">
                Koleksi Kami
              </p>
              <h2 className="mt-4 font-serif text-4xl italic text-gray-900 sm:text-5xl">
                Pilih Produk Favoritmu
              </h2>
              <p className="mt-4 text-gray-600 max-w-2xl">
                Ribuan koleksi fashion pilihan tersedia untuk disewa. Dari dress, jeans, outer, hingga aksesoris - semua ada di sini!
              </p>
            </div>

            {/* Category filter tabs */}
            {subcategories.length > 0 && (
              <div className="mb-8 sticky top-0 bg-gray-50 z-40 pt-4 pb-2 -mt-6">
                <div className="flex overflow-x-auto hide-scrollbar gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryClick('all')}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-300 ${
                      activeCategory === 'all'
                        ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-lg shadow-pink-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                    }`}
                  >
                    Semua
                  </button>
                  {subcategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryClick(cat.slug, cat.id)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border capitalize transition-all duration-300 ${
                        activeCategory === cat.slug
                          ? 'bg-[#ff4b86] text-white border-[#ff4b86] shadow-lg shadow-pink-200'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff4b86] hover:text-[#ff4b86]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredDrProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Belum ada produk tersedia saat ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredDrProducts.map((product) => (
                  <DressingRoomProductCard
                    key={product.id}
                    product={product}
                    onClick={() => handleProductClick(product)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white border-b border-gray-300 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-gray-500 sm:text-xs">
                Pertanyaan Umum
              </p>
              <h2 className="mt-4 font-serif text-4xl italic text-gray-900 sm:text-5xl">
                FAQ
              </h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: 'Apakah baju sudah dicuci sebelum diterima?',
                  a: 'Ya, semua item sudah dicuci dan diseterika. Kami memastikan Anda mendapat baju dalam kondisi bersih dan siap pakai.',
                },
                {
                  q: 'Bagaimana jika baju rusak saat saya gunakan?',
                  a: 'Deposit Anda akan dikurangi sesuai tingkat kerusakan. Kerusakan kecil dipotong Rp 10.000, kerusakan parah maka deposit hangus penuh.',
                },
                {
                  q: 'Bisa perpanjang durasi sewa?',
                  a: 'Tentu! Hubungi customer service kami minimal H-1 sebelum tanggal pengembalian. Biaya akan dihitung dan dikirim invoice tambahan.',
                },
                {
                  q: 'Bagaimana cara pengambilan baju?',
                  a: 'Sewa baju kami hanya melayani "Ambil di Tempat" (Pickup in Store). Silakan datang langsung ke studio kami pada tanggal sewa yang dipilih untuk mengambil dan mencoba baju Anda.',
                },
                {
                  q: 'Apakah ada asuransi kerusakan?',
                  a: 'Deposit berfungsi sebagai asuransi. Selain itu, kami juga menerima custom insurance untuk tambahan perlindungan jika dibutuhkan.',
                },
              ].map((faq, idx) => (
                <FAQItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-linear-to-r from-main-600 to-pink-600 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                Siap Sewa Baju Impianmu?
              </h2>
              <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
                Jangan lewatkan kesempatan untuk terlihat menakjubkan dengan harga yang terjangkau. Pilih look favorit Anda sekarang!
              </p>
              <button
                type="button"
                onClick={() => document.querySelector('[data-scroll-to="looks"]')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-main-600 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors text-sm sm:text-base rounded-lg"
              >
                Lihat Koleksi Lengkap <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Variant Picker */}
        {selectedProduct && (
          <VariantPickerModal
            product={selectedProduct}
            onSelect={handleVariantSelect}
            onClose={() => setSelectedProduct(null)}
          />
        )}

        {/* Rental Flow Modal */}
        {rentalProduct && rentalVariant && showRentalModal && (
          <RentalFlowModal
            product={rentalProduct}
            variant={rentalVariant}
            isOpen={showRentalModal}
            onClose={() => {
              setShowRentalModal(false);
              setRentalProduct(null);
              setRentalVariant(null);
            }}
          />
        )}
      </div>
    </PageTransition>
  );
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      className="border border-gray-200 rounded-lg overflow-hidden"
      initial={false}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-start justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <span className="font-bold text-gray-900 pr-4">{question}</span>
        <span className={`text-main-500 font-bold shrink-0 transition-transform ${isOpen ? 'rotate-45' : ''}` }>
          +
        </span>
      </button>
      
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="px-6 py-4 bg-gray-50 text-gray-600 border-t border-gray-200 text-sm leading-relaxed">
          {answer}
        </div>
      </motion.div>
    </motion.div>
  );
}


