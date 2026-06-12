import QRCode from 'react-qr-code';
import { formatDateTimeWIB } from '../../utils/timezone';

type ProductOrderQrCardProps = {
  pickupCode: string;
  pickupExpiresAt?: string | null;
  channel?: string | null;
  size?: number;
  className?: string;
};

export function ProductOrderQrCard({
  pickupCode,
  pickupExpiresAt,
  channel,
  size = 200,
  className = '',
}: ProductOrderQrCardProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-center sm:items-start gap-6 ${className}`}>
      <div 
        className="bg-white p-6 rounded-xl border border-gray-100" 
        style={{ 
          colorScheme: 'light',
          backgroundColor: '#ffffff',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        <div style={{ backgroundColor: '#ffffff', padding: '12px' }}>
          <QRCode 
            value={pickupCode} 
            size={size} 
            style={{
              height: `${size}px`,
              width: `${size}px`,
              backgroundColor: '#ffffff',
              display: 'block'
            }}
            fgColor="#000000"
            bgColor="#ffffff"
          />
        </div>
      </div>
      <div className="flex-1 w-full">
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pickup Code</p>
          <p className="font-display text-2xl text-primary">{pickupCode}</p>
          {pickupExpiresAt && (
            <p className="mt-2 text-sm text-gray-500">Pickup expires: {formatDateTimeWIB(pickupExpiresAt)}</p>
          )}
        </div>
        <p className="mt-3 text-lg font-bold text-gray-800">
          {String(channel || '').toLowerCase() === 'cashier'
            ? 'Tunjukkan QR ini ke kasir untuk pembayaran. Reservasi akan kadaluarsa jika belum dibayar.'
            : 'Pastikan pick up code sudah di-capture ya. Kode ini wajib ditunjukkan saat mengambil pesanan.'}
        </p>
      </div>
    </div>
  );
}
