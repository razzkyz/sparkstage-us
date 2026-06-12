import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { useUserRole } from '../../hooks/useUserRole';
import { useStockAdjustmentList } from '../../hooks/useStockOpnameNew';
import { StockAdjustmentTable } from './stock-adjustments/StockAdjustmentTable';
import { StockAdjustmentFormModal } from './stock-adjustments/StockAdjustmentFormModal';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';

const ITEMS_PER_PAGE = 20;

const StockAdjustments = () => {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { role } = useUserRole();
  const menuSections = useAdminMenuSections();

  const isOwner = role === 'owner';

  const [currentPage, setCurrentPage] = useState(1);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<typeof adjustmentList[0] | null>(null);

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const { data, isLoading, error, refetch } = useStockAdjustmentList(ITEMS_PER_PAGE, offset);

  const adjustmentList = data?.data ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const handleEdit = (adjustment: typeof adjustmentList[0]) => {
    setEditingAdjustment(adjustment);
    setShowFormModal(true);
  };

  const handleCreateSuccess = (adjustmentNumber: string) => {
    const action = editingAdjustment ? 'diupdate' : 'dibuat';
    showToast('success', `Stock adjustment ${adjustmentNumber} berhasil ${action} dan stock telah diupdate!`);
    setShowFormModal(false);
    setEditingAdjustment(null);
    refetch();
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setEditingAdjustment(null);
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="stock-adjustments"
      title="Stock Adjustments"
      subtitle="Kelola adjustment manual untuk gift, KOL, loss, dan gain."
      headerActions={
        !isOwner && (
          <button
            onClick={() => setShowFormModal(true)}
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#ff4b86] px-3 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#ff6a9a] sm:px-4"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="hidden sm:inline">Buat Adjustment</span>
            <span className="sm:hidden">Buat</span>
          </button>
        )
      }
      onLogout={signOut}
    >
      <section className="flex flex-col gap-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error instanceof Error ? error.message : 'Gagal memuat data stock adjustment'}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Total: {totalCount} adjustment</h2>
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
        ) : adjustmentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-16">
            <span className="material-symbols-outlined mb-4 text-6xl text-gray-400">tune</span>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Belum ada stock adjustment</h3>
            <p className="mb-6 text-sm text-gray-500">
              {isOwner
                ? 'Stock adjustment hanya bisa dibuat oleh admin'
                : 'Buat adjustment untuk gift, KOL, loss, atau gain'}
            </p>
            {!isOwner && (
              <button
                onClick={() => setShowFormModal(true)}
                className="rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#ff6a9a]"
              >
                Buat Adjustment
              </button>
            )}
          </div>
        ) : (
          <>
            <StockAdjustmentTable 
              data={adjustmentList}
              onEdit={handleEdit}
            />

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-4">
                <p className="text-sm font-sans text-gray-500">
                  Halaman {currentPage} dari {totalPages} ({totalCount} adjustment)
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

      <StockAdjustmentFormModal
        isOpen={showFormModal}
        onClose={handleCloseModal}
        onSuccess={handleCreateSuccess}
        editingAdjustment={editingAdjustment}
      />
    </AdminLayout>
  );
};

export default StockAdjustments;
