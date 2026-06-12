import { useState } from 'react';
import { motion } from 'framer-motion';

export type CostumeCondition = 'normal' | 'stained' | 'button_missing' | 'damaged' | 'severely_damaged';
export type ItemReturnStatus = 'returned' | 'laundry' | 'rejected';

export interface DRReturnModalProps {
  order: any;
  items: any[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    returnTime: Date,
    conditions: Record<number, CostumeCondition>,
    itemStatuses: Record<number, ItemReturnStatus>,
    rejectPhotos: Record<number, File>
  ) => Promise<void>;
}

export function DRReturnModal({ order, items, isOpen, onClose, onSubmit }: DRReturnModalProps) {
  const [returnTime, setReturnTime] = useState<Date>(new Date());
  const [conditions, setConditions] = useState<Record<number, CostumeCondition>>({});
  const [itemStatuses, setItemStatuses] = useState<Record<number, ItemReturnStatus>>({});
  const [rejectPhotos, setRejectPhotos] = useState<Record<number, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit(returnTime, conditions, itemStatuses, rejectPhotos);
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Proses Pengembalian Dressing Room</h2>
          <p className="text-sm text-gray-600">Order: {order.order_number}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Return Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Waktu Kembali</label>
            <input
              type="datetime-local"
              value={new Date(returnTime.getTime() - returnTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              onChange={(e) => setReturnTime(new Date(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
            />
          </div>

          {/* Item Conditions */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Kondisi Item & Status Pengembalian</label>
            <div className="space-y-3">
              {items.map((item: any) => {
                const isRejected = itemStatuses[item.id] === 'rejected';
                const productName = item.product_variants?.products?.name || 'Item';
                const variantName = item.product_variants?.name || '';
                
                return (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <p className="font-medium text-gray-900">{productName} {variantName ? ` - ${variantName}` : ''}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status Barang</label>
                        <select
                          value={itemStatuses[item.id] || 'returned'}
                          onChange={(e) => setItemStatuses({ ...itemStatuses, [item.id]: e.target.value as ItemReturnStatus })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4b86] text-sm bg-white"
                        >
                          <option value="returned">Dikembalikan (Normal)</option>
                          <option value="laundry">Masuk Laundry</option>
                          <option value="rejected">Reject / Rusak</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Kondisi (Denda)</label>
                        <select
                          value={conditions[item.id] || 'normal'}
                          onChange={(e) => setConditions({ ...conditions, [item.id]: e.target.value as CostumeCondition })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4b86] text-sm bg-white"
                        >
                          <option value="normal">Normal</option>
                          <option value="stained">Bernoda (-10rb)</option>
                          <option value="button_missing">Kancing Copot (-10rb)</option>
                          <option value="damaged">Rusak Ringan (-10rb)</option>
                          <option value="severely_damaged">Rusak Parah (Deposit Hangus)</option>
                        </select>
                      </div>
                    </div>

                    {isRejected && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <label className="block text-xs font-semibold text-red-900 mb-2">
                          Upload Foto Bukti Reject (Wajib)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setRejectPhotos({ ...rejectPhotos, [item.id]: file });
                            }
                          }}
                          className="block w-full text-sm text-red-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200"
                        />
                        {rejectPhotos[item.id] && (
                          <p className="mt-2 text-xs text-red-700 font-medium">✓ File terpilih: {rejectPhotos[item.id].name}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#ff4b86] text-white font-semibold rounded-lg hover:bg-[#ff6a9a] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Memproses...' : 'Proses Pengembalian'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
