import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import QRCode from 'react-qr-code';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000; // stop polling after 10 minutes

export default function RentalSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(Date.now());

  const fetchOrder = async () => {
    if (!orderNumber) return;
    try {
      const { data, err } = await supabase
        .from('rental_orders')
        .select('id, order_number, status, payment_status, total_amount, total_deposit, customer_name, customer_phone, start_time, end_time')
        .eq('order_number', orderNumber)
        .maybeSingle() as any;

      if (err) throw err;
      if (!data) throw new Error('Order tidak ditemukan');

      setOrder(data);

      // Stop polling once paid or active
      const paid = data.payment_status === 'paid' || ['paid', 'active'].includes(data.status);
      if (paid && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Start polling for payment status update
    pollRef.current = setInterval(async () => {
      // Stop polling after timeout
      if (Date.now() - startRef.current > POLL_TIMEOUT_MS) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        return;
      }
      await fetchOrder();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <div className="text-red-500 mb-4 flex justify-center">
            <span className="material-symbols-outlined text-5xl">error</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-500 mb-6">{error || 'Pesanan tidak ditemukan'}</p>
          <button
            onClick={() => navigate('/dressing-room')}
            className="w-full py-3 bg-main-500 text-white rounded-xl font-bold"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const isPaid   = order.payment_status === 'paid' || ['paid', 'active'].includes(order.status);
  const isActive = order.status === 'active';
  const qrValue  = `${window.location.origin}/admin/rental-scanner?order_number=${order.order_number}`;

  return (
    <div className="min-h-screen bg-[#fcf9f9] py-12 px-4">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 mb-5 rounded-full bg-main-50 text-main-500 shadow-sm border border-main-100">
            <span className="material-symbols-outlined text-5xl">
              {isActive ? 'checkroom' : isPaid ? 'check_circle' : 'hourglass_empty'}
            </span>
          </div>
          <h1 className="text-[#1c0d0d] tracking-tight text-3xl md:text-4xl font-bold leading-tight pb-2 font-display">
            {isActive
              ? 'Pakaian Sedang Disewa'
              : isPaid
                ? 'Pembayaran Berhasil'
                : 'Menunggu Pembayaran'}
          </h1>
          <p className="text-main-700 text-base md:text-lg font-medium px-4">
            Order ID: {order.order_number}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-[#f4e7e7] overflow-hidden max-w-lg mx-auto">
          <div className="p-8">

            {/* Pending indicator */}
            {!isPaid && (
              <div className="flex flex-col items-center justify-center mb-8 p-6 bg-main-50 border border-main-100 rounded-2xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-main-500 mb-4" />
                <p className="text-main-800 font-semibold text-center">
                  Menunggu konfirmasi dari DOKU...
                </p>
                <p className="text-main-600 text-sm text-center mt-1">
                  Selesaikan pembayaran Anda di layar DOKU. Halaman ini akan otomatis diperbarui.
                </p>
              </div>
            )}

            {isPaid && !isActive && (
              <p className="text-center text-[#9c4949] mb-6 font-medium">
                Hai <strong className="text-[#1c0d0d]">{order.customer_name}</strong>, pembayaran Anda telah diterima. Tunjukkan QR Code di bawah kepada Admin Studio saat mengambil pakaian.
              </p>
            )}

            {isActive && (
              <p className="text-center text-[#9c4949] mb-6 font-medium">
                Hai <strong className="text-[#1c0d0d]">{order.customer_name}</strong>, pakaian sudah berhasil diambil. Jangan lupa kembalikan sesuai durasi sewa ya!
              </p>
            )}

            {/* QR Code – only shown after payment confirmed */}
            {isPaid && !isActive && (
              <div className="flex flex-col items-center mb-10">
                <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-main-100 inline-block mb-3">
                  <QRCode value={qrValue} size={200} fgColor="#1c0d0d" />
                </div>
                <div className="bg-main-50 rounded-full px-4 py-1.5 text-main-700 text-xs font-bold tracking-widest uppercase border border-main-100">
                  Siap Diambil
                </div>
              </div>
            )}

            {/* Active / Disewa state */}
            {isActive && (
              <div className="flex flex-col items-center mb-10">
                <div className="bg-main-50 border border-main-200 rounded-2xl p-6 text-center w-full">
                  <span className="material-symbols-outlined text-4xl text-main-600 mb-2">inventory_2</span>
                  <p className="text-lg font-black text-main-900">Pakaian ada pada Anda</p>
                  <p className="text-sm text-main-700 mt-1">Status: <strong>Sedang Disewa</strong></p>
                </div>
              </div>
            )}

            {/* Order summary */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-2">Detail Pesanan</h3>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#9c4949]">Nama Penyewa</span>
                <span className="font-bold text-[#1c0d0d]">{order.customer_name}</span>
              </div>
              {order.customer_phone && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#9c4949]">No Handphone</span>
                  <span className="font-bold text-[#1c0d0d]">{order.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#9c4949]">Mulai Sewa</span>
                <span className="font-bold text-[#1c0d0d]">
                  {new Date(order.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#9c4949]">Selesai Sewa</span>
                <span className="font-bold text-[#1c0d0d]">
                  {new Date(order.end_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-gray-200">
                <span className="text-[#9c4949]">Deposit (Refundable)</span>
                <span className="font-bold text-main-500">Rp {(order.total_deposit ?? 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[#1c0d0d] font-bold text-base">Total Bayar</span>
                <span className="text-main-600 font-black text-xl">Rp {(order.total_amount ?? 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/dressing-room')}
              className="w-full mt-10 py-4 bg-main-500 text-white rounded-xl font-bold hover:bg-main-600 transition-colors shadow-sm"
            >
              Kembali ke Katalog Pakaian
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-12 text-[#9c4949]/60 text-xs tracking-widest uppercase px-4">
          Spark Stage • Premium Dressing Room
        </div>
      </div>
    </div>
  );
}
