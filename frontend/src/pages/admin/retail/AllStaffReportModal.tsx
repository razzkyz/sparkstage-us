import { formatCurrency } from '../../../utils/formatters';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type AllStaffReportModalProps = {
  orders: OrderSummaryRow[];
  onClose: () => void;
};

type ProductSummary = {
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export default function AllStaffReportModal({ orders, onClose }: AllStaffReportModalProps) {
  // State untuk date range filter
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  // Filter orders berdasarkan date range
  const filteredOrders = useMemo(() => {
    if (!isFilterApplied || !startDate || !endDate) {
      return orders;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      const orderDate = new Date(order.paid_at || order.updated_at || order.created_at || '');
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, startDate, endDate, isFilterApplied]);

  // Agregasi produk dari semua transaksi
  const productSummaries = useMemo(() => {
    const productMap = new Map<string, ProductSummary>();

    filteredOrders.forEach((order) => {
      order.order_product_items?.forEach((item) => {
        const productName = item.product_variants?.products?.name ?? 'Produk Tidak Diketahui';
        const variantName = item.product_variants?.name ?? '-';
        const unitPrice = item.price ?? 0;

        // Buat key unik berdasarkan product + variant + unit_price
        const key = `${productName}|${variantName}|${unitPrice}`;

        const existing = productMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          existing.subtotal += item.quantity * unitPrice;
        } else {
          productMap.set(key, {
            productName,
            variantName,
            quantity: item.quantity,
            unitPrice,
            subtotal: item.quantity * unitPrice,
          });
        }
      });
    });

    return Array.from(productMap.values()).sort((a, b) => b.subtotal - a.subtotal);
  }, [filteredOrders]);

  const totalQuantity = productSummaries.reduce((sum, p) => sum + p.quantity, 0);
  const totalRevenue = productSummaries.reduce((sum, p) => sum + p.subtotal, 0);
  const totalOrders = filteredOrders.length;

  // Hitung jumlah staff yang berkontribusi
  const totalStaff = useMemo(() => {
    const staffSet = new Set<string>();
    filteredOrders.forEach((order) => {
      if (order.sales_staff_name) {
        staffSet.add(order.sales_staff_name);
      }
    });
    return staffSet.size;
  }, [filteredOrders]);

  // Hitung jumlah hari dalam periode
  const totalDays = useMemo(() => {
    if (!isFilterApplied || !startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [startDate, endDate, isFilterApplied]);

  const handleApplyFilter = () => {
    if (!startDate || !endDate) {
      alert('Mohon pilih tanggal mulai dan tanggal akhir');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
      return;
    }
    setIsFilterApplied(true);
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsFilterApplied(false);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-4xl">summarize</span>
              </div>
              <div>
                <h2 className="text-2xl font-black mb-1">Laporan Semua Staff</h2>
                <p className="text-sm font-medium text-white/90">Gabungan penjualan dari semua staff</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-all"
              title="Tutup"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{totalStaff}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1 text-white/80">Staff</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{totalOrders}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1 text-white/80">Transaksi</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{totalQuantity}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1 text-white/80">Item Terjual</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-black">Rp {formatCurrency(totalRevenue)}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1 text-white/80">Total Penjualan</p>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-white text-[20px]">date_range</span>
              <h3 className="text-sm font-bold text-white">Filter Periode Laporan</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/30 bg-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/30 bg-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleApplyFilter}
                disabled={!startDate || !endDate}
                className="flex-1 px-4 py-2 rounded-lg bg-white text-purple-600 font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lihat Laporan
              </button>
              {isFilterApplied && (
                <button
                  onClick={handleResetFilter}
                  className="px-4 py-2 rounded-lg bg-white/20 text-white font-bold text-sm hover:bg-white/30 transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          
          {/* Summary Box - hanya tampil jika filter aktif */}
          {isFilterApplied && totalDays && (
            <div className="mb-6 bg-gradient-to-br from-purple-50 to-indigo-100 border-2 border-purple-300 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-[20px]">summarize</span>
                  <h3 className="text-base font-black text-purple-900 uppercase">Total Keseluruhan</h3>
                </div>
                <p className="text-xs text-purple-700 font-medium">
                  {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} 
                  {' s/d '}
                  {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              
              <div className="grid grid-cols-5 gap-3 items-center">
                <div className="text-center">
                  <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Staff</p>
                  <p className="text-xl font-black text-purple-900">{totalStaff}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Hari</p>
                  <p className="text-xl font-black text-purple-900">{totalDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Transaksi</p>
                  <p className="text-xl font-black text-purple-900">{totalOrders}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Item</p>
                  <p className="text-xl font-black text-purple-900">{totalQuantity}</p>
                </div>
                <div className="text-center bg-purple-600 rounded-xl py-2 px-3">
                  <p className="text-xs text-white font-semibold uppercase mb-1">Total</p>
                  <p className="text-lg font-black text-white">Rp {formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Rincian Produk ({productSummaries.length} Item)
              {isFilterApplied && <span className="ml-2 text-purple-600">• Periode Terpilih</span>}
            </h3>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print
            </button>
          </div>

          {productSummaries.length === 0 ? (
            <div className="bg-gray-50 rounded-xl py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <span className="material-symbols-outlined text-4xl text-gray-400">inventory_2</span>
              </div>
              <p className="text-gray-500 font-medium">Tidak ada produk yang terjual</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-16">No</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 min-w-[250px]">Produk</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 min-w-[150px]">Variant</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600 w-24">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600 w-36">Harga Satuan</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600 w-36">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {productSummaries.map((product, index) => (
                    <tr key={`${product.productName}-${product.variantName}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-gray-500 font-medium">{index + 1}</td>
                      <td className="px-4 py-4 font-semibold text-gray-900">{product.productName}</td>
                      <td className="px-4 py-4 text-gray-700">{product.variantName}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-black">
                          {product.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-gray-700">
                        Rp {formatCurrency(product.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-gray-900">
                        Rp {formatCurrency(product.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-right font-bold uppercase tracking-wider text-gray-600">
                      Total
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-600 text-white font-black text-sm">
                        {totalQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-4"></td>
                    <td className="px-4 py-4 text-right font-black text-xl text-purple-600">
                      Rp {formatCurrency(totalRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Laporan gabungan dari {totalStaff} staff • {totalOrders} transaksi • {totalQuantity} item
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:shadow-lg transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  // Render modal menggunakan Portal agar muncul di root level
  return createPortal(modalContent, document.body);
}
