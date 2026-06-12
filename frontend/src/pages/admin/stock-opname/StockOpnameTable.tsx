import type { StockOpname } from '../../../types';
import { useFinalizeStockOpname } from '../../../hooks/useStockOpnameNew';
import { useToast } from '../../../components/Toast';
import { useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

interface StockOpnameTableProps {
  data: StockOpname[];
  onViewDetail: (opnameId: number) => void;
  onEdit: (opnameId: number) => void;
  onDelete: (opnameId: number) => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

export const StockOpnameTable = ({ data, onViewDetail, onDelete, canDelete = true }: StockOpnameTableProps) => {
  const { showToast } = useToast();
  const finalizeOpname = useFinalizeStockOpname();
  const [confirmFinalize, setConfirmFinalize] = useState<StockOpname | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleFinalize = async () => {
    if (!confirmFinalize) return;

    try {
      await finalizeOpname.mutateAsync(confirmFinalize.id);
      showToast('success', `${confirmFinalize.opname_number} berhasil di-finalize! Stock telah disesuaikan.`);
      setConfirmFinalize(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal finalize opname');
      setConfirmFinalize(null);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Nomor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Lokasi
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Total Item
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Item Variance
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Dibuat Oleh
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item) => {
                const isDraft = item.status === 'draft' || !item.status;
                const isFinalized = item.status === 'finalized';
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                      {item.opname_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(item.transaction_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.location}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isFinalized
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {isFinalized ? '✓ Finalized' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      {item.items_count || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {/* We'll show variance count badge here if available */}
                      <span className="text-sm text-gray-500">-</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.created_by_email || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {isDraft && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmFinalize(item);
                            }}
                            disabled={finalizeOpname.isPending}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Finalize opname dan sesuaikan stock"
                          >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Finalize
                          </button>
                        )}
                        
                        <button
                          onClick={() => onViewDetail(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Detail
                        </button>
                        
                        {canDelete && (
                          <button
                            onClick={() => onDelete(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                            title="Hapus stock opname"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Finalize Dialog */}
      <ConfirmDialog
        isOpen={!!confirmFinalize}
        title="Finalize Stock Opname?"
        message={`Apakah Anda yakin ingin finalize ${confirmFinalize?.opname_number}?\n\n✅ Stock akan disesuaikan berdasarkan variance\n⚠️ Setelah di-finalize, opname tidak bisa diedit lagi\n\nAksi ini akan mengubah stock actual di database.`}
        confirmText="Ya, Finalize"
        cancelText="Batal"
        confirmButtonClass="bg-green-600 hover:bg-green-700"
        icon="warning"
        onConfirm={handleFinalize}
        onCancel={() => setConfirmFinalize(null)}
      />
    </>
  );
};
