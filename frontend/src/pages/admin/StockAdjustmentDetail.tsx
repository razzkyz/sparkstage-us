import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';

const StockAdjustmentDetail = () => {
  const { adjustmentId } = useParams<{ adjustmentId: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const menuSections = useAdminMenuSections();

  const { data: adjustment, isLoading, error } = useQuery({
    queryKey: ['stock-adjustment-detail', adjustmentId],
    queryFn: async () => {
      if (!adjustmentId) throw new Error('ID not provided');

      const { data, error } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          stock_adjustment_items (
            *,
            products (id, name),
            product_variants (id, name, sku)
          )
        `)
        .eq('id', parseInt(adjustmentId))
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!adjustmentId,
  });

  const typeLabels: Record<string, string> = {
    gift: '🎁 Gift (Hadiah)',
    kol: '📢 KOL Marketing',
    loss: '📉 Loss (Kehilangan/Rusak)',
    gain: '📈 Gain (Penambahan)',
    other: '🔧 Other (Lainnya)',
  };

  if (isLoading) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={menuSections}
        defaultActiveMenuId="stock-adjustments"
        title="Stock Adjustment Detail"
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

  if (error || !adjustment) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={menuSections}
        defaultActiveMenuId="stock-adjustments"
        title="Stock Adjustment Detail"
        subtitle="Error"
        onLogout={signOut}
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {error instanceof Error ? error.message : 'Stock adjustment tidak ditemukan'}
          </p>
          <button
            onClick={() => navigate('/admin/stock-adjustments')}
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
      defaultActiveMenuId="stock-adjustments"
      title={adjustment.adjustment_number}
      subtitle="Detail Stock Adjustment"
      headerActions={
        <button
          onClick={() => navigate('/admin/stock-adjustments')}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Kembali
        </button>
      }
      onLogout={signOut}
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Nomor Adjustment</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{adjustment.adjustment_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tanggal</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {new Date(adjustment.adjustment_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tipe</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {typeLabels[adjustment.adjustment_type] || adjustment.adjustment_type}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Lokasi</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{adjustment.location}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-sm font-medium text-gray-500 mb-2">Alasan</p>
            <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{adjustment.reason}</p>
          </div>

          {adjustment.notes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">Catatan Tambahan</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{adjustment.notes}</p>
            </div>
          )}

          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Dibuat Oleh:</span>{' '}
                <span className="font-medium text-gray-900">{adjustment.created_by_email || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Dibuat:</span>{' '}
                <span className="font-medium text-gray-900">
                  {new Date(adjustment.created_at).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Item Adjustment ({adjustment.stock_adjustment_items?.length || 0})
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
                    Quantity Change
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
                {adjustment.stock_adjustment_items && adjustment.stock_adjustment_items.length > 0 ? (
                  adjustment.stock_adjustment_items.map((item: any) => (
                    <tr key={item.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.products?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.product_variants?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {item.product_variants?.sku || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${
                            item.quantity_change >= 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.quantity_change >= 0 ? '+' : ''}
                          {item.quantity_change}
                        </span>
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
        {adjustment.stock_adjustment_items && adjustment.stock_adjustment_items.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Total Items</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {adjustment.stock_adjustment_items.length}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Total Change</p>
                <p className={`mt-1 text-2xl font-bold ${
                  adjustment.stock_adjustment_items.reduce((sum: number, item: any) => sum + item.quantity_change, 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {adjustment.stock_adjustment_items.reduce((sum: number, item: any) => sum + item.quantity_change, 0) >= 0 ? '+' : ''}
                  {adjustment.stock_adjustment_items.reduce((sum: number, item: any) => sum + item.quantity_change, 0)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-500">Tipe</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {typeLabels[adjustment.adjustment_type]}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StockAdjustmentDetail;
