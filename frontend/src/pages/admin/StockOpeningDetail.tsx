import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { useStockOpeningDetail, useConfirmStockOpening } from '../../hooks/useStockOpnameNew';

const StockOpeningDetail = () => {
  const { openingId } = useParams<{ openingId: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const menuSections = useAdminMenuSections();

  const { data: opening, isLoading, error } = useStockOpeningDetail(
    openingId ? parseInt(openingId) : null
  );
  
  const confirmOpening = useConfirmStockOpening();

  const handleConfirm = async () => {
    if (!openingId) return;
    
    try {
      await confirmOpening.mutateAsync(parseInt(openingId));
      showToast('success', `Stock opening ${opening?.opening_number} berhasil di-confirm!`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal confirm stock opening');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={menuSections}
        defaultActiveMenuId="stock-opening"
        title="Stock Opening Detail"
        subtitle="Loading..."
        onLogout={signOut}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ff4b86] border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Memuat data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !opening) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={menuSections}
        defaultActiveMenuId="stock-opening"
        title="Stock Opening Detail"
        subtitle="Error"
        onLogout={signOut}
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {error instanceof Error ? error.message : 'Stock opening tidak ditemukan'}
          </p>
          <button
            onClick={() => navigate('/admin/stock-opening')}
            className="mt-4 text-sm font-semibold text-red-600 hover:text-red-700"
          >
            ← Kembali ke List
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="stock-opening"
      title={opening.opening_number}
      subtitle="Detail Stock Opening"
      headerActions={
        <div className="flex items-center gap-3">
          {opening.status === 'draft' && (
            <button
              onClick={handleConfirm}
              disabled={confirmOpening.isPending}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {confirmOpening.isPending ? 'Confirming...' : 'Confirm Opening'}
            </button>
          )}
          <button
            onClick={() => navigate('/admin/stock-opening')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Kembali
          </button>
        </div>
      }
      onLogout={signOut}
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Nomor Opening</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{opening.opening_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tanggal</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {new Date(opening.opening_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Lokasi</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{opening.location}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <span
                className={`inline-flex mt-1 rounded-full px-3 py-1 text-sm font-semibold ${
                  opening.status === 'confirmed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {opening.status === 'confirmed' ? 'Confirmed' : 'Draft'}
              </span>
            </div>
          </div>

          {opening.notes && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <p className="text-sm font-medium text-gray-500">Catatan</p>
              <p className="mt-1 text-sm text-gray-700">{opening.notes}</p>
            </div>
          )}

          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Dibuat Oleh:</span>{' '}
                <span className="font-medium text-gray-900">{opening.created_by_email || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Dibuat:</span>{' '}
                <span className="font-medium text-gray-900">
                  {new Date(opening.created_at).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Item Opening ({opening.items?.length || 0})
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Produk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Variant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Opening Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Catatan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {opening.items && opening.items.length > 0 ? (
                  opening.items.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.variant_name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {item.variant_sku}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {item.opening_quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Tidak ada item
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {opening.items && opening.items.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Total Items</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{opening.items.length}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Total Quantity</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {opening.items.reduce((sum, item) => sum + item.opening_quantity, 0)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Status</p>
                <span
                  className={`inline-flex mt-1 rounded-full px-3 py-1 text-sm font-semibold ${
                    opening.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {opening.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StockOpeningDetail;
