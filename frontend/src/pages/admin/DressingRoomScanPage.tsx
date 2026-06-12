import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Phone, Calendar, Clock, Package, CheckCircle2, XCircle, Loader2, RefreshCw, Scan } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/formatters';

interface RentalOrderItem {
  id: number;
  product_name: string;
  quantity: number;
  daily_rate: number;
  item_deposit_amount: number;
  total_rental_cost: number;
  current_status: string | null;
}

interface FoundOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  status: string;
  rental_start_time: string;
  rental_end_time: string;
  duration_days: number;
  total_rental_cost: number;
  total_deposit: number;
  total_amount: number;
  items: RentalOrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Bayar', color: 'bg-yellow-100 text-yellow-800' },
  paid:             { label: 'Sudah Bayar – Siap Ambil', color: 'bg-blue-100 text-blue-800' },
  active:           { label: 'Aktif (Sedang Disewa)', color: 'bg-green-100 text-green-800' },
  overdue:          { label: 'Telat Kembalikan', color: 'bg-red-100 text-red-800' },
  returned:         { label: 'Sudah Dikembalikan', color: 'bg-purple-100 text-purple-800' },
  cancelled:        { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-800' },
};

export default function DressingRoomScanPage() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const menuSections = useAdminMenuSections();

  const [showScanner, setShowScanner] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState<FoundOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activateSuccess, setActivateSuccess] = useState(false);

  // ─── Lookup order by order_number ──────────────────────────────────────────
  const lookupOrder = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setFoundOrder(null);
    setNotFound(false);
    setActivateSuccess(false);

    try {
      const { data, error } = await supabase
        .from('rental_orders')
        .select('id, order_number, customer_name, customer_phone, customer_email, status, rental_start_time, rental_end_time, duration_days, total_rental_cost, total_deposit, total_amount')
        .or(`order_number.ilike.%${trimmed}%,customer_phone.ilike.%${trimmed}%`)
        .limit(1)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }

      // Fetch items
      const { data: itemsData } = await supabase
        .from('rental_order_items')
        .select('id, product_name, quantity, daily_rate, item_deposit_amount, total_rental_cost, current_status')
        .eq('rental_order_id', data.id);

      setFoundOrder({ ...data, items: itemsData || [] });
    } catch (err) {
      showToast('error', 'Gagal mencari order. Coba lagi.');
    } finally {
      setIsSearching(false);
    }
  }, [showToast]);

  const handleScanSuccess = useCallback((result: string) => {
    setShowScanner(false);
    setManualInput(result);
    lookupOrder(result);
    showToast('success', `QR berhasil di-scan: ${result}`);
  }, [lookupOrder, showToast]);

  // ─── Confirm Pickup: status → active, items → rented ───────────────────────
  const handleConfirmPickup = async () => {
    if (!foundOrder) return;

    if (foundOrder.status !== 'paid' && foundOrder.status !== 'awaiting_payment') {
      showToast('error', `Order tidak bisa diaktifkan. Status saat ini: ${STATUS_CONFIG[foundOrder.status]?.label ?? foundOrder.status}`);
      return;
    }

    setIsActivating(true);
    try {
      // 1. Update order status to active
      const { error: orderErr } = await supabase
        .from('rental_orders')
        .update({ status: 'active' })
        .eq('id', foundOrder.id);

      if (orderErr) throw orderErr;

      // 2. Update all items current_status to 'rented'
      const { error: itemsErr } = await supabase
        .from('rental_order_items')
        .update({ current_status: 'rented', status_updated_at: new Date().toISOString() })
        .eq('rental_order_id', foundOrder.id);

      if (itemsErr) throw itemsErr;

      // 3. Insert status history for each item
      for (const item of foundOrder.items) {
        await supabase.from('rental_item_status_history').insert({
          rental_order_id: foundOrder.id,
          rental_order_item_id: item.id,
          status: 'rented',
          previous_status: item.current_status,
          reason: 'Barang diambil oleh customer',
        });
      }

      setActivateSuccess(true);
      setFoundOrder(prev => prev ? { ...prev, status: 'active', items: prev.items.map(i => ({ ...i, current_status: 'rented' })) } : null);
      showToast('success', `Order ${foundOrder.order_number} berhasil diaktifkan! Baju sudah diambil.`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal mengaktifkan order. Periksa console.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleReset = () => {
    setFoundOrder(null);
    setNotFound(false);
    setManualInput('');
    setActivateSuccess(false);
  };

  return (
    <AdminLayout
      title="Scan & Pickup Dressing Room"
      subtitle="Scan QR atau cari nomor order untuk konfirmasi pengambilan baju"
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="dressing-room-scan"
      onLogout={signOut}
    >
      <div className="max-w-2xl mx-auto space-y-6">

        {/* QR Scanner Modal */}
        <QRScannerModal
          isOpen={showScanner}
          title="Scan QR Code Order"
          closeOnSuccess={true}
          closeOnError={false}
          onScan={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />

        {/* ── Search Panel ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Scan className="w-5 h-5 text-main-600" />
            Cari Order
          </h3>

          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-5 py-3 bg-main-600 text-white rounded-xl font-semibold hover:bg-main-700 transition-colors shadow-sm"
            >
              <Scan className="w-5 h-5" />
              Scan QR
            </button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupOrder(manualInput)}
                placeholder="Nomor order atau No. HP customer..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-main-500 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => lookupOrder(manualInput)}
              disabled={!manualInput.trim() || isSearching}
              className="px-5 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cari'}
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-3 py-8 text-gray-500"
            >
              <Loader2 className="w-6 h-6 animate-spin text-main-500" />
              <span>Mencari order...</span>
            </motion.div>
          )}

          {/* ── Not Found ── */}
          {notFound && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4"
            >
              <XCircle className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <p className="font-bold text-red-900">Order tidak ditemukan</p>
                <p className="text-sm text-red-700 mt-1">Pastikan nomor order atau no. HP benar. Coba scan ulang QR.</p>
              </div>
            </motion.div>
          )}

          {/* ── Found Order ── */}
          {foundOrder && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest">Order Ditemukan</p>
                  <h2 className="text-xl font-black text-gray-900">{foundOrder.order_number}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[foundOrder.status]?.color ?? 'bg-gray-100 text-gray-800'}`}>
                    {STATUS_CONFIG[foundOrder.status]?.label ?? foundOrder.status}
                  </span>
                  <button type="button" onClick={handleReset} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-semibold">{foundOrder.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{foundOrder.customer_phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Mulai: {new Date(foundOrder.rental_start_time).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Kembali: {new Date(foundOrder.rental_end_time).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Item yang Disewa</p>
                  <div className="space-y-2">
                    {foundOrder.items.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Tidak ada item ditemukan.</p>
                    ) : foundOrder.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                            <p className="text-xs text-gray-500">Qty {item.quantity} × {formatCurrency(item.daily_rate)}/hari</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(item.total_rental_cost)}</p>
                          {item.current_status && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              item.current_status === 'rented' ? 'bg-green-100 text-green-700'
                              : item.current_status === 'returned' ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                            }`}>
                              {item.current_status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="bg-gradient-to-br from-main-50 to-pink-50 rounded-xl p-4 border border-main-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Sewa</span>
                    <span className="font-semibold">{formatCurrency(foundOrder.total_rental_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deposit</span>
                    <span className="font-semibold text-yellow-700">{formatCurrency(foundOrder.total_deposit)}</span>
                  </div>
                  <div className="border-t border-main-200 pt-2 flex justify-between">
                    <span className="font-black text-gray-900">Total Bayar</span>
                    <span className="text-lg font-black text-main-600">{formatCurrency(foundOrder.total_amount)}</span>
                  </div>
                </div>

                {/* Activate Success */}
                {activateSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4"
                  >
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    <div>
                      <p className="font-bold text-green-900">Pengambilan Berhasil Dikonfirmasi!</p>
                      <p className="text-sm text-green-700">Status order diubah ke <strong>Aktif</strong>. Semua item sudah berstatus <strong>Rented</strong>.</p>
                    </div>
                  </motion.div>
                )}

                {/* Action: Confirm Pickup */}
                {(foundOrder.status === 'paid' || foundOrder.status === 'awaiting_payment') && !activateSuccess && (
                  <button
                    type="button"
                    onClick={handleConfirmPickup}
                    disabled={isActivating}
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-base hover:bg-green-700 transition-colors flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-green-200"
                  >
                    {isActivating
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</>
                      : <><CheckCircle2 className="w-5 h-5" /> Konfirmasi Pengambilan Baju</>
                    }
                  </button>
                )}

                {foundOrder.status === 'active' && !activateSuccess && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-sm text-blue-800 font-semibold">Order ini sudah aktif – baju sudah diambil.</p>
                  </div>
                )}

                {(foundOrder.status === 'returned' || foundOrder.status === 'refunded') && (
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
                    <p className="text-sm text-gray-600 font-semibold">Order ini sudah selesai / dikembalikan.</p>
                  </div>
                )}

                {foundOrder.status === 'cancelled' && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-700 font-semibold">Order ini telah dibatalkan.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
