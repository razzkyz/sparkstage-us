import { formatCurrency } from '../../../utils/formatters';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type SimpleReportModalProps = {
  orders: OrderSummaryRow[];
  onClose: () => void;
};

type StaffSummary = {
  staffName: string;
  totalItems: number;
  totalRevenue: number;
  totalOrders: number;
};

export default function SimpleReportModal({ orders, onClose }: SimpleReportModalProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showReport, setShowReport] = useState(false);

  // Filter orders berdasarkan date range
  const filteredOrders = useMemo(() => {
    if (!showReport || !startDate || !endDate) {
      return [];
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      const orderDate = new Date(order.paid_at || order.updated_at || order.created_at || '');
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, startDate, endDate, showReport]);

  // Agregasi per staff
  const staffSummaries = useMemo(() => {
    const staffMap = new Map<string, StaffSummary>();

    filteredOrders.forEach((order) => {
      const staffName = order.sales_staff_name || 'Unknown';
      
      let orderItems = 0;
      order.order_product_items?.forEach((item) => {
        orderItems += item.quantity;
      });

      const existing = staffMap.get(staffName);
      if (existing) {
        existing.totalItems += orderItems;
        existing.totalRevenue += order.total;
        existing.totalOrders += 1;
      } else {
        staffMap.set(staffName, {
          staffName,
          totalItems: orderItems,
          totalRevenue: order.total,
          totalOrders: 1,
        });
      }
    });

    return Array.from(staffMap.values()).sort((a, b) => b.totalItems - a.totalItems);
  }, [filteredOrders]);

  const totalQuantity = staffSummaries.reduce((sum, s) => sum + s.totalItems, 0);
  const totalRevenue = staffSummaries.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalStaff = staffSummaries.length;

  // Hitung jumlah hari
  const totalDays = useMemo(() => {
    if (!showReport || !startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [startDate, endDate, showReport]);

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      alert('Mohon pilih tanggal mulai dan tanggal akhir');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
      return;
    }
    setShowReport(true);
  };

  const handleBack = () => {
    setShowReport(false);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {!showReport ? (
          /* STATE 1: Form Pilih Tanggal */
          <>
            <div className="p-8">
              <button
                onClick={onClose}
                className="float-right text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-[28px]">close</span>
              </button>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[32px]">calendar_month</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900">Pilih Periode Laporan</h2>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dari Tanggal</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={!startDate || !endDate}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lihat Laporan
                </button>
              </div>
            </div>
          </>
        ) : (
          /* STATE 2: Hasil Laporan */
          <>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <button
                onClick={onClose}
                className="float-right text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-[28px]">close</span>
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-purple-600 text-[32px]">assignment</span>
                <h2 className="text-2xl font-black text-gray-900">LAPORAN PENJUALAN</h2>
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Periode: {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} 
                {' s/d '}
                {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
              {/* Total Keseluruhan */}
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-300 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-pink-600 text-[24px]">summarize</span>
                  <h3 className="text-lg font-black text-pink-900 uppercase">Total Keseluruhan</h3>
                </div>
                
                <div className="space-y-2 mb-4 text-center">
                  <p className="text-sm text-pink-800">
                    Periode: {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} 
                    {' s/d '}
                    {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-sm font-semibold text-pink-800">
                    Total Hari: <span className="font-black">{totalDays} hari</span>
                  </p>
                  <p className="text-sm font-semibold text-pink-800">
                    Total Staff: <span className="font-black">{totalStaff} orang</span>
                  </p>
                  <p className="text-sm font-semibold text-pink-800">
                    Total Kejual: <span className="font-black">{totalQuantity} Item</span>
                  </p>
                </div>
                
                <div className="pt-4 border-t-2 border-pink-300 text-center">
                  <p className="text-3xl font-black text-pink-600">
                    Rp {formatCurrency(totalRevenue)}
                  </p>
                </div>
              </div>

              {/* Rincian Per Staff */}
              {staffSummaries.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-gray-600 mb-3 uppercase">Rincian Per Staff ({staffSummaries.length} Staff)</h4>
                  <div className="space-y-2">
                    {staffSummaries.map((staff, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <span className="text-white font-black text-lg">{staff.staffName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-black text-gray-900">{staff.staffName}</p>
                              <p className="text-xs text-gray-500">{staff.totalOrders} Transaksi</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-2xl text-purple-600">{staff.totalItems} Item</p>
                            <p className="text-sm text-gray-900 font-bold">Rp {formatCurrency(staff.totalRevenue)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-white transition-all"
              >
                Kembali
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-lg transition-all"
              >
                Tutup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
