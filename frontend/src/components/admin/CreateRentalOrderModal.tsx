import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import type { DressingRoomProduct, DressingRoomProductVariant } from '../../types/dressingRoom';

interface OrderItem {
  dressing_room_product_variant_id: number;
  quantity: number;
  daily_rate: number;
  deposit_amount: number;
  // UI helpers
  _product_name: string;
  _variant_label: string;
}

interface CreateRentalOrderModalProps {
  onClose: () => void;
  onSuccess: (orderNumber: string) => void;
}

export function CreateRentalOrderModal({ onClose, onSuccess }: CreateRentalOrderModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [rentalStartTime, setRentalStartTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [durationDays, setDurationDays] = useState(1);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Product picker state
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [pickerQty, setPickerQty] = useState(1);

  // Fetch products
  const { data: products = [] } = useQuery<DressingRoomProduct[]>({
    queryKey: ['dr-products-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dressing_room_products')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch variants for selected product
  const { data: variants = [] } = useQuery<DressingRoomProductVariant[]>({
    queryKey: ['dr-variants-active', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data, error } = await supabase
        .from('dressing_room_product_variants')
        .select('*')
        .eq('dressing_room_product_id', selectedProductId)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProductId,
  });

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Totals
  const totalRental = items.reduce(
    (sum, item) => sum + item.daily_rate * durationDays * item.quantity,
    0
  );
  const totalDeposit = items.reduce(
    (sum, item) => sum + item.deposit_amount * item.quantity,
    0
  );
  const totalAmount = totalRental + totalDeposit;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_rental_order_admin', {
        p_customer_name: customerName.trim(),
        p_customer_email: customerEmail.trim(),
        p_customer_phone: customerPhone.trim(),
        p_customer_address: customerAddress.trim() || null,
        p_rental_start_time: new Date(rentalStartTime).toISOString(),
        p_duration_days: durationDays,
        p_items: items.map((item) => ({
          dressing_room_product_variant_id: item.dressing_room_product_variant_id,
          quantity: item.quantity,
          daily_rate: item.daily_rate,
          deposit_amount: item.deposit_amount,
        })),
        p_notes: null,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dressing-room-inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dr-variants-active'] });
      onSuccess(data.order_number);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal membuat order');
    },
  });

  // Add item to list
  const handleAddItem = () => {
    if (!selectedVariant || !selectedProduct) {
      setFormError('Pilih produk dan varian terlebih dahulu');
      return;
    }
    if (pickerQty < 1) {
      setFormError('Quantity minimal 1');
      return;
    }
    if (pickerQty > selectedVariant.available_quantity) {
      setFormError(
        `Stok tidak cukup. Tersedia: ${selectedVariant.available_quantity}`
      );
      return;
    }

    // Check if variant already in list, if so update qty
    const existingIdx = items.findIndex(
      (i) => i.dressing_room_product_variant_id === selectedVariant.id
    );
    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].quantity = pickerQty;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          dressing_room_product_variant_id: selectedVariant.id,
          quantity: pickerQty,
          daily_rate: selectedVariant.daily_rental_fee,
          deposit_amount: selectedVariant.deposit_amount,
          _product_name: selectedProduct.name,
          _variant_label:
            selectedVariant.name +
            (selectedVariant.size_label ? ` (${selectedVariant.size_label})` : ''),
        },
      ]);
    }

    setFormError(null);
    setSelectedProductId(null);
    setSelectedVariantId(null);
    setPickerQty(1);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) return setFormError('Nama customer wajib diisi');
    if (!customerPhone.trim()) return setFormError('Nomor HP wajib diisi');
    if (items.length === 0) return setFormError('Tambahkan minimal 1 item');

    createMutation.mutate();
  };

  const formatRp = (n: number) =>
    'Rp ' + n.toLocaleString('id-ID');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Buat Order Sewa Baru</h2>
            <p className="text-sm text-gray-500">Pembayaran tunai / manual</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Error */}
          {formError && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          {/* Customer Info */}
          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              Data Customer
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  No HP / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Alamat
                </label>
                <textarea
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Alamat lengkap (opsional)"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>
            </div>
          </section>

          {/* Rental Timing */}
          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              Waktu Sewa
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Mulai Sewa
                </label>
                <input
                  type="datetime-local"
                  value={rentalStartTime}
                  onChange={(e) => setRentalStartTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Durasi (hari)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>
            </div>
            {rentalStartTime && (
              <p className="mt-2 text-xs text-gray-500">
                Selesai:{' '}
                <strong>
                  {new Date(
                    new Date(rentalStartTime).getTime() + durationDays * 86400000
                  ).toLocaleString('id-ID')}
                </strong>
              </p>
            )}
          </section>

          {/* Item Picker */}
          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              Pilih Item Sewa
            </h3>

            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Product */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Produk
                  </label>
                  <select
                    value={selectedProductId ?? ''}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value ? parseInt(e.target.value) : null);
                      setSelectedVariantId(null);
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:border-pink-400 focus:outline-none"
                  >
                    <option value="">-- Pilih Produk --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variant */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Varian / Ukuran
                  </label>
                  <select
                    value={selectedVariantId ?? ''}
                    onChange={(e) =>
                      setSelectedVariantId(e.target.value ? parseInt(e.target.value) : null)
                    }
                    disabled={!selectedProductId}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:border-pink-400 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">-- Pilih Varian --</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.available_quantity < 1}>
                        {v.name}
                        {v.size_label ? ` (${v.size_label})` : ''}
                        {v.color ? ` – ${v.color}` : ''}
                        {' '}[Stok: {v.available_quantity}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty + Add */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Qty
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={selectedVariant?.available_quantity ?? 99}
                      value={pickerQty}
                      onChange={(e) => setPickerQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-pink-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-pink-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-600"
                    >
                      <Plus className="h-4 w-4" />
                      Tambah
                    </button>
                  </div>
                </div>
              </div>

              {/* Variant info */}
              {selectedVariant && (
                <div className="mt-3 flex flex-wrap gap-3 rounded-lg bg-white p-3 border border-gray-200 text-xs text-gray-600">
                  <span>💰 Sewa: <strong>{formatRp(selectedVariant.daily_rental_fee)}/hari</strong></span>
                  <span>🔒 Deposit: <strong>{formatRp(selectedVariant.deposit_amount)}</strong></span>
                  <span>📦 Stok Tersedia: <strong className={selectedVariant.available_quantity > 0 ? 'text-green-600' : 'text-red-600'}>{selectedVariant.available_quantity}</strong></span>
                </div>
              )}
            </div>

            {/* Item list */}
            {items.length > 0 && (
              <div className="mt-3 space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {item._product_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item._variant_label} · {item.quantity}x ·{' '}
                        {formatRp(item.daily_rate)}/hari · Deposit {formatRp(item.deposit_amount * item.quantity)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="ml-3 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Summary */}
          {items.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-700">Ringkasan Biaya</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Biaya Sewa ({durationDays} hari)</span>
                  <span>{formatRp(totalRental)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total Deposit</span>
                  <span>{formatRp(totalDeposit)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900">
                  <span>Total Tagihan</span>
                  <span className="text-pink-600">{formatRp(totalAmount)}</span>
                </div>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || items.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-pink-500 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Membuat Order...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Buat Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRentalOrderModal;
