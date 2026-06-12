import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { useUserRole } from '../../hooks/useUserRole';
import { completeProductPickup } from './product-pickup/completeProductPickup';

const ProductPickup = () => {
  const { signOut, session } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validating, setValidating] = useState(false);
  const [scanSequenceNumber, setScanSequenceNumber] = useState<string | undefined>(undefined);
  const [scanDescription, setScanDescription] = useState<string | undefined>(undefined);
  const [lastScanResult, setLastScanResult] = useState<{
    type: 'success' | 'error';
    message: string;
    pickupInfo?: {
      orderId: number;
      pickupCode: string;
      pickupStatus: string;
    };
  } | null>(null);
  const menuSections = useAdminMenuSections();
  const { role } = useUserRole();
  // kasir menu uses 'product-scan' as id, admin/dressing_room uses 'product-pickup'
  const activeMenuId = role === 'kasir' ? 'product-scan' : 'product-pickup';

  const completePickup = useCallback(
    async (rawCode: string): Promise<void> => {
      const code = rawCode.trim();
      if (!code) throw new Error('Kode QR kosong');
      if (validating) throw new Error('Sedang memproses pickup lain');

      // Filter untuk pickup code product (PRX-)
      // Pickup code biasanya format: PRX-XXXXX atau alphanumeric lain
      // Tidak strict filter karena pickup code bisa format apapun dari generate_pickup_code RPC
      // Tapi kita bisa reject jika jelas ticket code (TKT-)
      if (code.startsWith('TKT-')) {
        throw new Error('Kode ini adalah tiket masuk, gunakan menu "Scan Tiket Masuk"');
      }

      setValidating(true);
      setLastScanResult(null);
      setScanSequenceNumber(undefined);
      setScanDescription(undefined);

      try {
        const result = await completeProductPickup({
          pickupCode: code,
          session,
        });

        setScanSequenceNumber(result.pickupCode);
        setScanDescription(`Order #${result.orderId} - ${result.pickupStatus}`);

        setLastScanResult({
          type: 'success',
          message: 'Pickup produk berhasil diselesaikan!',
          pickupInfo: {
            orderId: result.orderId ?? 0,
            pickupCode: result.pickupCode,
            pickupStatus: result.pickupStatus,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal menyelesaikan pickup';
        setLastScanResult({ type: 'error', message });
        console.error('Pickup error:', err);
      } finally {
        setShowScanner(false);
        setShowValidationPopup(true);
        setValidating(false);
      }
    },
    [session, validating]
  );

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId={activeMenuId}
      title="Scan Pickup Produk"
      onLogout={signOut}
    >
      {/* Scanner Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">Scan Pickup Produk</h3>
            <p className="text-sm text-gray-600">Pindai kode QR pickup untuk menyelesaikan pengambilan produk</p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200">
            Siap Memindai
          </span>
        </div>

        {/* Scan Result Banner */}
        {lastScanResult && (
          <div
            className={`rounded-lg border px-4 md:px-6 py-4 mb-6 ${lastScanResult.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
              }`}
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-2xl flex-shrink-0">
                {lastScanResult.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base mb-1">{lastScanResult.message}</p>
                {lastScanResult.pickupInfo && (
                  <div className="text-sm space-y-1 mt-3">
                    <p><span className="font-semibold">Order ID:</span> {lastScanResult.pickupInfo.orderId}</p>
                    <p><span className="font-semibold">Pickup Code:</span> {lastScanResult.pickupInfo.pickupCode}</p>
                    <p><span className="font-semibold">Status:</span> {lastScanResult.pickupInfo.pickupStatus}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scanner Button */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 p-8 md:p-12 flex flex-col items-center justify-center text-center hover:border-main-500 transition-colors">
          <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-gray-200">
            <span className="material-symbols-outlined text-4xl text-primary">qr_code_scanner</span>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Scan Pickup Produk</h4>
          <p className="text-sm text-gray-600 max-w-md mb-6">
            Klik tombol di bawah untuk mengaktifkan kamera dan pindai kode QR pickup pada pesanan produk.
          </p>
          <button
            onClick={() => setShowScanner(true)}
            disabled={validating}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff4b86] text-white text-sm font-bold rounded-lg shadow-md hover:bg-[#ff6a9a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
            {validating ? 'Memproses...' : 'Aktifkan Pemindai'}
          </button>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex gap-4 items-start mb-4">
          <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0">info</span>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Cara Menggunakan</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Klik "Aktifkan Pemindai" untuk membuka kamera</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Arahkan kamera ke kode QR pickup pada pesanan produk</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Tunggu proses pickup otomatis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Pesan hijau = Pickup berhasil, Pesan merah = Pickup gagal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Setelah scan berhasil, scanner akan tetap terbuka untuk scan berikutnya</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        title="Scan Pickup Produk"
        closeOnSuccess={false}
        closeOnError={false}
        autoResumeAfterMs={3000}
        sequenceNumber={scanSequenceNumber}
        description={scanDescription}
        onScan={async (decodedText) => {
          await completePickup(decodedText);
        }}
      />

      {/* Validation Result Popup */}
      {showValidationPopup && lastScanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Hasil Pickup Produk</h3>
              <button
                type="button"
                onClick={() => setShowValidationPopup(false)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div
              className={`rounded-lg border px-4 py-4 mb-4 ${lastScanResult.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
                }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-3xl">
                  {lastScanResult.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <p className="font-bold text-lg">{lastScanResult.message}</p>
              </div>

              {lastScanResult.pickupInfo && (
                <div className="text-sm space-y-2 mt-4 border-t border-gray-200 pt-4">
                  <p><span className="font-semibold">Order ID:</span> {lastScanResult.pickupInfo.orderId}</p>
                  <p><span className="font-semibold">Pickup Code:</span> {lastScanResult.pickupInfo.pickupCode}</p>
                  <p><span className="font-semibold">Status:</span> {lastScanResult.pickupInfo.pickupStatus}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowValidationPopup(false)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#ff4b86] text-white font-bold rounded-lg hover:bg-[#ff6a9a] transition-colors"
            >
              <span className="material-symbols-outlined">qr_code_scanner</span>
              Scan Pickup Berikutnya
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ProductPickup;
