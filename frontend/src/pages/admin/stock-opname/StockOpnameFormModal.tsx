import { useState } from 'react';
import { useToast } from '../../../components/Toast';
import { useCreateStockOpname } from '../../../hooks/useStockOpname';
import type { StockOpnameFormData } from '../../../types';
import { StockOpnameItemSelector } from './StockOpnameItemSelector';

interface StockOpnameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (opnameNumber: string) => void;
}

export const StockOpnameFormModal = ({
  isOpen,
  onClose,
  onSuccess,
}: StockOpnameFormModalProps) => {
  const { showToast } = useToast();
  const createMutation = useCreateStockOpname();

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<StockOpnameFormData>({
    location: 'SparkStage55',
    transaction_date: today,
    transaction_type: 'adjustment',
    reason: '',
    notes: '',
    opname_start_date: today,
    opname_end_date: today,
    items: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      showToast('error', 'Tambahkan minimal 1 produk');
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        ...formData,
        transaction_date: new Date(formData.transaction_date).toISOString(),
      });

      onSuccess(result.opname_number);
      
      // Reset form
      setFormData({
        location: 'SparkStage55',
        transaction_date: today,
        transaction_type: 'adjustment',
        reason: '',
        notes: '',
        opname_start_date: today,
        opname_end_date: today,
        items: [],
      });
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal membuat stock opname');
    }
  };

  const handleAddItem = (item: {
    variant_id: number;
    quantity_before: number;
    quantity_actual?: number;
    unit: string;
    cost_per_unit?: number;
    discrepancy_reason?: string;
  }) => {
    // Validate discrepancy if quantity_actual is provided
    if (
      item.quantity_actual !== undefined &&
      item.quantity_actual !== item.quantity_before &&
      !item.discrepancy_reason
    ) {
      showToast('error', 'Wajib isi alasan selisih jika ada perbedaan stok');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Buat Stock Opname</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lokasi
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tanggal
              </label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, transaction_date: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
                required
              />
            </div>
          </div>

          {/* Opname Period */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Periode Cek (untuk hitung penjualan otomatis)
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mulai Dari
                </label>
                <input
                  type="date"
                  value={formData.opname_start_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, opname_start_date: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">Dari kapan mulai hitung stok terjual</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sampai
                </label>
                <input
                  type="date"
                  value={formData.opname_end_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, opname_end_date: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">Sampai kapan hitung stok terjual</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Jenis Transaksi
            </label>
            <div className="flex gap-3">
              {[
                { value: 'stock_in', label: 'Stok Masuk', color: 'bg-green-50 border-green-300 text-green-800' },
                { value: 'stock_out', label: 'Stok Keluar', color: 'bg-red-50 border-red-300 text-red-800' },
                { value: 'adjustment', label: 'Adjustment', color: 'bg-blue-50 border-blue-300 text-blue-800' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      transaction_type: type.value as 'stock_in' | 'stock_out' | 'adjustment',
                    }))
                  }
                  className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                    formData.transaction_type === type.value
                      ? type.color
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Alasan
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="e.g., Stock masuk dari supplier, Barang rusak, dll"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Catatan
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Catatan tambahan (opsional)"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
            />
          </div>

          {/* Items Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Produk</h3>
            
            <StockOpnameItemSelector
              items={formData.items}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || formData.items.length === 0}
              className="flex items-center gap-2 rounded-lg bg-[#ff4b86] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#ff6a9a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Simpan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
