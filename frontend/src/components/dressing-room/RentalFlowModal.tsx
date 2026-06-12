import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import type { DressingRoomProduct, DressingRoomProductVariant } from '../../types/dressingRoom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { loadDokuCheckoutScript, openDokuCheckout, resetDokuCheckoutState } from '../../utils/dokuCheckout';

export interface RentalItem {
  dressing_room_product_variant_id: number;
  product_name: string;
  variant_label: string;
  quantity: number;
  daily_rate: number;
  deposit_amount: number;
  image_url?: string | null;
}

export interface RentalFormData {
  product: any;
  variant: any;
  durationDays: number;
  rentalStartTime: Date;
  rentalEndTime: Date;
  customerData: {
    fullName: string;
    email: string;
    phone: string;
  };
}

interface RentalFlowModalProps {
  product: any;
  variant: any;
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'duration' | 'customer' | 'confirm';

export default function RentalFlowModal({ product, variant, isOpen, onClose }: RentalFlowModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('duration');
  const [formData, setFormData] = useState<RentalFormData>({
    product,
    variant,
    durationDays: 1,
    rentalStartTime: new Date(),
    rentalEndTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
    customerData: { fullName: '', email: '', phone: '' },
  });

  const STEPS: Step[] = ['duration', 'customer', 'confirm'];
  const stepIndex = STEPS.indexOf(currentStep);
  
  // Use dynamic pricing from variant, fallback to defaults
  const dailyRate = variant?.daily_rental_fee ?? 35000;
  const depositAmount = variant?.deposit_amount ?? 50000;

  const handleNext = (patch: Partial<RentalFormData>) => {
    setFormData(prev => ({ ...prev, ...patch }));
    setCurrentStep(STEPS[stepIndex + 1]);
  };
  const handlePrev = () => setCurrentStep(STEPS[stepIndex - 1]);

  if (!isOpen) return null;

  const stepLabel = currentStep === 'duration' ? 'Durasi Sewa' :
    currentStep === 'customer' ? 'Data Diri' : 'Konfirmasi';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          className="relative w-full max-w-lg mx-0 sm:mx-4 max-h-[95vh] overflow-y-auto bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">
                Sewa: {product.name}
              </h2>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-main-500">
                {stepLabel} ({stepIndex + 1}/{STEPS.length})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-main-500 transition-all duration-500"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <AnimatePresence mode="wait">
              {currentStep === 'duration' && (
                <DurationStep
                  key="duration"
                  product={product}
                  variant={variant}
                  defaultDays={formData.durationDays}
                  dailyRate={dailyRate}
                  depositAmount={depositAmount}
                  onNext={(days) => {
                    const start = new Date();
                    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
                    handleNext({ durationDays: days, rentalStartTime: start, rentalEndTime: end });
                  }}
                  onClose={onClose}
                />
              )}
              {currentStep === 'customer' && (
                <CustomerStep
                  key="customer"
                  defaultData={formData.customerData}
                  depositAmount={depositAmount}
                  onNext={(data) => handleNext({ customerData: data })}
                  onPrev={handlePrev}
                />
              )}
              {currentStep === 'confirm' && (
                <ConfirmStep
                  key="confirm"
                  formData={formData}
                  dailyRate={dailyRate}
                  depositAmount={depositAmount}
                  onPrev={handlePrev}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Step 1: Duration ────────────────────────────────────────────────────────
function DurationStep({
  product,
  variant,
  defaultDays,
  dailyRate,
  depositAmount,
  onNext,
  onClose,
}: {
  product: DressingRoomProduct;
  variant: DressingRoomProductVariant;
  defaultDays: number;
  dailyRate: number;
  depositAmount: number;
  onNext: (days: number) => void;
  onClose: () => void;
}) {
  const [days, setDays] = useState(defaultDays);
  const rentalCost = dailyRate * days;
  const total = rentalCost + depositAmount;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Product preview */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        {product.image_url && (
          <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
        )}
        <div>
          <p className="font-bold text-gray-900">{product.name}</p>
          <p className="text-sm text-gray-500">{variant.name}{variant.size_label ? ` • ${variant.size_label}` : ''}</p>
        </div>
      </div>

      {/* Duration picker */}
      <div>
        <p className="font-bold text-sm uppercase tracking-wider text-gray-700 mb-3">Pilih Durasi Sewa</p>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                days === d
                  ? 'border-main-500 bg-main-50 text-main-600'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {d}h
            </button>
          ))}
        </div>
      </div>

      {/* Price summary */}
      <div className="bg-gradient-to-br from-main-50 to-pink-50 rounded-xl p-5 border border-main-100 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Sewa ({days} hari × Rp {dailyRate.toLocaleString('id-ID')})</span>
          <span className="font-semibold text-gray-900">Rp {rentalCost.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Deposit (refundable)</span>
          <span className="font-semibold text-yellow-700">Rp {depositAmount.toLocaleString('id-ID')}</span>
        </div>
        <div className="border-t border-main-200 pt-3 flex justify-between">
          <span className="font-black text-gray-900">Total Bayar</span>
          <span className="text-xl font-black text-main-600">Rp {total.toLocaleString('id-ID')}</span>
        </div>
        <p className="text-[11px] text-gray-500 italic">* Deposit dikembalikan saat baju kembali dalam kondisi baik</p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onClose}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          Batal
        </button>
        <button type="button" onClick={() => onNext(days)}
          className="flex-1 py-3 bg-main-500 rounded-xl text-sm font-bold text-white hover:bg-main-600 transition-colors">
          Lanjut →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Step 2: Customer Data ────────────────────────────────────────────────────
function CustomerStep({
  defaultData,
  depositAmount,
  onNext,
  onPrev,
}: {
  defaultData: RentalFormData['customerData'];
  depositAmount: number;
  onNext: (data: RentalFormData['customerData']) => void;
  onPrev: () => void;
}) {
  const [form, setForm] = useState(defaultData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Nama lengkap wajib diisi';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Email tidak valid';
    if (!form.phone.trim()) e.phone = 'No HP/WA wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const fields = [
    { key: 'fullName', label: 'Nama Lengkap', type: 'text', placeholder: 'Masukkan nama lengkap' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'email@contoh.com' },
    { key: 'phone', label: 'No HP / WhatsApp', type: 'tel', placeholder: '0812xxxxxxxx' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <p className="font-bold mb-1">📍 Ambil di Tempat</p>
        <p className="text-xs text-blue-700">Baju diambil dan dikembalikan langsung di studio kami. Data di bawah digunakan untuk konfirmasi pemesanan.</p>
      </div>

      {fields.map(({ key, label, type, placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            {label} <span className="text-red-500">*</span>
          </label>
          <input
            type={type}
            value={form[key as keyof typeof form]}
            onChange={(e) => {
              setForm(p => ({ ...p, [key]: e.target.value }));
              if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
            }}
            placeholder={placeholder}
            className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors[key] ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-main-400'
            }`}
          />
          {errors[key] && <p className="text-xs text-red-600 mt-1">{errors[key]}</p>}
        </div>
      ))}

      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
        <p className="font-semibold text-gray-800 text-sm">📋 Syarat & Ketentuan Singkat</p>
        <p>• Deposit <strong>Rp {depositAmount.toLocaleString('id-ID')}</strong> dikembalikan jika baju kembali bersih dan lengkap</p>
        <p>• Terlambat: <strong>Rp 5.000/jam</strong> dari deposit</p>
        <p>• Rusak/bernoda: deposit dikurangi sesuai kerusakan</p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onPrev}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          ← Kembali
        </button>
        <button type="button" onClick={() => { if (validate()) onNext(form); }}
          className="flex-1 py-3 bg-main-500 rounded-xl text-sm font-bold text-white hover:bg-main-600 transition-colors">
          Lanjut →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Step 3: Confirm & Submit ─────────────────────────────────────────────────

function ConfirmStep({
  formData,
  dailyRate,
  depositAmount,
  onPrev,
}: {
  formData: RentalFormData;
  dailyRate: number;
  depositAmount: number;
  onPrev: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rentalCost = dailyRate * formData.durationDays;
  const total = rentalCost + depositAmount;

  // Preload DOKU SDK when confirm step mounts
  useEffect(() => {
    loadDokuCheckoutScript().catch(err =>
      console.warn('[RentalFlow] Failed to preload DOKU SDK:', err)
    );
    return () => {
      // clean up any lingering DOKU popup when modal closes
      resetDokuCheckoutState();
    };
  }, []);

  const handleSubmit = async () => {
    if (!agreed || loading) return;

    // Redirect to login if not authenticated
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = [{
        productVariantId: formData.variant.id,
        productName: formData.product.name,
        quantity: 1,
        dailyRate: dailyRate,
        depositAmount: depositAmount,
      }];

      const { data, error: fnError } = await supabase.functions.invoke('create-doku-rental-checkout', {
        body: {
          customerName: formData.customerData.fullName,
          customerEmail: formData.customerData.email || (user?.email ?? ''),
          customerPhone: formData.customerData.phone,
          rentalStartTime: formData.rentalStartTime.toISOString(),
          rentalEndTime: formData.rentalEndTime.toISOString(),
          durationDays: formData.durationDays,
          items: items,
          customerAddress: '-', // Required by DOKU but we might not have it in this simple form
        }
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      // Open DOKU checkout as an embedded widget (modal popup)
      if (data?.payment_url) {
        // Ensure SDK is loaded (might not be ready yet)
        await loadDokuCheckoutScript();
        // Open DOKU payment widget – customer stays on SparkStage
        openDokuCheckout(data.payment_url);
        // Navigate to pending page so user sees order status after payment
        navigate(`/rental/success/${encodeURIComponent(data.order_number)}?pending=1`, {
          state: {
            orderNumber: data.order_number,
            orderId: data.order_id,
            isPending: true,
          },
        });
      } else {
        throw new Error('Gagal mendapatkan link pembayaran dari DOKU');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan, silakan coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      {/* Order summary */}
      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="p-4">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Detail Pesanan</p>
          <p className="font-bold text-gray-900">{formData.product.name}</p>
          <p className="text-sm text-gray-500">{formData.variant.name}{formData.variant.size_label ? ` • ${formData.variant.size_label}` : ''}</p>
        </div>
        <div className="p-4">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Data Penyewa</p>
          <p className="font-semibold text-gray-900">{formData.customerData.fullName}</p>
          <p className="text-sm text-gray-600">{formData.customerData.phone}</p>
          <p className="text-sm text-gray-600">{formData.customerData.email}</p>
        </div>
        <div className="p-4">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Durasi & Biaya</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sewa {formData.durationDays} hari × Rp {dailyRate.toLocaleString('id-ID')}</span>
              <span className="font-semibold">Rp {rentalCost.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deposit</span>
              <span className="font-semibold text-yellow-700">Rp {depositAmount.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-gray-100 font-black text-base">
              <span>Total Bayar</span>
              <span className="text-main-600">Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Agreement */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-main-500" />
        <span className="text-sm text-gray-600">
          Saya setuju dengan syarat & ketentuan sewa dan bertanggung jawab atas kondisi barang selama penyewaan.
        </span>
      </label>

      <div className="flex gap-3">
        <button type="button" onClick={onPrev} disabled={loading}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
          ← Kembali
        </button>
        <button type="button" onClick={handleSubmit} disabled={!agreed || loading}
          className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 ${
            agreed && !loading ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
          ) : (
            '✓ Konfirmasi Sewa'
          )}
        </button>
      </div>
    </motion.div>
  );
}
