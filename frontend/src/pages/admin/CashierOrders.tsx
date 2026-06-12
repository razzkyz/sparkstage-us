import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, CASHIER_MENU_SECTIONS } from '../../constants/adminMenu';
import { getMenuSectionsByRole } from '../../utils/auth';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import type { AdminMenuSection } from '../../components/AdminLayout';

interface OrderDetail {
  id: string;
  order_number: string;
  user_id: string;
  total_price: number;
  payment_status: string;
  created_at: string;
  order_items?: Array<{ id: string; event_id: string; quantity: number; price: number }>;
  order_product_items?: Array<{ id: string; product_id: string; quantity: number; price: number }>;
}

export default function CashierOrders() {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [menuSections, setMenuSections] = useState<AdminMenuSection[]>(CASHIER_MENU_SECTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    const loadMenuSections = async () => {
      const sections = await getMenuSectionsByRole(user?.id);
      setMenuSections(sections);
    };
    loadMenuSections();
  }, [user?.id]);

  const searchOrders = async (query: string) => {
    if (!query.trim()) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    try {
      // Search by order number or user email
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(
          `
          id,
          order_number,
          user_id,
          total_price,
          payment_status,
          created_at,
          order_items (id, event_id, quantity, price),
          order_product_items (id, product_id, quantity, price)
        `
        )
        .or(`order_number.ilike.%${query}%`);

      if (orderError) throw orderError;

      setOrders((orderData as OrderDetail[]) || []);

      if (!orderData || orderData.length === 0) {
        showToast('info', 'Pesanan tidak ditemukan');
      }
    } catch (err) {
      console.error('Search error:', err);
      showToast('error', 'Gagal mencari pesanan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchOrders(searchQuery);
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'unknown';
    switch (statusLower) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    const statusLower = status?.toLowerCase() || 'unknown';
    switch (statusLower) {
      case 'paid':
        return 'Terbayar';
      case 'pending':
        return 'Menunggu';
      case 'failed':
        return 'Gagal';
      default:
        return status || 'Tidak Diketahui';
    }
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="cashier-orders"
      title="Cek Pesanan"
      subtitle="Cari dan lihat detail pesanan customer"
      onLogout={signOut}
    >
      {/* Search Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">🔍 Cari Pesanan</h3>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Masukkan nomor pesanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-[#ff4b86] px-6 py-2 text-sm font-bold text-white hover:bg-[#ff3d73] transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Mencari...' : 'Cari'}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {orders.length > 0 && (
          <>
            <h3 className="text-lg font-black text-gray-900">Hasil Pencarian ({orders.length})</h3>
            <div className="grid gap-4">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="rounded-xl border border-gray-200 bg-white p-4 hover:border-[#ff4b86] hover:shadow-md transition-all text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-lg font-bold text-gray-900">#{order.order_number}</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${getPaymentStatusBadge(order.payment_status)}`}>
                          {getPaymentStatusLabel(order.payment_status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Total: <span className="font-bold text-gray-900">Rp {formatCurrency(order.total_price)}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Items:</p>
                      <p className="text-lg font-bold text-gray-900">
                        {((order.order_items?.length || 0) + (order.order_product_items?.length || 0))}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {orders.length === 0 && searchQuery && !isLoading && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">Pesanan tidak ditemukan</p>
          </div>
        )}

        {orders.length === 0 && !searchQuery && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">Masukkan nomor pesanan untuk mencari</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Pesanan #{selectedOrder.order_number}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {formatRelativeTime(selectedOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <h4 className="text-sm font-bold text-gray-600 uppercase mb-2">Status Pembayaran</h4>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${getPaymentStatusBadge(selectedOrder.payment_status)}`}>
                  {getPaymentStatusLabel(selectedOrder.payment_status)}
                </div>
              </div>

              {/* Total */}
              <div>
                <h4 className="text-sm font-bold text-gray-600 uppercase mb-2">Total Pesanan</h4>
                <p className="text-3xl font-black text-gray-900">Rp {formatCurrency(selectedOrder.total_price)}</p>
              </div>

              {/* Tiket Items */}
              {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-600 uppercase mb-3">🎫 Tiket ({selectedOrder.order_items.length})</h4>
                  <div className="space-y-2">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3 flex justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Event ID: {item.event_id}</p>
                          <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-bold text-gray-900">Rp {formatCurrency(item.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Items */}
              {selectedOrder.order_product_items && selectedOrder.order_product_items.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-600 uppercase mb-3">🛍️ Produk ({selectedOrder.order_product_items.length})</h4>
                  <div className="space-y-2">
                    {selectedOrder.order_product_items.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3 flex justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Product ID: {item.product_id}</p>
                          <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-bold text-gray-900">Rp {formatCurrency(item.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full rounded-lg bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
