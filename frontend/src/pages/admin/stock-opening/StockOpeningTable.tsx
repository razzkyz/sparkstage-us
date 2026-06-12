import { type StockOpening, useConfirmStockOpening, useDeleteStockOpening } from '../../../hooks/useStockOpnameNew';
import { useToast } from '../../../components/Toast';
import { useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

interface StockOpeningTableProps {
  data: StockOpening[];
  onViewDetail: (openingId: number) => void;
  onEdit: (opening: StockOpening) => void;
}

export const StockOpeningTable = ({ data, onViewDetail, onEdit }: StockOpeningTableProps) => {
  const { showToast } = useToast();
  const confirmOpening = useConfirmStockOpening();
  const deleteOpening = useDeleteStockOpening();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StockOpening | null>(null);

  const handleConfirm = async (e: React.MouseEvent, opening: StockOpening) => {
    e.stopPropagation();
    
    try {
      await confirmOpening.mutateAsync(opening.id);
      showToast('success', `${opening.opening_number} berhasil di-confirm!`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal confirm');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);

    try {
      await deleteOpening.mutateAsync(confirmDelete.id);
      showToast('success', `${confirmDelete.opening_number} berhasil dihapus`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal hapus');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (e: React.MouseEvent, opening: StockOpening) => {
    e.stopPropagation();
    
    if (opening.status === 'confirmed') {
      showToast('warning', 'Tidak bisa edit stock opening yang sudah confirmed');
      return;
    }
    
    onEdit(opening);
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Nomor Opening
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
            <tr
              key={item.id}
              className="transition-colors hover:bg-gray-50"
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {item.opening_number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {new Date(item.opening_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {item.location}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {item.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {item.items_count} item
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {item.created_by_email || '-'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {item.status === 'draft' && (
                    <>
                      <button
                        onClick={(e) => handleConfirm(e, item)}
                        disabled={confirmOpening.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Confirm opening agar bisa digunakan untuk opname"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Confirm
                      </button>
                      <button
                        onClick={(e) => handleEdit(e, item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                        title="Edit stock opening"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onViewDetail(item.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
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
                    title="Hapus stock opening"
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
        title="Hapus Stock Opening?"
        message={`Apakah Anda yakin ingin menghapus ${confirmDelete?.opening_number}?\n\n⚠️ Semua item akan ikut terhapus.\n\nAksi ini tidak bisa dibatalkan.`}
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
