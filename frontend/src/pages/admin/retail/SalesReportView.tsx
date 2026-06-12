import { formatCurrency } from '../../../utils/formatters';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import { useMemo, useState } from 'react';

type SalesReportViewProps = {
  orders: OrderSummaryRow[];
};

type ProductSummary = {
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export default function SalesReportView({ orders }: SalesReportViewProps) {
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

  // Agregasi produk
  const productSummaries = useMemo(() => {
    const productMap = new Map<string, ProductSummary>();

    filteredOrders.forEach((order) => {
      order.order_product_items?.forEach((item) => {
        const productName = item.product_variants?.products?.name ?? 'Produk Tidak Diketahui';
        const variantName = item.product_variants?.name ?? '-';
        const unitPrice = item.price ?? 0;

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

  // Hitung jumlah staff
  const totalStaff = useMemo(() => {
    const staffSet = new Set<string>();
    filteredOrders.forEach((order) => {
      if (order.sales_staff_name) {
        staffSet.add(order.sales_staff_name);
      }
    });
    return staffSet.size;
  }, [filteredOrders]);

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

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setShowReport(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Form Input Tanggal */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[24px]">calendar_month</span>
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">Pilih Periode Laporan</h3>
            <p className="text-sm text-gray-500">Pilih tanggal untuk melihat laporan penjualan</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={!startDate || !endDate}
            className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lihat Laporan
          </button>
          {showReport && (
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Laporan Hasil */}
      {showReport && (
        <>
          {/* Summary Box */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-100 border-2 border-purple-300 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[24px]">summarize</span>
                <h3 className="text-xl font-black text-purple-900 uppercase">Total Keseluruhan</h3>
              </div>
              <p className="text-sm text-purple-700 font-medium">
                Periode: {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} 
                {' s/d '}
                {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center bg-white rounded-xl p-4">
                <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Staff</p>
                <p className="text-2xl font-black text-purple-900">{totalStaff}</p>
              </div>
              <div className="text-center bg-white rounded-xl p-4">
                <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Hari</p>
                <p className="text-2xl font-black text-purple-900">{totalDays}</p>
              </div>
              <div className="text-center bg-white rounded-xl p-4">
                <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Transaksi</p>
                <p className="text-2xl font-black text-purple-900">{totalOrders}</p>
              </div>
              <div className="text-center bg-white rounded-xl p-4">
                <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Item</p>
                <p className="text-2xl font-black text-purple-900">{totalQuantity}</p>
              </div>
              <div className="text-center bg-purple-600 rounded-xl p-4">
                <p className="text-xs text-white font-semibold uppercase mb-1">Total</p>
                <p className="text-xl font-black text-white">Rp {formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Tabel Produk */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">
                Rincian Produk Terjual ({productSummaries.length} Item)
              </h3>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Print
              </button>
            </div>

            {productSummaries.length === 0 ? (
              <div className="py-20 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <span className="material-symbols-outlined text-4xl text-gray-400">inventory_2</span>
                </div>
                <p className="text-gray-500 font-medium">Tidak ada produk yang terjual dalam periode ini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-20">No</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Produk</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Variant</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-600 w-32">Qty</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600 w-40">Harga Satuan</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600 w-40">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {productSummaries.map((product, index) => (
                      <tr key={`${product.productName}-${product.variantName}-${index}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 font-medium">{index + 1}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{product.productName}</td>
                        <td className="px-6 py-4 text-gray-700">{product.variantName}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 font-black text-base">
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-700">
                          Rp {formatCurrency(product.unitPrice)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-gray-900">
                          Rp {formatCurrency(product.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-purple-50 border-t-2 border-purple-300">
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-right font-bold uppercase tracking-wider text-purple-900">
                        Total
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-purple-600 text-white font-black text-base">
                          {totalQuantity}
                        </span>
                      </td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 text-right font-black text-2xl text-purple-600">
                        Rp {formatCurrency(totalRevenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
