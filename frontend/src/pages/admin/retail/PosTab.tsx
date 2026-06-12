import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProductSummaries } from '../../../hooks/useProducts';
import { useToast } from '../../../components/Toast';
import { invokeSupabaseFunction } from '../../../lib/supabaseFunctionInvoke';
import { formatCurrency } from '../../../utils/formatters';
import type { CreateCashierOrderResponse } from '../../product-checkout/checkoutTypes';
import type { Session } from '@supabase/supabase-js';
import { queryKeys } from '../../../lib/queryKeys';

export default function PosTab({ session }: { session: Session | null }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useProductSummaries();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const [cart, setCart] = useState<Array<{ variantId: number; name: string; price: number; quantity: number }>>([]);
  const [customerName, setCustomerName] = useState('Customer Kasir');
  const [customerEmail, setCustomerEmail] = useState('kasir-retail@spark.local');
  const [staffName, setStaffName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addToCart = (product: any) => {
    if (!product.defaultVariantId) {
      showToast('error', 'Produk ini tidak memiliki varian aktif');
      return;
    }
    
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === product.defaultVariantId);
      if (existing) {
        return prev.map((item) =>
          item.variantId === product.defaultVariantId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          variantId: product.defaultVariantId,
          name: `${product.name}${product.defaultVariantName ? ` - ${product.defaultVariantName}` : ''}`,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (variantId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.variantId === variantId ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('error', 'Keranjang kosong');
      return;
    }
    if (!customerName.trim() || !customerEmail.trim()) {
      showToast('error', 'Nama dan Email pelanggan harus diisi');
      return;
    }
    if (!staffName.trim()) {
      showToast('error', 'Nama Staff (Kasir) wajib diisi untuk pelacakan penjualan');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productVariantId: item.variantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      const response = await invokeSupabaseFunction<CreateCashierOrderResponse>({
        functionName: 'create-cashier-product-order',
        body: {
          items: itemsPayload,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          staffName: staffName.trim(),
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
        fallbackMessage: 'Gagal membuat pesanan kasir',
      });

      if (response && response.order_number) {
        showToast('success', `Pesanan ${response.order_number} berhasil dibuat!`);
        setCart([]);
        setCustomerName('Customer Kasir');
        setCustomerEmail('kasir-retail@spark.local');
        // setStaffName(''); // Opsional: hapus baris ini jika ingin nama staff tetap
        // Force-refresh data Laporan Staff tanpa menunggu Realtime
        void queryClient.invalidateQueries({ queryKey: queryKeys.productOrders() });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('error', err instanceof Error ? err.message : 'Gagal memproses pesanan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Product List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-black text-gray-900">Daftar Produk</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {paginatedProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Tidak ada produk yang cocok dengan pencarian.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {paginatedProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="flex flex-col text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-[#ff4b86] hover:shadow-md transition-all group"
                    >
                      <div className="aspect-square w-full rounded-lg bg-gray-100 mb-3 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <span className="material-symbols-outlined text-4xl text-gray-400">inventory_2</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">{product.name}</p>
                      <p className="text-[#ff4b86] font-black mt-auto">Rp {formatCurrency(product.price)}</p>
                    </button>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <span className="text-sm font-bold text-gray-700">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
          <h3 className="text-lg font-black text-gray-900 mb-4">Detail Penjualan</h3>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Staff (Kasir) *</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Misal: Budi / Shift 1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Customer</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Customer</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mb-4">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Keranjang ({cart.reduce((s, i) => s + i.quantity, 0)})</h4>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Belum ada produk</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.variantId} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">Rp {formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.variantId, -1)} className="w-6 h-6 flex items-center justify-center rounded bg-white text-gray-700 shadow-sm hover:bg-gray-50">
                        <span className="material-symbols-outlined text-[14px]">remove</span>
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.variantId, 1)} className="w-6 h-6 flex items-center justify-center rounded bg-white text-gray-700 shadow-sm hover:bg-gray-50">
                        <span className="material-symbols-outlined text-[14px]">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-gray-700">Total Tagihan</span>
              <span className="text-xl font-black text-[#ff4b86]">Rp {formatCurrency(subtotal)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isSubmitting || cart.length === 0 || !staffName.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ff4b86] px-4 py-3 text-sm font-bold text-white hover:bg-[#ff3d73] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
              )}
              {isSubmitting ? 'Memproses...' : 'Proses Penjualan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
