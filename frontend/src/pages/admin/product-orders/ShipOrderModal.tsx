import { useState } from 'react';
import type { ProductOrderDetails } from './productOrdersTypes';

type ShipOrderModalProps = {
  isOpen: boolean;
  orderDetails: ProductOrderDetails | null;
  onClose: () => void;
  onShip: (trackingNumber: string) => Promise<void>;
  submitting: boolean;
};

export function ShipOrderModal({
  isOpen,
  orderDetails,
  onClose,
  onShip,
  submitting,
}: ShipOrderModalProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !orderDetails) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      setError('Nomor resi wajib diisi');
      return;
    }

    if (trimmed.length < 8) {
      setError('Nomor resi minimal 8 karakter');
      return;
    }

    try {
      await onShip(trimmed);
      setTrackingNumber('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menandai order sebagai dikirim');
    }
  };

  const handleClose = () => {
    setTrackingNumber('');
    setError(null);
    onClose();
  };

  const order = orderDetails.order;
  const courier = order.shipping_courier?.toUpperCase() || 'COURIER';
  const service = order.shipping_service?.toUpperCase() || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-rose-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Kirim Pesanan</h2>
              <p className="text-sm opacity-90 mt-1">{order.order_number}</p>
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Shipping Info */}
          <div className="bg-rose-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-semibold">
              <span className="material-symbols-outlined text-[20px]">local_shipping</span>
              <span>Info Pengiriman</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-rose-800">
                <span className="font-medium">Kurir:</span> {courier} {service}
              </p>
              <p className="text-rose-800">
                <span className="font-medium">Ongkir:</span> Rp{' '}
                {(order.shipping_cost || 0).toLocaleString('id-ID')}
              </p>
              {order.shipping_address && (
                <p className="text-rose-700 text-xs mt-2">
                  <span className="material-symbols-outlined text-[14px] align-middle">location_on</span>{' '}
                  {order.shipping_address}
                </p>
              )}
            </div>
          </div>

          {/* Tracking Number Input */}
          <div>
            <label htmlFor="trackingNumber" className="block text-sm font-semibold text-rose-900 mb-2">
              Nomor Resi / AWB <span className="text-red-500">*</span>
            </label>
            <input
              id="trackingNumber"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              disabled={submitting}
              placeholder="Contoh: JNE1234567890123"
              className="w-full px-4 py-3 border-2 border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
              autoFocus
              maxLength={50}
            />
            <p className="text-xs text-gray-600 mt-1">
              Masukkan nomor resi dari {courier} untuk tracking pengiriman
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !trackingNumber.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-rose-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">send</span>
                  <span>Kirim Order</span>
                </>
              )}
            </button>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[20px]">info</span>
            <p className="text-xs text-blue-800">
              Setelah order ditandai dikirim, customer akan menerima notifikasi dengan nomor resi untuk tracking
              pengiriman.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
