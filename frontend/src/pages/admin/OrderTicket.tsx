import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { validateEntranceTicket } from './order-ticket/validateEntranceTicket';
import { supabase } from '../../lib/supabase';

const OrderTicket = () => {
  const { signOut, session } = useAuth();
  const menuSections = useAdminMenuSections();
  const [showScanner, setShowScanner] = useState(false);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validating, setValidating] = useState(false);
  const [scanSequenceNumber, setScanSequenceNumber] = useState<string | undefined>(undefined);
  const [scanDescription, setScanDescription] = useState<string | undefined>(undefined);
  const [lastScanResult, setLastScanResult] = useState<{
    type: 'success' | 'error';
    message: string;
    ticketInfo?: {
      code: string;
      userName: string;
      ticketName: string;
      validDate: string;
    };
  } | null>(null);

  // ── Reset Tiket state ──────────────────────────────────────────────────────
  const [resetCode, setResetCode] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{
    ok: boolean;
    message: string;
    ticketCode?: string;
    ticketName?: string;
    validDate?: string;
    usedAt?: string;
  } | null>(null);

  const handleResetTicket = useCallback(async () => {
    const code = resetCode.trim().toUpperCase();
    if (!code) return;
    setResetLoading(true);
    setResetResult(null);
    try {
      const { data, error } = await supabase.rpc('admin_reset_ticket_scan', {
        p_ticket_code: code,
      });
      if (error) throw error;
      const result = data as { ok: boolean; message: string; ticketCode?: string; ticketName?: string; validDate?: string; usedAt?: string };
      setResetResult(result);
      if (result.ok) setResetCode('');
    } catch (err) {
      setResetResult({ ok: false, message: err instanceof Error ? err.message : 'Gagal mereset tiket' });
    } finally {
      setResetLoading(false);
    }
  }, [resetCode]);

  const validateTicket = useCallback(
    async (rawCode: string): Promise<void> => {
      const code = rawCode.trim();
      if (!code) throw new Error('Kode QR kosong');
      if (validating) throw new Error('Sedang memproses tiket lain');

      setValidating(true);
      setLastScanResult(null);
      setScanSequenceNumber(undefined);
      setScanDescription(undefined);

      try {
        const ticket = await validateEntranceTicket({
          ticketCode: code,
          session,
        });

        setScanSequenceNumber(ticket.code);
        setScanDescription(`${ticket.userName} - ${ticket.ticketName}`);

        setLastScanResult({
          type: 'success',
          message: 'Tiket berhasil divalidasi! Masuk diizinkan.',
          ticketInfo: {
            code: ticket.code,
            userName: ticket.userName,
            ticketName: ticket.ticketName,
            validDate: ticket.validDate
              ? new Date(`${ticket.validDate}T00:00:00`).toLocaleDateString('id-ID')
              : '-',
          },
        });
        const audio = new Audio('/sounds/berhasil.mpeg');
        audio.play().catch(e => console.error('Audio play error:', e));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memvalidasi tiket';
        setLastScanResult({ type: 'error', message });
        console.error('Validation error:', err);
        const audio = new Audio('/sounds/gagal.mpeg');
        audio.play().catch(e => console.error('Audio play error:', e));
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
      defaultActiveMenuId="order-ticket"
      title="Pemindai Tiket Masuk"
      onLogout={signOut}
    >
      {/* Scanner Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">Pemindai Tiket Masuk</h3>
            <p className="text-sm text-gray-600">Pindai kode QR untuk memvalidasi tiket masuk</p>
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
                {lastScanResult.ticketInfo && (
                  <div className="text-sm space-y-1 mt-3">
                    <p><span className="font-semibold">Tiket:</span> {lastScanResult.ticketInfo.ticketName}</p>
                    <p><span className="font-semibold">Tamu:</span> {lastScanResult.ticketInfo.userName}</p>
                    <p><span className="font-semibold">Kode:</span> {lastScanResult.ticketInfo.code}</p>
                    <p><span className="font-semibold">Tanggal Valid:</span> {lastScanResult.ticketInfo.validDate}</p>
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
          <h4 className="text-lg font-medium text-gray-900 mb-2">Pindai Tiket Masuk</h4>
          <p className="text-sm text-gray-600 max-w-md mb-6">
            Klik tombol di bawah untuk mengaktifkan kamera dan pindai kode QR pada tiket masuk.
          </p>
          <button
            onClick={() => setShowScanner(true)}
            disabled={validating}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff4b86] text-white text-sm font-bold rounded-lg shadow-md hover:bg-[#ff6a9a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
            {validating ? 'Memvalidasi...' : 'Aktifkan Pemindai'}
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
                <span>Arahkan kamera ke kode QR pada tiket</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Tunggu validasi otomatis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Pesan hijau = Masuk diizinkan, Pesan merah = Masuk ditolak</span>
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
        title="Pindai Tiket Masuk"
        closeOnSuccess={false}
        closeOnError={false}
        autoResumeAfterMs={3000}
        sequenceNumber={scanSequenceNumber}
        description={scanDescription}
        onScan={async (decodedText) => {
          await validateTicket(decodedText);
        }}
      />

      {/* Validation Result Popup */}
      {showValidationPopup && lastScanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Hasil Validasi Tiket</h3>
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

              {lastScanResult.ticketInfo && (
                <div className="text-sm space-y-2 mt-4 border-t border-gray-200 pt-4">
                  <p><span className="font-semibold">Tiket:</span> {lastScanResult.ticketInfo.ticketName}</p>
                  <p><span className="font-semibold">Tamu:</span> {lastScanResult.ticketInfo.userName}</p>
                  <p><span className="font-semibold">Kode:</span> {lastScanResult.ticketInfo.code}</p>
                  <p><span className="font-semibold">Tanggal Valid:</span> {lastScanResult.ticketInfo.validDate}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowValidationPopup(false)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#ff4b86] text-white font-bold rounded-lg hover:bg-[#ff6a9a] transition-colors"
            >
              <span className="material-symbols-outlined">qr_code_scanner</span>
              Scan Tiket Berikutnya
            </button>
          </div>
        </div>
      )}
      {/* ── Reset Tiket Salah Scan ── */}
      <div className="rounded-xl border border-orange-200 bg-orange-50 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-orange-200 flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-600 text-2xl">restart_alt</span>
          <div>
            <h3 className="font-bold text-gray-900">Reset Tiket Salah Scan</h3>
            <p className="text-xs text-orange-700 mt-0.5">
              Gunakan jika tiket customer terlanjur ter-scan padahal belum waktunya — stok scan akan dikembalikan ke aktif.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Input */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Masukkan kode tiket (contoh: TKT-XXXX)"
              value={resetCode}
              onChange={(e) => { setResetCode(e.target.value.toUpperCase()); setResetResult(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleResetTicket(); }}
              className="flex-1 px-4 py-2.5 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white font-mono"
            />
            <button
              onClick={() => void handleResetTicket()}
              disabled={resetLoading || !resetCode.trim()}
              className="px-5 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {resetLoading
                ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              }
              {resetLoading ? 'Memproses...' : 'Reset'}
            </button>
          </div>

          {/* Result */}
          {resetResult && (
            <div className={`rounded-lg border p-4 ${resetResult.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined text-2xl flex-shrink-0 ${resetResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {resetResult.ok ? 'check_circle' : 'error'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${resetResult.ok ? 'text-green-800' : 'text-red-800'}`}>
                    {resetResult.message}
                  </p>
                  {(resetResult.ticketCode || resetResult.ticketName || resetResult.validDate) && (
                    <div className="mt-2 text-xs space-y-1 text-gray-700">
                      {resetResult.ticketCode && <p><span className="font-semibold">Kode:</span> {resetResult.ticketCode}</p>}
                      {resetResult.ticketName && <p><span className="font-semibold">Tiket:</span> {resetResult.ticketName}</p>}
                      {resetResult.validDate && (
                        <p>
                          <span className="font-semibold">Tanggal Valid:</span>{' '}
                          {new Date(`${resetResult.validDate}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                      {resetResult.usedAt && (
                        <p className="text-orange-700">
                          <span className="font-semibold">Sebelumnya di-scan:</span>{' '}
                          {new Date(resetResult.usedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-orange-600">
            ⚠️ Aksi ini tidak dapat di-undo secara otomatis. Pastikan tiket memang salah scan sebelum reset.
          </p>
        </div>
      </div>

    </AdminLayout>
  );
};

export default OrderTicket;

