import { useState, useEffect } from 'react';
import {
  useCreateStockOpname,
  useCalculateSystemStock,
  type StockOpnameItem,
  type SystemStockCalculation,
} from '../../../hooks/useStockOpnameNew';
import { useToast } from '../../../components/Toast';

interface StockOpnameNewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (opnameNumber: string) => void;
}

interface OpnameItemRow extends StockOpnameItem {
  tempId: string;
  product_name?: string;
  variant_name?: string;
  variant_sku?: string;
}

export const StockOpnameNewFormModal = ({
  isOpen,
  onClose,
  onSuccess,
}: StockOpnameNewFormModalProps) => {
  const { showToast } = useToast();
  const createOpname = useCreateStockOpname();

  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('SparkStage55');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OpnameItemRow[]>([]);

  // Auto-fetch system stock when date changes
  const { data: systemStockData, isLoading: isLoadingSystemStock, error: systemStockError } = useCalculateSystemStock(
    opnameDate,
    location
  );

  // Auto-populate items when system stock data loads
  useEffect(() => {
    if (systemStockData && systemStockData.length > 0 && items.length === 0) {
      const newItems: OpnameItemRow[] = systemStockData.map((stock: SystemStockCalculation) => ({
        tempId: `temp-${stock.variant_id}`,
        product_id: stock.product_id,
        variant_id: stock.variant_id,
        opening_stock: stock.opening_stock,
        sold_quantity: stock.sold_quantity,
        adjustment_quantity: stock.adjustment_quantity,
        system_stock: stock.system_stock,
        physical_count: stock.system_stock, // Default to system stock
        variance_reason: '',
        unit: 'pcs',
        notes: '',
        product_name: stock.product_name,
        variant_name: stock.variant_name,
        variant_sku: stock.variant_sku,
      }));
      setItems(newItems);
    }
  }, [systemStockData, items.length]);

  const handlePhysicalCountChange = (tempId: string, physicalCount: number) => {
    setItems(
      items.map((item) =>
        item.tempId === tempId
          ? { ...item, physical_count: Math.max(0, physicalCount) }
          : item
      )
    );
  };

  const handleVarianceReasonChange = (tempId: string, reason: string) => {
    setItems(
      items.map((item) =>
        item.tempId === tempId ? { ...item, variance_reason: reason } : item
      )
    );
  };

  const handleNotesChange = (tempId: string, notes: string) => {
    setItems(items.map((item) => (item.tempId === tempId ? { ...item, notes } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      showToast('error', 'Tidak ada item untuk di-opname');
      return;
    }

    // Validate variance reasons
    const itemsWithVariance = items.filter(
      (item) => item.physical_count !== item.system_stock
    );
    const missingReasons = itemsWithVariance.filter(
      (item) => !item.variance_reason || item.variance_reason.trim().length < 10
    );

    if (missingReasons.length > 0) {
      showToast(
        'error',
        `${missingReasons.length} item dengan variance harus memiliki alasan (min 10 karakter)`
      );
      return;
    }

    try {
      const result = await createOpname.mutateAsync({
        opname_date: opnameDate,
        location,
        notes: notes || undefined,
        items: items.map((item) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { tempId, product_name, variant_name, variant_sku, ...rest } = item;
          return rest;
        }),
      });

      onSuccess(result.opname_number);
      handleClose();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal membuat stock opname');
    }
  };

  const handleClose = () => {
    setOpnameDate(new Date().toISOString().split('T')[0]);
    setLocation('SparkStage55');
    setNotes('');
    setItems([]);
    onClose();
  };

  if (!isOpen) return null;

  const totalVariances = items.filter((item) => item.physical_count !== item.system_stock).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl flex flex-col max-h-[90vh] rounded-xl bg-white shadow-xl">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Buat Stock Opname</h2>
            <p className="text-sm text-gray-500">
              Bandingkan physical count dengan system stock (opening - penjualan + adjustments)
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
                  Tanggal Opname <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={opnameDate}
                  onChange={(e) => {
                    setOpnameDate(e.target.value);
                    setItems([]); // Reset items when date changes
                  }}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-main-500 focus:outline-none focus:ring-2 focus:ring-main-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lokasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setItems([]); // Reset items when location changes
                  }}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-main-500 focus:outline-none focus:ring-2 focus:ring-main-500/20"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan (optional)"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-main-500 focus:outline-none focus:ring-2 focus:ring-main-500/20"
              />
            </div>

            {/* Loading State */}
            {isLoadingSystemStock && (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-main-500"></div>
                  <span>Memuat system stock...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {systemStockError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600 text-[28px]">error</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-900 mb-2">
                      Error memuat system stock
                    </p>
                    <p className="text-xs text-red-700 mb-3">
                      {systemStockError instanceof Error ? systemStockError.message : 'Database error'}
                    </p>
                    <div className="rounded bg-red-100 border border-red-200 p-3 text-xs text-red-800 space-y-1">
                      <p className="font-semibold">Kemungkinan penyebab:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Database migrations belum di-push</li>
                        <li>RPC function belum di-deploy</li>
                        <li>Parameter format salah</li>
                      </ul>
                      <p className="font-semibold mt-3">Solusi:</p>
                      <code className="block bg-red-200 rounded px-2 py-1 mt-1">
                        npm run supabase:db:push
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            {items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-gray-200 pt-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-700">Total Item</p>
                  <p className="text-2xl font-bold text-blue-900">{items.length}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-700">Match</p>
                  <p className="text-2xl font-bold text-green-900">
                    {items.length - totalVariances}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <p className="text-xs font-medium text-orange-700">Variance</p>
                  <p className="text-2xl font-bold text-orange-900">{totalVariances}</p>
                </div>
              </div>
            )}

            {/* Items List */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Item Stock Opname ({items.length})
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {items.map((item) => {
                    const variance = item.physical_count - item.system_stock;
                    const hasVariance = variance !== 0;

                    return (
                      <div
                        key={item.tempId}
                        className={`rounded-lg border p-4 ${
                          hasVariance
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        {/* Product Info */}
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {item.variant_name} • SKU: {item.variant_sku}
                          </p>
                        </div>

                        {/* Stock Calculation Display */}
                        <div className="mb-3 grid grid-cols-2 md:grid-cols-5 gap-2 rounded-lg border border-gray-300 bg-white p-3 text-xs">
                          <div>
                            <p className="text-gray-500 font-medium">Opening</p>
                            <p className="text-lg font-bold text-gray-900">{item.opening_stock}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium">Terjual</p>
                            <p className="text-lg font-bold text-red-600">-{item.sold_quantity}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium">Adjustment</p>
                            <p
                              className={`text-lg font-bold ${
                                item.adjustment_quantity >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {item.adjustment_quantity >= 0 ? '+' : ''}
                              {item.adjustment_quantity}
                            </p>
                          </div>
                          <div className="border-l border-gray-300 pl-2">
                            <p className="text-gray-500 font-medium">System Stock</p>
                            <p className="text-lg font-bold text-blue-600">{item.system_stock}</p>
                          </div>
                          <div className="border-l border-gray-300 pl-2">
                            <p className="text-gray-500 font-medium">Variance</p>
                            <p
                              className={`text-lg font-bold ${
                                variance === 0
                                  ? 'text-green-600'
                                  : variance > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {variance === 0 ? '✓ 0' : variance > 0 ? `+${variance}` : variance}
                            </p>
                          </div>
                        </div>

                        {/* Input Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Physical Count <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.physical_count}
                              onChange={(e) =>
                                handlePhysicalCountChange(item.tempId, parseInt(e.target.value) || 0)
                              }
                              required
                              className={`w-full rounded border px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 ${
                                hasVariance
                                  ? 'border-orange-400 bg-white focus:border-orange-500 focus:ring-orange-500/20'
                                  : 'border-gray-300 bg-white focus:border-main-500 focus:ring-main-500/20'
                              }`}
                            />
                          </div>

                          {hasVariance && (
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-orange-700 mb-1">
                                Alasan Variance <span className="text-red-500">*</span>
                                <span className="ml-1 text-gray-500">(min 10 karakter)</span>
                              </label>
                              <input
                                type="text"
                                value={item.variance_reason || ''}
                                onChange={(e) =>
                                  handleVarianceReasonChange(item.tempId, e.target.value)
                                }
                                placeholder="Misal: Hilang 2 pcs untuk KOL marketing"
                                required={hasVariance}
                                minLength={10}
                                className="w-full rounded border border-orange-400 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                              />
                            </div>
                          )}

                          {!hasVariance && (
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Catatan Item (optional)
                              </label>
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) => handleNotesChange(item.tempId, e.target.value)}
                                placeholder="Catatan tambahan"
                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-main-500 focus:outline-none focus:ring-2 focus:ring-main-500/20"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State - Only show if no error and no data */}
            {!isLoadingSystemStock && !systemStockError && items.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 p-8 text-center">
                <span className="material-symbols-outlined text-5xl text-orange-600 mb-3">warning</span>
                <p className="text-base font-bold text-orange-900 mb-2">
                  Tidak ada stock opening untuk tanggal dan lokasi ini
                </p>
                <p className="text-sm text-orange-800 mb-4">
                  Stock opening harus sudah dibuat dan di-<strong>CONFIRM</strong> sebelum melakukan opname
                </p>
                
                <div className="rounded-lg bg-white border border-orange-200 p-4 text-left space-y-2 mb-4">
                  <p className="text-xs font-semibold text-orange-900">Checklist:</p>
                  <div className="space-y-1 text-xs text-orange-800">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] mt-0.5">check_circle</span>
                      <span>Stock opening sudah dibuat untuk <strong>tanggal: {opnameDate}</strong>?</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] mt-0.5">check_circle</span>
                      <span>Lokasi sama: <strong>{location}</strong>?</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] mt-0.5 text-red-600">priority_high</span>
                      <span className="font-bold text-red-700">Status stock opening: <strong>"Confirmed"</strong>? (bukan "Draft")</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 rounded bg-yellow-50 border border-yellow-300 p-3">
                    <p className="text-xs font-semibold text-yellow-900 mb-1">📌 Cara Confirm:</p>
                    <ol className="list-decimal list-inside text-xs text-yellow-800 space-y-1">
                      <li>Buka Stock Opening page</li>
                      <li>Klik pada stock opening yang sudah dibuat</li>
                      <li>Klik tombol hijau <strong>"Confirm Opening"</strong></li>
                      <li>Kembali ke Stock Opname dan refresh</li>
                    </ol>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.open('/admin/stock-opening', '_blank');
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                  Buka Stock Opening (Tab Baru)
                </button>
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
              disabled={createOpname.isPending || items.length === 0}
              className="rounded-lg bg-main-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-main-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createOpname.isPending ? 'Membuat...' : 'Buat Stock Opname'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
