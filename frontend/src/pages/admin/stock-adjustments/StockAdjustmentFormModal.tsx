import { useState, useEffect } from 'react';
import { 
  useCreateStockAdjustment, 
  useUpdateStockAdjustment,
  type StockAdjustmentItem, 
  type StockAdjustment 
} from '../../../hooks/useStockOpnameNew';
import { useInventoryProducts } from '../../../hooks/useInventoryProducts';
import { useToast } from '../../../components/Toast';
import { VariantSelectorWithSearch } from '../stock-opening/VariantSelectorWithSearch';
import { supabase } from '../../../lib/supabase';

interface StockAdjustmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adjustmentNumber: string) => void;
  editingAdjustment?: StockAdjustment | null;
}

interface AdjustmentItemRow extends StockAdjustmentItem {
  tempId: string;
  product_name?: string;
  variant_name?: string;
  variant_sku?: string;
}

type AdjustmentType = 'gift' | 'kol' | 'loss' | 'gain' | 'other';

export const StockAdjustmentFormModal = ({ isOpen, onClose, onSuccess, editingAdjustment }: StockAdjustmentFormModalProps) => {
  const { showToast } = useToast();
  const createAdjustment = useCreateStockAdjustment();
  const updateAdjustment = useUpdateStockAdjustment();
  
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType | ''>('');
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('SparkStage55');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<AdjustmentItemRow[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const { data: productsData } = useInventoryProducts('');
  
  // Load data when editing
  useEffect(() => {
    const loadAdjustmentDetail = async () => {
      if (editingAdjustment && isOpen) {
        setIsLoadingDetail(true);
        try {
          // Load basic info
          setAdjustmentDate(editingAdjustment.adjustment_date);
          setAdjustmentType(editingAdjustment.adjustment_type as AdjustmentType);
          setReason(editingAdjustment.reason);
          setLocation(editingAdjustment.location);
          setNotes(editingAdjustment.notes || '');
          
          // Fetch items from stock_adjustment_items table
          const { data: itemsData, error } = await supabase
            .from('stock_adjustment_items')
            .select(`
              *,
              products!stock_adjustment_items_product_id_fkey (
                id,
                name
              ),
              product_variants!stock_adjustment_items_variant_id_fkey (
                id,
                name,
                sku
              )
            `)
            .eq('stock_adjustment_id', editingAdjustment.id);

          if (error) throw error;

          if (itemsData && itemsData.length > 0) {
            const loadedItems: AdjustmentItemRow[] = itemsData.map((item: any, index: number) => ({
              tempId: `existing-${item.id}-${index}`,
              product_id: item.product_id,
              variant_id: item.variant_id,
              quantity_change: item.quantity_change,
              unit: item.unit,
              notes: item.notes || '',
              product_name: item.products?.name || 'Unknown',
              variant_name: item.product_variants?.name || 'Unknown',
              variant_sku: item.product_variants?.sku || '',
            }));
            setItems(loadedItems);
          }
        } catch (err) {
          console.error('Error loading adjustment detail:', err);
          showToast('error', 'Gagal memuat data adjustment');
        } finally {
          setIsLoadingDetail(false);
        }
      } else if (!isOpen) {
        // Reset form when modal closes
        setAdjustmentDate(new Date().toISOString().split('T')[0]);
        setAdjustmentType('');
        setReason('');
        setLocation('SparkStage55');
        setNotes('');
        setItems([]);
      }
    };

    loadAdjustmentDetail();
  }, [editingAdjustment, isOpen, showToast]);
  
  const variants = productsData?.data?.map((p) => ({
    variant_id: p.variant_id,
    product_id: p.product_id,
    product_name: p.product_name,
    variant_name: p.variant_name,
    variant_sku: p.variant_sku,
    current_stock: p.current_stock,
  })) || [];

  const handleAddItem = (variantId: number) => {
    const variant = variants.find((v) => v.variant_id === variantId);
    if (!variant) return;

    if (items.some((item) => item.variant_id === variantId)) {
      showToast('warning', 'Variant sudah ditambahkan');
      return;
    }

    const newItem: AdjustmentItemRow = {
      tempId: `temp-${Date.now()}`,
      product_id: variant.product_id,
      variant_id: variant.variant_id,
      quantity_change: 0,
      unit: 'pcs',
      notes: '',
      product_name: variant.product_name,
      variant_name: variant.variant_name,
      variant_sku: variant.variant_sku,
    };

    setItems([...items, newItem]);
    setSearchQuery('');
  };

  const handleRemoveItem = (tempId: string) => {
    setItems(items.filter((item) => item.tempId !== tempId));
  };

  const handleQuantityChange = (tempId: string, quantity: number) => {
    setItems(items.map((item) => (item.tempId === tempId ? { ...item, quantity_change: quantity } : item)));
  };

  const handleNotesChange = (tempId: string, notes: string) => {
    setItems(items.map((item) => (item.tempId === tempId ? { ...item, notes } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adjustmentType) {
      showToast('error', 'Pilih tipe adjustment');
      return;
    }

    if (reason.trim().length < 10) {
      showToast('error', 'Alasan harus minimal 10 karakter');
      return;
    }

    if (items.length === 0) {
      showToast('error', 'Tambahkan minimal 1 item');
      return;
    }

    if (items.some((item) => item.quantity_change === 0)) {
      showToast('error', 'Semua item harus memiliki quantity change != 0');
      return;
    }

    try {
      const itemsData = items.map(({ tempId, product_name, variant_name, variant_sku, ...rest }) => rest);
      
      if (editingAdjustment) {
        // Update existing adjustment
        const result = await updateAdjustment.mutateAsync({
          adjustment_id: editingAdjustment.id,
          adjustment_date: adjustmentDate,
          adjustment_type: adjustmentType as any,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
          location,
          items: itemsData,
        });
        onSuccess(result.adjustment_number);
      } else {
        // Create new adjustment
        const result = await createAdjustment.mutateAsync({
          adjustment_date: adjustmentDate,
          adjustment_type: adjustmentType,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
          location,
          items: itemsData,
        });
        onSuccess(result.adjustment_number);
      }

      handleClose();
    } catch (error) {
      const action = editingAdjustment ? 'update' : 'membuat';
      showToast('error', error instanceof Error ? error.message : `Gagal ${action} stock adjustment`);
    }
  };

  const handleClose = () => {
    setAdjustmentDate(new Date().toISOString().split('T')[0]);
    setAdjustmentType('');
    setReason('');
    setLocation('SparkStage55');
    setNotes('');
    setItems([]);
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl flex flex-col max-h-[90vh] rounded-xl bg-white shadow-xl">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingAdjustment ? 'Edit Stock Adjustment' : 'Buat Stock Adjustment'}
            </h2>
            <p className="text-sm text-gray-500">
              {editingAdjustment ? 'Update adjustment manual' : 'Manual adjustment untuk gift, KOL, loss, atau gain'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Date & Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipe Adjustment <span className="text-red-500">*</span>
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
                >
                  <option value="">-- Pilih Tipe --</option>
                  <option value="gift">🎁 Gift (Hadiah)</option>
                  <option value="kol">📢 KOL Marketing</option>
                  <option value="loss">📉 Loss (Kehilangan/Rusak)</option>
                  <option value="gain">📈 Gain (Penambahan)</option>
                  <option value="other">🔧 Other (Lainnya)</option>
                </select>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Alasan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={10}
                placeholder="Jelaskan alasan adjustment (minimal 10 karakter)"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
              />
              <p className="text-xs text-gray-500 mt-1">
                {reason.length}/10 karakter minimum
              </p>
            </div>

            {/* Location & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lokasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan optional"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
                />
              </div>
            </div>

            {/* Add Item */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tambah Produk <span className="text-red-500">*</span>
              </label>
              <VariantSelectorWithSearch
                variants={variants}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectVariant={handleAddItem}
                placeholder="Cari dan pilih produk..."
              />
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Item yang Ditambahkan ({items.length})
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.tempId}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {item.variant_name} • SKU: {item.variant_sku}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Quantity Change <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={item.quantity_change}
                              onChange={(e) =>
                                handleQuantityChange(item.tempId, parseInt(e.target.value) || 0)
                              }
                              placeholder="+ atau -"
                              required
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]/20"
                            />
                            {item.quantity_change < 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                Stock -{Math.abs(item.quantity_change)} unit
                              </p>
                            )}
                            {item.quantity_change > 0 && (
                              <p className="text-xs text-green-600 mt-1">
                                Stock +{item.quantity_change} unit
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Catatan Item
                            </label>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => handleNotesChange(item.tempId, e.target.value)}
                              placeholder="Optional"
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]/20"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.tempId)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                        title="Hapus item"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning */}
            {items.some((item) => item.quantity_change < 0) && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-yellow-600 text-[20px]">warning</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-800">Perhatian!</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Adjustment ini akan mengurangi stock produk. Pastikan alasan sudah jelas dan benar.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                (editingAdjustment ? updateAdjustment.isPending : createAdjustment.isPending) ||
                isLoadingDetail ||
                items.length === 0 ||
                !adjustmentType ||
                reason.trim().length < 10
              }
              className="rounded-lg bg-[#ff4b86] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#ff6a9a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingAdjustment
                ? (updateAdjustment.isPending ? 'Mengupdate...' : 'Update Adjustment')
                : (createAdjustment.isPending ? 'Membuat...' : 'Buat Adjustment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
