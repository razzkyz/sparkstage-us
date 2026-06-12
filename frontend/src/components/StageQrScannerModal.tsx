import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQrScannerController } from './admin/qr-scanner-modal/useQrScannerController';
import { QrScannerViewport } from './admin/qr-scanner-modal/QrScannerViewport';

type ScanResult = {
  stageName: string;
  stageZone: string | null;
  stageCode: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function StageQrScannerModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);

  const handleScan = useCallback(
    async (decodedText: string) => {
      // Extract the stage code from the scanned URL
      // URL format: https://...domain.../scan/<stageCode>
      let stageCode = decodedText.trim();
      try {
        const url = new URL(decodedText);
        const parts = url.pathname.split('/');
        const scanIdx = parts.indexOf('scan');
        if (scanIdx !== -1 && parts[scanIdx + 1]) {
          stageCode = parts[scanIdx + 1];
        }
      } catch {
        // Not a URL, treat the whole string as a stage code
      }

      const { data: stageData, error: stageError } = await supabase
        .from('stages')
        .select('id, name, zone, code, status')
        .eq('code', stageCode)
        .single();

      if (stageError || !stageData) {
        throw new Error('Stage tidak ditemukan. Pastikan QR Code valid.');
      }

      if (stageData.status !== 'active') {
        throw new Error(`Stage ini sedang dalam ${stageData.status}. Coba stage lain.`);
      }

      // Record scan — include user_id if logged in for tracking
      await supabase.from('stage_scans').insert({
        stage_id: stageData.id,
        user_agent: navigator.userAgent,
        ...(user?.id ? { user_id: user.id } : {}),
      });

      setLastScan({
        stageName: stageData.name,
        stageZone: stageData.zone,
        stageCode: stageData.code,
      });
    },
    []
  );

  const controller = useQrScannerController({
    isOpen,
    onClose,
    onScan: handleScan,
    autoResumeAfterMs: 4000,
    autoResumeOnError: true,
    closeOnSuccess: false,
    preferredCamera: 'back',
  });

  const handleGoToStage = () => {
    if (lastScan) {
      onClose();
      navigate(`/stage/${lastScan.stageCode}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${
        controller.isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={controller.handleClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #ff2d72 0%, #ff4b86 60%, #ff6b9d 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* QR Scanner Icon */}
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect x="7" y="7" width="3" height="3" />
                <rect x="14" y="7" width="3" height="3" />
                <rect x="7" y="14" width="3" height="3" />
                <path d="M14 14h3v3" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Scan Stage QR</h2>
              <p className="text-[11px] text-white/80 font-medium">Arahkan kamera ke QR Code stage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={controller.handleClose}
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
            aria-label="Tutup scanner"
          >
            <X className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scanner */}
        <div className="flex-1 overflow-y-auto p-4">
          <QrScannerViewport
            readerId={controller.readerId}
            status={controller.status}
            errorMessage={controller.errorMessage}
            errorDetails={controller.errorDetails}
            closeOnSuccess={false}
            closeOnError={false}
            onRetry={controller.handleRetry}
          />

          {/* Last scan info */}
          {controller.status === 'success' && lastScan && (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-600 mb-1">
                Stage Berhasil Di-scan!
              </p>
              <p className="text-lg font-black text-gray-900">{lastScan.stageName}</p>
              {lastScan.stageZone && (
                <p className="text-sm text-gray-500 mt-0.5">{lastScan.stageZone}</p>
              )}
              <button
                type="button"
                onClick={handleGoToStage}
                className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #ff2d72, #ff4b86)',
                  boxShadow: '0 4px 12px rgba(255,75,134,0.4)',
                }}
              >
                Lihat Galeri Stage →
              </button>
            </div>
          )}

          {/* Tip */}
          {(controller.status === 'scanning' || controller.status === 'starting') && (
            <p className="mt-3 text-center text-xs text-gray-500">
              💡 Scan QR Code yang ada di setiap stage untuk check-in dan lihat galeri
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
