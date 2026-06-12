import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { useStockOpnameDetail } from '../../hooks/useStockOpnameNew';

const StockOpnameDetail = () => {
  const { opnameId } = useParams<{ opnameId: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const menuSections = useAdminMenuSections();

  const { data: opname, isLoading, error } = useStockOpnameDetail(
    opnameId ? parseInt(opnameId) : null
  );

  const exportToXLSX = () => {
    if (!opname || !opname.items || opname.items.length === 0) {
      showToast('warning', 'Tidak ada data untuk diekspor');
      return;
    }

    try {
      import('xlsx').then((XLSX) => {
        const exportData = opname.items.map((item) => ({
          'Produk': item.product_name,
          'Variant': item.variant_name,
          'SKU': item.variant_sku,
          'Opening Stock': item.opening_stock,
          'Terjual': item.sold_quantity,
          'Adjustment': item.adjustment_quantity,
          'System Stock': item.system_stock,
          'Physical Count': item.physical_count,
          'Variance': item.variance,
          'Variance Reason': item.variance_reason || '-',
          'Unit': item.unit,
          'Catatan': item.notes || '-',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Opname Detail');
        XLSX.writeFile(
          workbook,
          `stock-opname-${opname.opname_number}-${new Date().toISOString().split('T')[0]}.xlsx`
        );
        showToast('success', 'Data berhasil diekspor');
      });
    } catch {
      showToast('error', 'Gagal mengekspor data');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={menuSections}
        defaultActiveMenuId="stock-opname"
        title="Stock Opname Detail"
        subtitle="Loading..."
        onLogout={signOut}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-main-500 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Memuat data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !opname) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={menuSections}
        defaultActiveMenuId="stock-opname"
        title="Stock Opname Detail"
        subtitle="Error"
        onLogout={signOut}
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {error instanceof Error ? error.message : 'Stock opname tidak ditemukan'}
          </p>
          <button
            onClick={() => navigate('/admin/stock-opname')}
            className="mt-4 text-sm font-semibold text-red-600 hover:text-red-700"
          >
            ← Kembali ke List
          </button>
        </div>
      </AdminLayout>
    );
  }

  const itemsWithVariance = opname.items?.filter((item) => item.variance !== 0) || [];

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="stock-opname"
      title={opname.opname_number}
      subtitle="Detail Stock Opname - Physical Count vs System Stock"
      headerActions={
        <div className="flex gap-2">
          <button
            onClick={exportToXLSX}
            className="flex items-center gap-2 rounded-lg border border-green-600 bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export XLSX
          </button>
          <button
            onClick={() => navigate('/admin/stock-opname')}
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
              <p className="text-sm font-medium text-gray-500">Nomor Opname</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{opname.opname_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tanggal</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {new Date(opname.opname_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Lokasi</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{opname.location}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <span
                className={`inline-flex mt-1 rounded-full px-3 py-1 text-sm font-semibold ${
                  opname.status === 'finalized'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {opname.status === 'finalized' ? 'Finalized' : 'Draft'}
              </span>
            </div>
          </div>

          {opname.notes && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <p className="text-sm font-medium text-gray-500">Catatan</p>
              <p className="mt-1 text-sm text-gray-700">{opname.notes}</p>
            </div>
          )}

          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Dibuat Oleh:</span>{' '}
                <span className="font-medium text-gray-900">{opname.created_by_email || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Dibuat:</span>{' '}
                <span className="font-medium text-gray-900">
                  {new Date(opname.created_at).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500 p-2">
                <span className="material-symbols-outlined text-white text-[20px]">inventory</span>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700">Total Item</p>
                <p className="text-2xl font-bold text-blue-900">{opname.items?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500 p-2">
                <span className="material-symbols-outlined text-white text-[20px]">
                  check_circle
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-green-700">Match</p>
                <p className="text-2xl font-bold text-green-900">
                  {(opname.items?.length || 0) - itemsWithVariance.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500 p-2">
                <span className="material-symbols-outlined text-white text-[20px]">warning</span>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-700">Variance</p>
                <p className="text-2xl font-bold text-orange-900">{itemsWithVariance.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500 p-2">
                <span className="material-symbols-outlined text-white text-[20px]">functions</span>
              </div>
              <div>
                <p className="text-xs font-medium text-purple-700">Total Variance</p>
                <p className="text-2xl font-bold text-purple-900">
                  {opname.items?.reduce((sum, item) => sum + item.variance, 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Items with Variance (Priority) */}
        {itemsWithVariance.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-600 text-[24px]">warning</span>
              <h2 className="text-lg font-bold text-gray-900">
                Item dengan Variance ({itemsWithVariance.length})
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-orange-300 bg-white shadow-sm">
              <table className="w-full">
                <thead className="bg-orange-50">
                  <tr className="border-b border-orange-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Produk / Variant
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Opening
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Terjual
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Adj.
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                      System Stock
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Physical Count
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Variance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Alasan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {itemsWithVariance.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-orange-50/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                          <p className="text-xs text-gray-600">
                            {item.variant_name} • {item.variant_sku}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                        {item.opening_stock}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-red-600">
                        -{item.sold_quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium">
                        <span
                          className={
                            item.adjustment_quantity >= 0 ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {item.adjustment_quantity >= 0 ? '+' : ''}
                          {item.adjustment_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">
                        {item.system_stock}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-purple-600">
                        {item.physical_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${
                            item.variance > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.variance > 0 ? '+' : ''}
                          {item.variance}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.variance_reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Items */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Semua Item ({opname.items?.length || 0})
            </h2>
            <p className="text-sm text-gray-500">
              Formula: System Stock = Opening - Terjual + Adjustment | Variance = Physical Count - System Stock
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Produk / Variant
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Opening
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Terjual
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Adjustment
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                    System Stock
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Physical Count
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Variance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {opname.items && opname.items.length > 0 ? (
                  opname.items.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.variance !== 0 ? 'bg-orange-50/30 hover:bg-orange-50/50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                          <p className="text-xs text-gray-600">
                            {item.variant_name} • {item.variant_sku}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                        {item.opening_stock}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-red-600">
                        -{item.sold_quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium">
                        <span
                          className={
                            item.adjustment_quantity >= 0 ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {item.adjustment_quantity >= 0 ? '+' : ''}
                          {item.adjustment_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">
                        {item.system_stock}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-purple-600">
                        {item.physical_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.variance === 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Match
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${
                              item.variance > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.variance > 0 ? '+' : ''}
                            {item.variance}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.unit}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      Tidak ada item
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StockOpnameDetail;
