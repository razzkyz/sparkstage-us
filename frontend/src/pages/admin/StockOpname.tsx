import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { useUserRole } from '../../hooks/useUserRole';
import { useStockOpnameList } from '../../hooks/useStockOpnameNew';
import { StockOpnameNewFormModal } from './stock-opname/StockOpnameNewFormModal';
import { StockOpnameNewTable } from './stock-opname/StockOpnameNewTable';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';

const ITEMS_PER_PAGE = 20;

const StockOpname = () => {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { role } = useUserRole();
  const menuSections = useAdminMenuSections();
  const navigate = useNavigate();

  const isOwner = role === 'owner';

  const [currentPage, setCurrentPage] = useState(1);
  const [showFormModal, setShowFormModal] = useState(false);

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const { data, isLoading, error, refetch } = useStockOpnameList(ITEMS_PER_PAGE, offset);

  const stockOpnameList = data?.data ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const handleViewDetail = (opnameId: number) => {
    navigate(`/admin/stock-opname/${opnameId}`);
  };

  const handleCreateSuccess = (opnameNumber: string) => {
    showToast('success', `Stock opname ${opnameNumber} berhasil dibuat!`);
    setShowFormModal(false);
    refetch();
  };

  const exportToXLSX = () => {
    if (stockOpnameList.length === 0) {
      showToast('warning', 'Tidak ada data untuk diekspor');
      return;
    }

    try {
      import('xlsx').then((XLSX) => {
        const exportData = stockOpnameList.map((item) => ({
          'Nomor Opname': item.opname_number,
          'Tanggal': new Date(item.opname_date).toLocaleDateString('id-ID'),
          'Lokasi': item.location,
          'Status': {
            draft: 'Draft',
            finalized: 'Finalized',
          }[item.status] || item.status,
          'Jumlah Item': item.items_count || 0,
          'Item dengan Variance': item.variance_count || 0,
          'Dibuat Oleh': item.created_by_email || '-',
          'Tanggal Dibuat': new Date(item.created_at).toLocaleDateString('id-ID'),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Opname');
        XLSX.writeFile(workbook, `stock-opname-${new Date().toISOString().split('T')[0]}.xlsx`);
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
      defaultActiveMenuId="stock-opname"
      title="Stock Opname"
      subtitle="Physical count vs system stock - Compare stock fisik dengan system stock (opening - penjualan + adjustments)."
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
              aria-label="Create Stock Opname"
              className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-main-500 px-3 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-main-400 sm:px-4"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Buat Stock Opname</span>
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
            {error instanceof Error ? error.message : 'Gagal memuat data stock opname'}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500 p-2">
                <span className="material-symbols-outlined text-white text-[24px]">inventory</span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Opname</p>
                <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-green-100 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500 p-2">
                <span className="material-symbols-outlined text-white text-[24px]">check_circle</span>
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Finalized</p>
                <p className="text-2xl font-bold text-green-900">
                  {stockOpnameList.filter((o) => o.status === 'finalized').length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-yellow-50 to-yellow-100 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-500 p-2">
                <span className="material-symbols-outlined text-white text-[24px]">edit</span>
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-700">Draft</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {stockOpnameList.filter((o) => o.status === 'draft').length}
                </p>
              </div>
            </div>
          </div>
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
        ) : stockOpnameList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-16">
            <span className="material-symbols-outlined mb-4 text-6xl text-gray-400">
              fact_check
            </span>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Belum ada stock opname</h3>
            <p className="mb-2 text-sm text-gray-500 text-center max-w-md">
              Stock opname membandingkan physical count dengan system stock
            </p>
            <p className="mb-6 text-xs text-gray-400 text-center max-w-md">
              System Stock = Opening - Penjualan + Adjustments
            </p>
            {!isOwner && (
              <button
                onClick={() => setShowFormModal(true)}
                className="rounded-lg bg-main-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-main-400"
              >
                Buat Stock Opname
              </button>
            )}
          </div>
        ) : (
          <>
            <StockOpnameNewTable
              data={stockOpnameList}
              onViewDetail={handleViewDetail}
            />

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-4">
                <p className="text-sm font-sans text-gray-500">
                  Halaman {currentPage} dari {totalPages} ({totalCount} opname)
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-main-500 hover:text-main-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-main-500 hover:text-main-500 disabled:cursor-not-allowed disabled:opacity-40"
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

      <StockOpnameNewFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </AdminLayout>
  );
};

export default StockOpname;
