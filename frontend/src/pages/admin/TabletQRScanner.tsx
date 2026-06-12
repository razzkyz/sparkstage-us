import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { validateEntranceTicket } from './order-ticket/validateEntranceTicket';

const TabletQRScanner = () => {
  const { signOut, session } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [validating, setValidating] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    ticketInfo?: {
      code: string;
      userName: string;
      ticketName: string;
    };
  } | null>(null);
  const menuSections = useAdminMenuSections();

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const validateTicket = useCallback(
    async (rawCode: string): Promise<void> => {
      const code = rawCode.trim();
      if (!code) throw new Error('Kode QR kosong');
      if (validating) throw new Error('Sedang memproses tiket lain');

      setValidating(true);

      try {
        const ticket = await validateEntranceTicket({
          ticketCode: code,
          session,
        });

        setNotification({
          type: 'success',
          message: 'Tiket valid!',
          ticketInfo: {
            code: ticket.code,
            userName: ticket.userName,
            ticketName: ticket.ticketName,
          },
        });
        const audio = new Audio('/sounds/berhasil.mpeg');
        audio.play().catch(e => console.error('Audio play error:', e));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tiket tidak valid';
        setNotification({ type: 'error', message });
        console.error('Validation error:', err);
        const audio = new Audio('/sounds/gagal.mpeg');
        audio.play().catch(e => console.error('Audio play error:', e));
      } finally {
        setValidating(false);
      }
    },
    [session, validating]
  );

  const handleScan = useCallback(
    async (code: string) => {
      try {
        await validateTicket(code);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memindai QR';
        setNotification({ type: 'error', message });
      }
    },
    [validateTicket]
  );

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="tablet-qr-scanner"
      title="Scan QR Tablet"
      onLogout={signOut}
    >
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Scan QR untuk Tablet</h1>
            <p className="text-gray-600 mb-8">
              Arahkan QR code tiket ke kamera untuk validasi
            </p>

            {!showScanner && (
              <button
                onClick={() => setShowScanner(true)}
                className="bg-main-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-main-700 transition-colors"
              >
                Buka Scan QR
              </button>
            )}

            {showScanner && (
              <QRScannerModal
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScan}
                title="Scan QR Tablet"
                closeOnSuccess={false}
                closeOnError={false}
                preferredCamera="front"
              />
            )}
          </div>
        </div>
      </div>

      {/* Notification on top of QR scanner modal */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 animate-in slide-in-from-top duration-300">
          <div
            className={`rounded-lg shadow-xl p-4 min-w-75 ${
              notification.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl">
                {notification.type === 'success' ? 'check_circle' : 'cancel'}
              </span>
              <div className="flex-1 text-left">
                <p className="font-bold text-lg">{notification.message}</p>
                {notification.ticketInfo && (
                  <div className="mt-1 text-sm opacity-90">
                    <p>{notification.ticketInfo.userName}</p>
                    <p>{notification.ticketInfo.ticketName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default TabletQRScanner;
