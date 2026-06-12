import { useState, useEffect } from 'react';
import { useCreateStockOpening, useUpdateStockOpening, useStockOpeningDetail, type StockOpeningItem, type StockOpening } from '../../../hooks/useStockOpnameNew';
import { useInventoryProducts } from '../../../hooks/useInventoryProducts';
import { useToast } from '../../../components/Toast';
import { VariantSelectorWithSearch } from './VariantSelectorWithSearch';

interface StockOpeningFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (openingNumber: string) => void;
  editingOpening?: StockOpening | null;
}

interface OpeningItemRow extends StockOpeningItem {
  tempId: string;
  product_name?: string;
  variant_name?: string;
  variant_sku?: string;
}

export const StockOpeningFormModal = ({ isOpen, onClose, onSuccess, editingOpening }: StockOpeningFormModalProps) => {
  const { showToast } = useToast();
  const createOpening = useCreateStockOpening();
  const updateOpening = useUpdateStockOpening();
  
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('SparkStage55');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OpeningItemRow[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useInventoryProducts('');
  
  // Fetch detail if editing
  const { data: openingDetail } = useStockOpeningDetail(editingOpening?.id || null);
  
  // Load data when editing
  useEffect(() => {
    if (editingOpening && openingDetail) {
      setOpeningDate(editingOpening.opening_date);
      setLocation(editingOpening.location);
      setNotes(editingOpening.notes || '');
      
      // Load items
      if (openingDetail.items && openingDetail.items.length > 0) {
        const loadedItems: OpeningItemRow[] = openingDetail.items.map((item, index) => ({
          tempId: `existing-${item.id}-${index}`,
          product_id: item.product_id,
          variant_id: item.variant_id,
          opening_quantity: item.opening_quantity,
          unit: item.unit,
          notes: item.notes || '',
          product_name: item.product_name,
          variant_name: item.variant_name,
          variant_sku: item.variant_sku,
        }));
        setItems(loadedItems);
      }
    } else if (!isOpen) {
      // Reset when modal closes
      setOpeningDate(new Date().toISOString().split('T')[0]);
      setLocation('SparkStage55');
      setNotes('');
      setItems([]);
    }
  }, [editingOpening, openingDetail, isOpen]);
  
  const variants = productsData?.data?.map((p) => ({
    variant_id: p.variant_id,
    product_id: p.product_id,
    product_name: p.product_name,
    variant_name: p.variant_name,
    variant_sku: p.variant_sku,
    current_stock: p.current_stock,
  })) || [];

  // Filter variants based on search query
  const filteredVariants = searchQuery 
    ? variants.filter((v) => {
        const searchText = `${v.product_name} ${v.variant_name} ${v.variant_sku}`.toLowerCase();
        return searchText.includes(searchQuery.toLowerCase());
      })
    : variants;

  const handleAddItem = (variantId: number) => {
    const variant = variants.find((v) => v.variant_id === variantId);
    if (!variant) return;

    // Check if already added
    if (items.some((item) => item.variant_id === variantId)) {
      showToast('warning', 'Variant sudah ditambahkan');
      return;
    }

    const newItem: OpeningItemRow = {
      tempId: `temp-${Date.now()}`,
      product_id: variant.product_id,
      variant_id: variant.variant_id,
      opening_quantity: 0,
      unit: 'pcs',
      notes: '',
      product_name: variant.product_name,
      variant_name: variant.variant_name,
      variant_sku: variant.variant_sku,
    };

    setItems([...items, newItem]);
    setSearchQuery(''); // Reset search
  };

  const handleRemoveItem = (tempId: string) => {
    setItems(items.filter((item) => item.tempId !== tempId));
  };

  const handleQuantityChange = (tempId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.tempId === tempId ? { ...item, opening_quantity: Math.max(0, quantity) } : item
      )
    );
  };

  const handleNotesChange = (tempId: string, notes: string) => {
    setItems(items.map((item) => (item.tempId === tempId ? { ...item, notes } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      showToast('error', 'Tambahkan minimal 1 item');
      return;
    }

    if (items.some((item) => item.opening_quantity <= 0)) {
      showToast('error', 'Semua item harus memiliki quantity > 0');
      return;
    }

    try {
      const itemsData = items.map(({ tempId, product_name, variant_name, variant_sku, ...rest }) => rest);
      
      if (editingOpening) {
        // Update existing opening
        const result = await updateOpening.mutateAsync({
          opening_id: editingOpening.id,
          opening_date: openingDate,
          location,
          notes: notes || undefined,
          items: itemsData,
        });
        onSuccess(result.opening_number);
      } else {
        // Create new opening
        const result = await createOpening.mutateAsync({
          opening_date: openingDate,
          location,
          notes: notes || undefined,
          items: itemsData,
        });
        onSuccess(result.opening_number);
      }

      handleClose();
    } catch (error) {
      const action = editingOpening ? 'update' : 'membuat';
      showToast('error', error instanceof Error ? error.message : `Gagal ${action} stock opening`);
    }
  };

  const handleClose = () => {
    setOpeningDate(new Date().toISOString().split('T')[0]);
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
              {editingOpening ? 'Edit Stock Opening' : 'Buat Stock Opening'}
            </h2>
            <p className="text-sm text-gray-500">
              {editingOpening ? 'Update data stock opening' : 'Input stock awal harian'}
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
            {/* Date & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal Opening <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
                />
              </div>

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
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Catatan
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan (optional)"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
              />
            </div>

            {/* Add Item */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tambah Produk <span className="text-red-500">*</span>
              </label>
              {isLoadingProducts ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-main-500"></div>
                  Memuat produk...
                </div>
              ) : productsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-800 mb-1">Error memuat produk</p>
                  <p className="text-xs text-red-600">
                    {productsError instanceof Error ? productsError.message : 'Gagal fetch data dari database'}
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Coba refresh halaman atau hubungi IT support.
                  </p>
                </div>
              ) : variants.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                  <span className="material-symbols-outlined mb-2 text-4xl text-gray-400">
                    inventory_2
                  </span>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Tidak ada produk di database
                  </p>
                  <p className="text-xs text-gray-500">
                    Tambahkan produk terlebih dahulu di menu "Stok & Produk"
                  </p>
                </div>
              ) : (
                <VariantSelectorWithSearch
                  variants={filteredVariants}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectVariant={handleAddItem}
                  placeholder="Cari dan pilih produk..."
                />
              )}
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
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.opening_quantity}
                              onChange={(e) =>
                                handleQuantityChange(item.tempId, parseInt(e.target.value) || 0)
                              }
                              required
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]/20"
                            />
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
              disabled={createOpening.isPending || items.length === 0}
              className="rounded-lg bg-[#ff4b86] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#ff6a9a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingOpening
                ? (updateOpening.isPending ? 'Mengupdate...' : 'Update Opening')
                : (createOpening.isPending ? 'Membuat...' : 'Simpan Draft')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
