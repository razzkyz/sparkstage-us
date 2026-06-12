import { type StockAdjustment, useDeleteStockAdjustment } from '../../../hooks/useStockOpnameNew';
import { useToast } from '../../../components/Toast';
import { useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useNavigate } from 'react-router-dom';

interface StockAdjustmentTableProps {
  data: StockAdjustment[];
  onEdit: (adjustment: StockAdjustment) => void;
}

export const StockAdjustmentTable = ({ data, onEdit }: StockAdjustmentTableProps) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const deleteAdjustment = useDeleteStockAdjustment();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StockAdjustment | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    
    try {
      await deleteAdjustment.mutateAsync(confirmDelete.id);
      showToast('success', `${confirmDelete.adjustment_number} berhasil dihapus dan stock di-revert`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal hapus adjustment');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (e: React.MouseEvent, adjustment: StockAdjustment) => {
    e.stopPropagation();
    onEdit(adjustment);
  };

  const handleViewDetail = (adjustmentId: number) => {
    navigate(`/admin/stock-adjustments/${adjustmentId}`);
  };

  const typeLabels: Record<string, string> = {
    gift: 'Gift',
    kol: 'KOL Marketing',
    loss: 'Loss',
    gain: 'Gain',
    other: 'Other',
  };

  const typeBadges: Record<string, string> = {
    gift: 'bg-purple-100 text-purple-800',
    kol: 'bg-blue-100 text-blue-800',
    loss: 'bg-red-100 text-red-800',
    gain: 'bg-green-100 text-green-800',
    other: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Nomor
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Tanggal
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Tipe
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Alasan
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Lokasi
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Item
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Dibuat Oleh
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {item.adjustment_number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {new Date(item.adjustment_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    typeBadges[item.adjustment_type] || typeBadges.other
                  }`}
                >
                  {typeLabels[item.adjustment_type] || item.adjustment_type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={item.reason}>
                {item.reason}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {item.location}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {item.items_count} item
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {item.created_by_email || '-'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleEdit(e, item)}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                    title="Edit adjustment"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => handleViewDetail(item.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    title="Lihat detail"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    Detail
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(item);
                    }}
                    disabled={deletingId === item.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Hapus adjustment (stock akan di-revert)"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {deletingId === item.id ? 'hourglass_empty' : 'delete'}
                    </span>
                    {deletingId === item.id ? 'Menghapus...' : 'Hapus'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Hapus Stock Adjustment?"
        message={`Apakah Anda yakin ingin menghapus ${confirmDelete?.adjustment_number}?\n\n⚠️ Stock changes akan di-revert otomatis.\n\nAksi ini tidak bisa dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        icon="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
