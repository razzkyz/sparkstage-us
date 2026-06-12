import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, CASHIER_MENU_SECTIONS } from '../../constants/adminMenu';
import { getMenuSectionsByRole } from '../../utils/auth';
import { useCashierSalesStats } from '../../hooks/useCashierSalesStats';
import DashboardStatSkeleton from '../../components/skeletons/DashboardStatSkeleton';
import { useToast } from '../../components/Toast';
import { LazyMotion, m } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';
import { nowWIB, toLocalDateString } from '../../utils/timezone';
import type { AdminMenuSection } from '../../components/AdminLayout';

const CashierDashboard = () => {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const { data: stats, error, isLoading } = useCashierSalesStats();
  const [menuSections, setMenuSections] = useState<AdminMenuSection[]>(CASHIER_MENU_SECTIONS);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadMenuSections = async () => {
      const sections = await getMenuSectionsByRole(user?.id);
      setMenuSections(sections);
    };
    loadMenuSections();
  }, [user?.id]);

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal memuat data penjualan');
    }
  }, [error, showToast]);

  const getUserInitials = () => {
    if (!user?.email) return 'K';
    return user.email.charAt(0).toUpperCase();
  };

  const handleExportCSV = () => {
    if (!stats) {
      showToast('error', 'Data belum dimuat');
      return;
    }

    setIsExporting(true);
    try {
      const now = nowWIB();
      const today = toLocalDateString(now);
      const month = today.substring(0, 7);

      // Prepare CSV data
      const csvData = [
        ['Laporan Penjualan Kasir - Spark Stage'],
        ['Tanggal Laporan', today],
        ['Bulan', month],
        [],
        ['RINGKASAN PENJUALAN HARI INI'],
        ['Kategori', 'Jumlah', 'Revenue (Rp)'],
        ['Tiket', stats.ticketSalesToday.toString(), stats.ticketRevenueToday.toString()],
        ['Produk', stats.productSalesToday.toString(), stats.productRevenueToday.toString()],
        ['TOTAL', (stats.ticketSalesToday + stats.productSalesToday).toString(), (stats.ticketRevenueToday + stats.productRevenueToday).toString()],
        [],
        ['RINGKASAN PENJUALAN BULAN INI'],
        ['Kategori', 'Jumlah', 'Revenue (Rp)'],
        ['Tiket', stats.ticketSalesMonth.toString(), stats.ticketRevenueMonth.toString()],
        ['Produk', stats.productSalesMonth.toString(), stats.productRevenueMonth.toString()],
        ['TOTAL', (stats.ticketSalesMonth + stats.productSalesMonth).toString(), (stats.ticketRevenueMonth + stats.productRevenueMonth).toString()],
      ];

      // Convert to CSV format
      const csvContent = csvData
        .map((row) =>
          row
            .map((cell) => {
              // Escape quotes and wrap in quotes if contains comma
              const escaped = String(cell).replace(/"/g, '""');
              return escaped.includes(',') ? `"${escaped}"` : escaped;
            })
            .join(',')
        )
        .join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `penjualan-kasir-${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'Laporan berhasil diunduh');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('error', 'Gagal mengunduh laporan');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="cashier-dashboard"
      title="Dashboard Penjualan"
      subtitle="Lihat total penjualan tiket dan produk"
      onLogout={signOut}
    >
      {/* Welcome Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-full bg-[#ff4b86] flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
            {getUserInitials()}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-gray-900 truncate">Selamat Datang, Kasir</h3>
            <p className="text-sm text-gray-500 truncate">Panel Penjualan Spark</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm font-bold hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm text-green-700">download</span>
            <span className="text-green-700">{isExporting ? 'Unduh...' : 'Export CSV'}</span>
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-gray-700">home</span>
            Halaman Utama
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-gray-700">logout</span>
            Keluar
          </button>
        </div>
      </div>

      <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
        {/* Main Stats Cards - Today */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-gray-900">📊 Penjualan Hari Ini</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => <DashboardStatSkeleton key={`today-${index}`} />)
              : [
                {
                  label: '🎫 Tiket Terpakai',
                  value: stats?.ticketSalesToday ?? 0,
                  subtext: `Rp ${formatCurrency(stats?.ticketRevenueToday ?? 0)}`,
                  color: 'bg-blue-50 border-blue-200',
                  textColor: 'text-blue-700',
                },
                {
                  label: '🛍️ Produk Terjual',
                  value: stats?.productSalesToday ?? 0,
                  subtext: `Rp ${formatCurrency(stats?.productRevenueToday ?? 0)}`,
                  color: 'bg-purple-50 border-purple-200',
                  textColor: 'text-purple-700',
                },
                {
                  label: '💰 Total Revenue',
                  value: `Rp ${formatCurrency((stats?.ticketRevenueToday ?? 0) + (stats?.productRevenueToday ?? 0))}`,
                  subtext: `${(stats?.ticketSalesToday ?? 0) + (stats?.productSalesToday ?? 0)} item terjual`,
                  color: 'bg-emerald-50 border-emerald-200',
                  textColor: 'text-emerald-700',
                },
              ].map((item, index) => (
                <m.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className={`rounded-xl border ${item.color} bg-white p-6`}
                >
                  <p className={`text-sm ${item.textColor} mb-2`}>{item.label}</p>
                  <p className="text-3xl md:text-4xl font-black text-gray-900">{item.value}</p>
                  <p className={`text-xs ${item.textColor} mt-3`}>{item.subtext}</p>
                </m.div>
              ))}
          </div>
        </div>

        {/* Main Stats Cards - This Month */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-gray-900">📈 Penjualan Bulan Ini</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => <DashboardStatSkeleton key={`month-${index}`} />)
              : [
                {
                  label: '🎫 Tiket Terpakai',
                  value: stats?.ticketSalesMonth ?? 0,
                  subtext: `Rp ${formatCurrency(stats?.ticketRevenueMonth ?? 0)}`,
                  color: 'bg-blue-50 border-blue-200',
                  textColor: 'text-blue-700',
                },
                {
                  label: '🛍️ Produk Terjual',
                  value: stats?.productSalesMonth ?? 0,
                  subtext: `Rp ${formatCurrency(stats?.productRevenueMonth ?? 0)}`,
                  color: 'bg-purple-50 border-purple-200',
                  textColor: 'text-purple-700',
                },
                {
                  label: '💰 Total Revenue',
                  value: `Rp ${formatCurrency((stats?.ticketRevenueMonth ?? 0) + (stats?.productRevenueMonth ?? 0))}`,
                  subtext: `${(stats?.ticketSalesMonth ?? 0) + (stats?.productSalesMonth ?? 0)} item terjual`,
                  color: 'bg-emerald-50 border-emerald-200',
                  textColor: 'text-emerald-700',
                },
              ].map((item, index) => (
                <m.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className={`rounded-xl border ${item.color} bg-white p-6`}
                >
                  <p className={`text-sm ${item.textColor} mb-2`}>{item.label}</p>
                  <p className="text-3xl md:text-4xl font-black text-gray-900">{item.value}</p>
                  <p className={`text-xs ${item.textColor} mt-3`}>{item.subtext}</p>
                </m.div>
              ))}
          </div>
        </div>

        {/* Summary Table */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-black text-gray-900 mb-6">📋 Ringkasan Lengkap</h3>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-bold text-gray-700">Periode</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Tiket (qty)</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Tiket (Rp)</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Produk (qty)</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Produk (Rp)</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Total (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-blue-50/50">
                    <td className="py-3 px-4 font-bold text-gray-900">Hari Ini</td>
                    <td className="text-center py-3 px-4 text-gray-600">{stats?.ticketSalesToday ?? 0}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{formatCurrency(stats?.ticketRevenueToday ?? 0)}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{stats?.productSalesToday ?? 0}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{formatCurrency(stats?.productRevenueToday ?? 0)}</td>
                    <td className="text-center py-3 px-4 font-black text-[#ff4b86]">
                      {formatCurrency((stats?.ticketRevenueToday ?? 0) + (stats?.productRevenueToday ?? 0))}
                    </td>
                  </tr>
                  <tr className="hover:bg-emerald-50/50">
                    <td className="py-3 px-4 font-bold text-gray-900">Bulan Ini</td>
                    <td className="text-center py-3 px-4 text-gray-600">{stats?.ticketSalesMonth ?? 0}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{formatCurrency(stats?.ticketRevenueMonth ?? 0)}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{stats?.productSalesMonth ?? 0}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{formatCurrency(stats?.productRevenueMonth ?? 0)}</td>
                    <td className="text-center py-3 px-4 font-black text-[#ff4b86]">
                      {formatCurrency((stats?.ticketRevenueMonth ?? 0) + (stats?.productRevenueMonth ?? 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </LazyMotion>
    </AdminLayout>
  );
};

export default CashierDashboard;
