import { type StockOpname, useDeleteStockOpname, useFinalizeStockOpname } from '../../../hooks/useStockOpnameNew';
import { useToast } from '../../../components/Toast';
import { useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

interface StockOpnameNewTableProps {
  data: StockOpname[];
  onViewDetail: (opnameId: number) => void;
}

export const StockOpnameNewTable = ({ data, onViewDetail }: StockOpnameNewTableProps) => {
  const { showToast } = useToast();
  const deleteOpname = useDeleteStockOpname();
  const finalizeOpname = useFinalizeStockOpname();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StockOpname | null>(null);
  const [confirmFinalize, setConfirmFinalize] = useState<StockOpname | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    
    try {
      await deleteOpname.mutateAsync(confirmDelete.id);
      showToast('success', `${confirmDelete.opname_number} berhasil dihapus`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal hapus stock opname');
    } finally {
      setDeletingId(null);
    }
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
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Nomor Opname
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
              Total Item
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Item Variance
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
                {item.opname_number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {new Date(item.opname_date).toLocaleDateString('id-ID', {
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
                    item.status === 'finalized'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {item.status === 'finalized' ? 'Finalized' : 'Draft'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <span className="font-medium">{item.items_count}</span> item
              </td>
              <td className="px-4 py-3">
                {item.variance_count > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    {item.variance_count} variance
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Match
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <div className="flex flex-col">
                  <span className="font-medium">{item.created_by_email || '-'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {item.status === 'draft' && (
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
                    title="Hapus stock opname"
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
        title="Hapus Stock Opname?"
        message={`Apakah Anda yakin ingin menghapus ${confirmDelete?.opname_number}?\n\n⚠️ Semua item akan ikut terhapus.\n\nAksi ini tidak bisa dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        icon="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

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
    </div>
  );
};
