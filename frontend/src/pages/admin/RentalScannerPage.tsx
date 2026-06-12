import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function RentalScannerPage() {
  const { signOut } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [validating, setValidating] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const menuSections = useAdminMenuSections();

  // Auto-hide notification
  useEffect(() => {
    if (notification && notification.type === 'error') {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchOrderDetails = async (orderNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('rental_orders')
        .select(`
          *,
          rental_order_items (
            id,
            product_name,
            variant_name,
            quantity
          )
        `)
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Order tidak ditemukan');
      
      setScannedData(data);
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    }
  };

  const handleScan = useCallback(
    async (code: string) => {
      try {
        let orderNumber = code.trim();
        // Extract order number from URL if needed
        if (code.includes('order_number=')) {
          const urlParams = new URLSearchParams(code.split('?')[1]);
          orderNumber = urlParams.get('order_number') || code;
        }

        if (!orderNumber.startsWith('RTL-')) {
          throw new Error('Bukan QR Code Rental yang valid');
        }

        setShowScanner(false);
        await fetchOrderDetails(orderNumber);
        
        const audio = new Audio('/sounds/berhasil.mpeg');
        audio.play().catch(e => console.error('Audio play error:', e));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memindai QR';
        setNotification({ type: 'error', message });
        
        const audio = new Audio('/sounds/gagal.mpeg');
        audio.play().catch(e => console.error('Audio play error:', e));
      }
    },
    []
  );

  const handleValidatePickup = async () => {
    if (!scannedData) return;
    setValidating(true);
    setNotification(null);

    try {
      const { data, error } = await supabase.rpc('validate_rental_pickup', {
        p_order_number: scannedData.order_number
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setNotification({
        type: 'success',
        message: data.message || 'Pengambilan (Pickup) berhasil divalidasi!'
      });
      
      // Refresh order data
      await fetchOrderDetails(scannedData.order_number);
      
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setValidating(false);
    }
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="rental-scanner"
      title="Rental Pickup Scanner"
      onLogout={signOut}
    >
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Scanner Pickup Rental</h1>
              <p className="text-gray-600">Scan QR Code customer saat mereka datang mengambil barang sewaan</p>
            </div>

            <div className="flex justify-center mb-8">
              <button
                onClick={() => setShowScanner(true)}
                className="bg-main-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-main-700 transition-colors flex items-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined">qr_code_scanner</span>
                Buka Kamera Scanner
              </button>
            </div>

            {/* Notification area */}
            {notification && (
              <div className={`p-4 rounded-xl mb-6 ${notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl">
                    {notification.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <p className="font-medium text-lg">{notification.message}</p>
                </div>
              </div>
            )}

            {/* Scanned Data Display */}
            {scannedData && (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                <div className="bg-white p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Order Number</p>
                      <h2 className="text-xl font-black text-gray-900">{scannedData.order_number}</h2>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        scannedData.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        scannedData.status === 'paid' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {scannedData.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Nama Customer</p>
                      <p className="font-semibold text-gray-900">{scannedData.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">No HP / Telepon</p>
                      <p className="font-semibold text-gray-900">{scannedData.customer_phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tanggal Mulai Sewa</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(scannedData.start_time).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tanggal Pengembalian</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(scannedData.end_time).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm tracking-wider">Daftar Barang Sewaan</h3>
                  <div className="space-y-3 mb-6">
                    {scannedData.rental_order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-semibold text-gray-900">{item.product_name}</p>
                          <p className="text-sm text-gray-500">{item.variant_name}</p>
                        </div>
                        <span className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-md">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {scannedData.status === 'paid' && (
                    <button
                      onClick={handleValidatePickup}
                      disabled={validating}
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validating ? <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</> : 'Validasi Pengambilan (Pickup)'}
                    </button>
                  )}
                  {scannedData.status === 'active' && (
                    <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="font-bold text-blue-800">✅ Barang sudah berstatus Disewa (Active)</p>
                      <p className="text-sm text-blue-600 mt-1">Pengambilan sudah divalidasi sebelumnya.</p>
                    </div>
                  )}
                  {scannedData.status !== 'paid' && scannedData.status !== 'active' && (
                    <div className="text-center p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="font-bold text-red-800">❌ Pesanan Belum Dibayar / Dibatalkan</p>
                      <p className="text-sm text-red-600 mt-1">Status saat ini: {scannedData.status}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showScanner && (
              <QRScannerModal
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScan}
                title="Scan QR Rental"
                closeOnSuccess={false}
                closeOnError={false}
                preferredCamera="front"
              />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
