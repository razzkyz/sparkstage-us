import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { Download, Edit2, Trash2 } from 'lucide-react';

interface SockSalesReport {
  id: number;
  report_date: string;
  stock_awal: number;
  terjual: number;
  sisa: number;
  harga_per_pasang: number;
  total: number;
  catatan: string | null;
  created_at: string;
  updated_at: string;
}

interface FormState {
  report_date: string;
  stock_awal: string;
  terjual: string;
  harga_per_pasang: number;
}

const defaultFormState: FormState = {
  report_date: new Date().toISOString().split('T')[0],
  stock_awal: '',
  terjual: '',
  harga_per_pasang: 5000,
};

export default function StarGuideSockReport() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const menuSections = useAdminMenuSections();

  const [reports, setReports] = useState<SockSalesReport[]>([]);
  const [form, setForm] = useState(defaultFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string>('');
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sock_sales_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (error) throw error;
      setReports(data ?? []);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal memuat laporan');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleEdit = (report: SockSalesReport) => {
    setEditingId(report.id);
    setForm({
      report_date: report.report_date,
      stock_awal: report.stock_awal.toString(),
      terjual: report.terjual.toString(),
      harga_per_pasang: report.harga_per_pasang,
    });
    showToast('info', `Mengedit laporan tanggal ${report.report_date}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteConfirm = (id: number, date: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmDate(date);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
    setDeleteConfirmDate('');
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmId) return;

    try {
      const { error } = await supabase
        .from('sock_sales_reports')
        .delete()
        .eq('id', deleteConfirmId);

      if (error) throw error;
      showToast('success', `Laporan ${deleteConfirmDate} berhasil dihapus`);
      handleDeleteCancel();
      fetchReports();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal menghapus laporan');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.report_date) {
      showToast('error', 'Tanggal laporan harus diisi');
      return;
    }
    if (form.stock_awal === '' || form.terjual === '') {
      showToast('error', 'Stok awal dan terjual harus diisi');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        report_date: form.report_date,
        stock_awal: Number(form.stock_awal),
        terjual: Number(form.terjual),
        harga_per_pasang: Number(form.harga_per_pasang),
      };

      if (editingId) {
        const { error } = await supabase
          .from('sock_sales_reports')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        showToast('success', 'Laporan berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('sock_sales_reports')
          .insert(payload);

        if (error) throw error;
        showToast('success', 'Laporan berhasil tersimpan');
      }

      setForm(defaultFormState);
      setEditingId(null);
      fetchReports();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Gagal menyimpan laporan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (reports.length === 0) {
      showToast('warning', 'Tidak ada data untuk diexport');
      return;
    }

    const exportData = reports.map((r) => ({
      Tanggal: r.report_date,
      'Stok Awal': r.stock_awal,
      'Terjual': r.terjual,
      'Sisa': r.sisa,
      'Harga/Pasang': r.harga_per_pasang,
      'Total Penjualan': r.total,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Kaos Kaki');

    // Set column widths
    const colWidths = [
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `laporan-kaos-kaki-${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('success', 'Data berhasil diexport ke Excel');
  };


  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="sock-report"
      title="Laporan Kaos Kaki"
      onLogout={signOut}
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Laporan Kaos Kaki</h1>
            <p className="text-slate-600 mt-1">Input dan kelola laporan penjualan kaos kaki harian</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setShowDateRangeModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              📊 Data Laporan Semua
            </button>
            <button
              onClick={handleExport}
              disabled={reports.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Form Input */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {editingId ? '✏️ Edit Laporan' : '➕ Input Laporan Baru'}
          </h2>
          <style>{`
            input[type="number"]::-webkit-outer-spin-button,
            input[type="number"]::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            input[type="number"] {
              -moz-appearance: textfield;
            }
          `}</style>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                Tanggal Laporan
                <input
                  required
                  type="date"
                  value={form.report_date}
                  onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-main-500 focus:outline-none focus:ring-2 focus:ring-main-100"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Stok Awal
                <input
                  required
                  type="number"
                  min="0"
                  placeholder="Masukkan stok awal"
                  value={form.stock_awal}
                  onChange={(e) => setForm({ ...form, stock_awal: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-main-500 focus:outline-none focus:ring-2 focus:ring-main-100"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                Terjual
                <input
                  required
                  type="number"
                  min="0"
                  placeholder="Masukkan jumlah terjual"
                  value={form.terjual}
                  onChange={(e) => setForm({ ...form, terjual: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-main-500 focus:outline-none focus:ring-2 focus:ring-main-100"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Harga per Pasang
                <input
                  disabled
                  type="number"
                  min="1"
                  value={form.harga_per_pasang}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 cursor-not-allowed"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(defaultFormState);
                  }}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-main-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-main-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Laporan'}
              </button>
            </div>
          </form>
        </div>

        {/* Daftar Laporan */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">📋 Daftar Laporan</h2>
            <p className="text-sm text-slate-500">Total: {reports.length} laporan</p>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Memuat laporan...</div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-slate-500">Belum ada laporan kaos kaki.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-slate-600 font-semibold">Tanggal</th>
                    <th className="px-4 py-3 text-right text-slate-600 font-semibold">Stok Awal</th>
                    <th className="px-4 py-3 text-right text-slate-600 font-semibold">Terjual</th>
                    <th className="px-4 py-3 text-right text-slate-600 font-semibold">Sisa</th>
                    <th className="px-4 py-3 text-right text-slate-600 font-semibold">Harga/Pasang</th>
                    <th className="px-4 py-3 text-right text-slate-600 font-semibold">Total Penjualan</th>
                    <th className="px-4 py-3 text-center text-slate-600 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-900 font-medium">{report.report_date}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{report.stock_awal.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{report.terjual.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{report.sisa.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-right text-slate-700">Rp {report.harga_per_pasang.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-right font-semibold text-main-600">Rp {report.total.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(report)}
                            className="inline-flex items-center gap-1 rounded-2xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConfirm(report.id, report.report_date)}
                            className="inline-flex items-center gap-1 rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ringkasan */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">📊 Ringkasan</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4">
              <div className="text-xs uppercase tracking-wide text-blue-600 font-semibold mb-1">Total Hari</div>
              <div className="text-3xl font-bold text-blue-900">{reports.length}</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-4">
              <div className="text-xs uppercase tracking-wide text-purple-600 font-semibold mb-1">Total Kejual</div>
              <div className="text-3xl font-bold text-purple-900">
                {reports.reduce((sum, r) => sum + r.terjual, 0).toLocaleString('id-ID')}
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-4">
              <div className="text-xs uppercase tracking-wide text-orange-600 font-semibold mb-1">Total Sisa</div>
              <div className="text-3xl font-bold text-orange-900">
                {reports.reduce((sum, r) => sum + r.sisa, 0).toLocaleString('id-ID')}
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-main-50 to-main-100 border border-main-200 p-4">
              <div className="text-xs uppercase tracking-wide text-main-600 font-semibold mb-1">Total Penjualan</div>
              <div className="text-3xl font-bold text-main-700">
                Rp {reports.reduce((sum, r) => sum + r.total, 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Selection Modal */}
      {showDateRangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl max-w-sm w-full">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowDateRangeModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-6">📅 Pilih Periode Laporan</h2>

            <div className="space-y-4 mb-6">
              <label className="space-y-2 text-sm text-slate-700">
                Dari Tanggal
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-main-500 focus:outline-none focus:ring-2 focus:ring-main-100"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Sampai Tanggal
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-main-500 focus:outline-none focus:ring-2 focus:ring-main-100"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDateRangeModal(false)}
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (dateRangeStart && dateRangeEnd) {
                    setShowDateRangeModal(false);
                    setShowSummaryModal(true);
                  } else {
                    showToast('error', 'Pilih tanggal awal dan akhir');
                  }
                }}
                className="flex-1 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:bg-slate-300"
              >
                Lihat Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal for Screenshot */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            {/* Close button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  setDateRangeStart('');
                  setDateRangeEnd('');
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            {/* Header */}
            <h2 className="text-xl font-bold text-slate-900 text-center mb-2 pb-2 border-b-2 border-slate-200">
              🧾 LAPORAN KAOS KAKI
            </h2>
            <p className="text-center text-xs text-slate-500 mb-6">Periode: {dateRangeStart} s/d {dateRangeEnd}</p>

            {/* Daily Reports */}
            <div className="space-y-4 mb-6">
              {reports
                .filter((r) => r.report_date >= dateRangeStart && r.report_date <= dateRangeEnd)
                .length === 0 ? (
                <div className="text-center text-slate-500 py-8">Tidak ada data untuk periode ini</div>
              ) : (
                reports
                  .filter((r) => r.report_date >= dateRangeStart && r.report_date <= dateRangeEnd)
                  .map((report) => (
                    <div key={report.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                      <div className="font-bold text-slate-900 mb-3">🧾 {report.report_date}</div>
                      <div className="space-y-2 text-sm text-slate-700">
                        <div>Stock Awal: <span className="font-semibold text-slate-900">{report.stock_awal.toLocaleString('id-ID')} Pasang</span></div>
                        <div>Terjual: <span className="font-semibold text-slate-900">{report.terjual.toLocaleString('id-ID')} Pasang</span></div>
                        <div>Sisa: <span className="font-semibold text-slate-900">{report.sisa.toLocaleString('id-ID')} Pasang</span></div>
                        <div className="pt-2 border-t border-slate-200 font-bold text-main-600">
                          Total: <span className="text-main-700">Rp {report.total.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Total Summary */}
            {reports
              .filter((r) => r.report_date >= dateRangeStart && r.report_date <= dateRangeEnd)
              .length > 0 && (
              <div className="rounded-2xl bg-gradient-to-br from-main-50 to-main-100 border-2 border-main-300 p-6 text-center">
                <div className="text-sm font-bold text-main-600 mb-2">🟰 TOTAL KESELURUHAN</div>
                <div className="space-y-1">
                  <div className="text-xs text-main-700 mb-2">Periode: <span className="font-semibold">{dateRangeStart} s/d {dateRangeEnd}</span></div>
                  <div className="text-sm text-main-700 mb-2">Total Hari: <span className="font-bold">{reports.filter((r) => r.report_date >= dateRangeStart && r.report_date <= dateRangeEnd).length} hari</span></div>
                  <div className="text-sm text-main-700 mb-3">Total Kejual: <span className="font-bold">{reports
                    .filter((r) => r.report_date >= dateRangeStart && r.report_date <= dateRangeEnd)
                    .reduce((sum, r) => sum + r.terjual, 0)
                    .toLocaleString('id-ID')} Pasang</span></div>
                  <div className="text-2xl font-bold text-main-900">
                    Rp {reports
                      .filter((r) => r.report_date >= dateRangeStart && r.report_date <= dateRangeEnd)
                      .reduce((sum, r) => sum + r.total, 0)
                      .toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowSummaryModal(false);
                setDateRangeStart('');
                setDateRangeEnd('');
              }}
              className="w-full mt-8 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-2xl max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Hapus Laporan?</h3>
            </div>
            <p className="text-sm text-slate-700 mb-6">
              Yakin ingin menghapus laporan kaos kaki tanggal <span className="font-semibold text-slate-900">{deleteConfirmDate}</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="flex-1 rounded-2xl border border-red-500 bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
