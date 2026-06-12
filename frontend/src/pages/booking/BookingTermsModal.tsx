import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import logoImage from '@/logo/logo black spark with tagline.png';

type BookingTermsModalProps = {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
};

const TERMS = [
  'Satu tiket berlaku untuk satu orang.',
  'Anak di bawah 5 tahun tidak dikenakan tiket masuk',
  'Booking hanya berlaku untuk tanggal dan sesi yang dipilih',
  'Tiket yang sudah dibeli tidak dapat dibatalkan, dikembalikan, maupun di-reschedule. Semua pembayaran bersifat final dan non-refundable',
  'Pembelian tiket on the spot tetap mengikuti slot dan sesi yang tersedia, serta mengikuti waktu sesi yang sedang berjalan',
  'Harap tiba 15 menit sebelum sesi dimulai untuk briefing dan persiapan',
  'Keterlambatan hadir dapat mengurangi durasi pengalaman karena waktu sesi tetap berjalan sesuai jadwal.',
  'Pengalaman di SPARK STAGE 55 berlangsung bersama peserta lain (sharing session), bukan private session.',
  'Durasi pengalaman adalah 2,5 jam untuk explore 15 stage secara bergantian sesuai alur sesi yang berjalan.',
  'Customer diperbolehkan membawa baju atau costume pribadi.',
  'Customer memahami bahwa meskipun costume telah melalui proses pencucian dan perawatan, tetap terdapat kemungkinan munculnya reaksi kulit atau kondisi lainnya sesuai sensitivitas masing-masing.',
  'Penggunaan costume free di setiap stage menjadi tanggung jawab dan risiko masing-masing customer, serta digunakan atas kesadaran penuh customer.',
  '🧦 WAJIB menggunakan kaos kaki untuk area lepas alas kaki serta penggunaan costume sepatu / boots.',

];

/** Each bullet delay: 70 ms apart, starting after a 180 ms header delay */
const ITEM_BASE_DELAY_MS = 180;
const ITEM_STAGGER_MS = 70;

export function BookingTermsModal({ open, onClose, onAgree }: BookingTermsModalProps) {
  const [agreed, setAgreed] = useState(false);
  // "animate" flag — reset on every open so items re-stagger
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (open) {
      // Small tick so CSS transition picks up from opacity:0
      const t = setTimeout(() => setAnimate(true), 30);
      return () => clearTimeout(t);
    } else {
      setAnimate(false);
      setAgreed(false);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    setAgreed(false);
    onClose();
  };

  const handleAgree = () => {
    if (!agreed) return;
    setAgreed(false);
    onAgree();
  };

  const modal = (
    /* Overlay — rendered into document.body via portal, z-[200] beats navbar z-[110] */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(env(safe-area-inset-top, 16px), 16px) max(env(safe-area-inset-right, 16px), 16px) max(env(safe-area-inset-bottom, 16px), 16px) max(env(safe-area-inset-left, 16px), 16px)',
        backgroundColor: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        // Overlay itself fades in
        opacity: animate ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
      onClick={handleClose}
    >
      {/* Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Card slides up
          transform: animate ? 'translateY(0)' : 'translateY(28px)',
          opacity: animate ? 1 : 0,
          transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header — animates in first ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ff2d72 0%, #ff4b86 55%, #ff7eb3 100%)',
            padding: '20px 24px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexShrink: 0,
            // Slides in from top, slightly delayed
            opacity: animate ? 1 : 0,
            transform: animate ? 'translateY(0)' : 'translateY(-12px)',
            transition: 'opacity 0.3s ease 0.05s, transform 0.35s cubic-bezier(0.22,1,0.36,1) 0.05s',
          }}
        >
          {/* Ticket logo mark */}
          <div
            style={{
              flexShrink: 0,
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
            >
              {/* Ticket body */}
              <path
                d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1.5a1.5 1.5 0 0 0 0 3V15a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1.5a1.5 1.5 0 0 0 0-3V9z"
                fill="rgba(255,255,255,0.25)"
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              {/* Star */}
              <path
                d="M12 9.5l.9 2.7h2.8l-2.3 1.7.9 2.7L12 14.9l-2.3 1.7.9-2.7-2.3-1.7h2.8z"
                fill="#fff"
              />
            </svg>
          </div>
          <div>
            <h2
              id="terms-modal-title"
              style={{ color: '#fff', fontWeight: 900, fontSize: '17px', lineHeight: 1.2, margin: 0 }}
            >
              Ketentuan &amp; Persetujuan Booking
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '12px', margin: '4px 0 0' }}>
              Baca seluruh ketentuan sebelum melanjutkan
            </p>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '20px 24px 8px' }}>
          {/* Spark logo above terms */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '18px',
              opacity: animate ? 1 : 0,
              transform: animate ? 'translateY(0)' : 'translateY(-8px)',
              transition: 'opacity 0.3s ease 0.08s, transform 0.35s cubic-bezier(0.22,1,0.36,1) 0.08s',
            }}
          >
            <img
              src={logoImage}
              alt="SPARK STAGE"
              style={{ height: '38px', width: 'auto', display: 'block' }}
            />
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TERMS.map((term, i) => {
              const delay = ITEM_BASE_DELAY_MS + i * ITEM_STAGGER_MS;
              return (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    opacity: animate ? 1 : 0,
                    transform: animate ? 'translateX(0)' : 'translateX(-14px)',
                    transition: `opacity 0.3s ease ${delay}ms, transform 0.35s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: '2px',
                      width: '20px',
                      height: '20px',
                      minWidth: '20px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ff2d72, #ff7eb3)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: '#374151', fontSize: '13.5px', lineHeight: 1.55 }}>{term}</span>
                </li>
              );
            })}
          </ul>

        </div>

        {/* ── Checkbox + Actions (sticky footer) ── */}
        <div
          style={{
            flexShrink: 0,
            padding: '14px 24px 20px',
            borderTop: '1px solid #f3f4f6',
            background: '#fff',
            opacity: animate ? 1 : 0,
            transition: `opacity 0.35s ease ${ITEM_BASE_DELAY_MS + (TERMS.length + 1) * ITEM_STAGGER_MS}ms`,
          }}
        >
          {/* Checkbox */}
          <label
            htmlFor="terms-checkbox"
            style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '14px' }}
          >
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4b86', flexShrink: 0 }}
            />
            <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
              Saya telah membaca dan <strong>menyetujui</strong> seluruh ketentuan di atas.
            </span>
          </label>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                background: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                color: '#6b7280',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}
            >
              Batal
            </button>
            <button
              onClick={handleAgree}
              disabled={!agreed}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: agreed
                  ? 'linear-gradient(135deg, #ff2d72 0%, #ff4b86 55%, #ff7eb3 100%)'
                  : '#e5e7eb',
                color: agreed ? '#fff' : '#9ca3af',
                fontSize: '13px',
                fontWeight: 800,
                cursor: agreed ? 'pointer' : 'not-allowed',
                boxShadow: agreed ? '0 4px 18px rgba(255,75,134,0.38)' : 'none',
                transition: 'background 0.2s, box-shadow 0.2s, color 0.2s',
              }}
            >
              ✓ Setuju &amp; Lanjut Bayar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
