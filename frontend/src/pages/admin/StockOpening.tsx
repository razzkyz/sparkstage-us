import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { useUserRole } from '../../hooks/useUserRole';
import { useStockOpeningList } from '../../hooks/useStockOpnameNew';
import { StockOpeningTable } from './stock-opening/StockOpeningTable';
import { StockOpeningFormModal } from './stock-opening/StockOpeningFormModal';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';

const ITEMS_PER_PAGE = 20;

const StockOpening = () => {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { role } = useUserRole();
  const menuSections = useAdminMenuSections();
  const navigate = useNavigate();

  const isOwner = role === 'owner';

  const [currentPage, setCurrentPage] = useState(1);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingOpening, setEditingOpening] = useState<typeof stockOpeningList[0] | null>(null);

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const { data, isLoading, error, refetch } = useStockOpeningList(ITEMS_PER_PAGE, offset);

  const stockOpeningList = data?.data ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const handleViewDetail = (openingId: number) => {
    navigate(`/admin/stock-opening/${openingId}`);
  };

  const handleEdit = (opening: typeof stockOpeningList[0]) => {
    setEditingOpening(opening);
    setShowFormModal(true);
  };

  const handleCreateSuccess = (openingNumber: string) => {
    const action = editingOpening ? 'diupdate' : 'dibuat';
    showToast('success', `Stock opening ${openingNumber} berhasil ${action}!`);
    setShowFormModal(false);
    setEditingOpening(null);
    refetch();
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setEditingOpening(null);
  };

  const exportToXLSX = () => {
    if (stockOpeningList.length === 0) {
      showToast('warning', 'Tidak ada data untuk diekspor');
      return;
    }

    try {
      import('xlsx').then((XLSX) => {
        const exportData = stockOpeningList.map((item) => ({
          'Nomor Opening': item.opening_number,
          'Tanggal': new Date(item.opening_date).toLocaleDateString('id-ID'),
          'Lokasi': item.location,
          'Status': {
            draft: 'Draft',
            confirmed: 'Confirmed',
          }[item.status] || item.status,
          'Jumlah Item': item.items_count || 0,
          'Dibuat Oleh': item.created_by_email || '-',
          'Tanggal Dibuat': new Date(item.created_at).toLocaleDateString('id-ID'),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Opening');
        XLSX.writeFile(workbook, `stock-opening-${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast('success', 'Data berhasil diekspor');
      });
    } catch (err) {
      showToast('error', 'Gagal mengekspor data');
    }
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="stock-opening"
      title="Stock Opening"
      subtitle="Kelola stock awal harian untuk setiap produk variant."
      headerActions={
        <div className="flex gap-2">
          <button
            onClick={exportToXLSX}
            aria-label="Export to XLSX"
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-green-600 px-3 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-green-700 sm:px-4"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span className="hidden sm:inline">Export XLSX</span>
            <span className="sm:hidden">Export</span>
          </button>
          {!isOwner && (
            <button
              onClick={() => setShowFormModal(true)}
              aria-label="Create Stock Opening"
              className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#ff4b86] px-3 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#ff6a9a] sm:px-4"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Buat Stock Opening</span>
              <span className="sm:hidden">Buat</span>
            </button>
          )}
        </div>
      }
      onLogout={signOut}
    >
      <section className="flex flex-col gap-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error instanceof Error ? error.message : 'Gagal memuat data stock opening'}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Total: {totalCount} opening
          </h2>
        </div>

        {isLoading ? (
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <tbody>
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
              </tbody>
            </table>
          </div>
        ) : stockOpeningList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-16">
            <span className="material-symbols-outlined mb-4 text-6xl text-gray-400">
              inventory_2
            </span>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Belum ada stock opening</h3>
            <p className="mb-6 text-sm text-gray-500">
              {isOwner
                ? 'Stock opening hanya bisa dibuat oleh admin'
                : 'Mulai dengan membuat stock opening untuk hari ini'}
            </p>
            {!isOwner && (
              <button
                onClick={() => setShowFormModal(true)}
                className="rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#ff6a9a]"
              >
                Buat Stock Opening
              </button>
            )}
          </div>
        ) : (
          <>
            <StockOpeningTable
              data={stockOpeningList}
              onViewDetail={handleViewDetail}
              onEdit={handleEdit}
            />

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-4">
                <p className="text-sm font-sans text-gray-500">
                  Halaman {currentPage} dari {totalPages} ({totalCount} opening)
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <StockOpeningFormModal
        isOpen={showFormModal}
        onClose={handleCloseModal}
        onSuccess={handleCreateSuccess}
        editingOpening={editingOpening}
      />
    </AdminLayout>
  );
};

export default StockOpening;
