import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../components/Toast';
import { supabase } from '../../../lib/supabase';
import { formatCurrency } from '../../../utils/formatters';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';

type ClaimTabProps = {
  orders: OrderSummaryRow[];
  isLoading: boolean;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
};

export default function ClaimTab({ orders, isLoading, searchQuery: propsSearchQuery, setSearchQuery: propsSetSearchQuery }: ClaimTabProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const unclaimedOrders = orders.filter(
    (o) => o.pickup_status === 'completed' && !o.sales_staff_name
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [staffName, setStaffName] = useState('');
  const [searchQueryState, setSearchQueryState] = useState('');
  const searchQuery = propsSearchQuery ?? searchQueryState;
  const setSearchQuery = propsSetSearchQuery ?? setSearchQueryState;
  const [viewMode, setViewMode] = useState<'product' | 'print'>('product');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProductOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return unclaimedOrders;

    return unclaimedOrders.filter((order) => {
      return order.order_product_items?.some((item) =>
        item.product_variants?.products?.name?.toLowerCase().includes(query)
      );
    });
  }, [unclaimedOrders, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProductOrders.length, searchQuery]);

  const ITEMS_PER_PAGE = 100;
  const totalPages = Math.max(1, Math.ceil(filteredProductOrders.length / ITEMS_PER_PAGE));
  const currentPageOrders = filteredProductOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const isAllSelected = currentPageOrders.length > 0 && currentPageOrders.every((o) => selectedIds.has(o.id));

  const selectAll = () => {
    if (isAllSelected) {
      const newSet = new Set(selectedIds);
      currentPageOrders.forEach((order) => newSet.delete(order.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      currentPageOrders.forEach((order) => newSet.add(order.id));
      setSelectedIds(newSet);
    }
  };

  const handleClaim = async () => {
    if (selectedIds.size === 0) {
      showToast('warning', 'Pilih minimal satu pesanan untuk diklaim');
      return;
    }
    if (!staffName.trim()) {
      showToast('warning', 'Nama Staff harus diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('order_products')
        .update({ sales_staff_name: staffName.trim() })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      showToast('success', `${selectedIds.size} pesanan berhasil diklaim oleh ${staffName}!`);
      setSelectedIds(new Set());
      setStaffName('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.productOrders() });
    } catch (err) {
      console.error('Claim error:', err);
      showToast('error', 'Terjadi kesalahan saat mengklaim pesanan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4 animate-pulse">
            <div className="h-16 w-16 rounded-xl bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }


  const selectedCount = selectedIds.size;
  const selectedTotal = unclaimedOrders
    .filter((o) => selectedIds.has(o.id))
    .reduce((sum, o) => sum + o.total, 0);
  const isProductSearchEmpty = searchQuery.trim().length === 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 shadow-sm mb-2">
        <div className="flex items-start gap-3 mb-3">
          <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
          <div>
            <h3 className="font-bold text-base text-blue-950">Tata Cara Menggunakan Klaim Penjualan</h3>
            <p className="mt-1 text-blue-800 leading-relaxed">
              Ikuti langkah berikut agar komisi penjualan tercatat dengan akurat. <span className="font-semibold text-red-600 bg-red-50 px-1 rounded">Dilarang keras mengklaim pesanan milik staff lain atau melakukan klaim fiktif.</span> Sistem akan melakukan audit silang dan pelanggaran akan dikenakan penalty.
            </p>
          </div>
        </div>
        <div className="grid gap-2 ml-9">
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold mt-0.5">1</span>
            <p>Gunakan fitur <b>Pencarian</b> di bawah untuk mencari produk yang baru saja Anda bantu jual.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold mt-0.5">2</span>
            <p>Centang kotak pada transaksi yang benar-benar Anda tangani. Pastikan jenis produk & jumlahnya cocok.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold mt-0.5">3</span>
            <p>Isi <b>Nama Staff</b> Anda dengan benar pada kolom yang tersedia.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold mt-0.5">4</span>
            <p>Klik tombol <b>Klaim Sekarang</b> untuk merekam klaim Anda ke sistem komisi.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setViewMode('product')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            viewMode === 'product'
              ? 'bg-[#ff4b86] text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Produk
        </button>
        {/* PRINT_FEATURE_DISABLED - komment di bawah untuk disable print tab
        <button
          type="button"
          onClick={() => setViewMode('print')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            viewMode === 'print'
              ? 'bg-[#ff4b86] text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Print Terjual
        </button>
        */}
      </div>

      {/* === CLAIM PANEL === */}
      {viewMode === 'product' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1.7fr]">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Klaim Penjualan</p>
                  <h3 className="mt-1 text-lg font-black text-gray-900">
                    {selectedCount === 0 ? 'Pilih pesanan dan isi nama staff' : `${selectedCount} pesanan siap diklaim`}
                  </h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-[#ff4b86]">
                  <span className="h-2 w-2 rounded-full bg-[#ff4b86]" />
                  {selectedCount} dipilih
                </div>
              </div>
              <p className="text-sm leading-6 text-gray-500">
                {selectedCount === 0
                  ? 'Centang transaksi yang Anda bantu jual, lalu masukkan nama staff untuk mencatat klaim dengan benar.'
                  : `Total nilai: Rp ${formatCurrency(selectedTotal)}. Pastikan nama staff dan produk yang dipilih sudah benar agar tidak kena penalty.`}
              </p>
            </div>

            <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-2xl p-4 border border-pink-100">
              <div className="w-full space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Produk Terpilih</p>
                </div>

                {selectedCount === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-pink-100 mb-2">
                      <span className="material-symbols-outlined text-[#ff4b86] text-[18px]">touch_app</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Klik produk di bawah untuk menampilkan gambar</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 w-full">
                    {unclaimedOrders
                      .filter((o) => selectedIds.has(o.id))
                      .reduce<JSX.Element[]>((list, order) => {
                        const items = order.order_product_items ?? [];
                        items.forEach((item) => {
                          const img =
                            item.product_variants?.products?.product_images?.find((i) => i.is_primary)?.image_url ??
                            item.product_variants?.products?.product_images?.[0]?.image_url;
                          const prodName = item.product_variants?.products?.name ?? 'Produk';
                        list.push(
                            <div
                              key={`${order.id}-${item.id}`}
                              className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-xl border border-pink-100 flex-shrink-0 relative group"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(order.id);
                                }}
                                className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all shadow-md group-hover:shadow-lg"
                                title="Batalkan produk ini"
                              >
                                <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                              </button>
                              {img ? (
                                <img src={img} alt={prodName} className="w-12 h-12 rounded-lg object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-gray-400 text-[20px]">inventory_2</span>
                                </div>
                              )}
                              <div className="text-center">
                                <p className="text-[11px] font-bold text-gray-700 line-clamp-2 max-w-xs">{prodName}</p>
                                <span className="inline-block text-[10px] font-black bg-[#ff4b86] text-white px-1.5 py-0.5 rounded-full mt-0.5">{item.quantity}×</span>
                              </div>
                            </div>
                          );
                        });
                        return list;
                      }, [])}
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="grid gap-3 mt-4">
            <label className="block text-sm font-semibold text-gray-700">
              Nama Staff
              <div className="relative mt-2">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">badge</span>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Contoh: Udin, Siti, Budi"
                  className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 pl-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/15 transition-colors"
                />
              </div>
            </label>

            <button
              onClick={handleClaim}
              disabled={isSubmitting || selectedCount === 0 || !staffName.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff4b86] to-[#ff6b3d] px-5 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Memproses...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                  Klaim Sekarang
                </>
              )}
            </button>

            <p className="text-xs text-gray-500">Nama staff wajib diisi untuk validasi klaim. Gunakan nama yang sesuai agar data penjualan tidak salah.</p>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={selectAll}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#ff4b86] hover:text-[#ff4b86]"
            >
              {isAllSelected ? 'Batal Semua' : 'Pilih Semua'}
            </button>
            <p className="text-xs text-gray-500">Klik kartu pesanan untuk memilih atau tidak memilih satu per satu.</p>
          </div>
        </div>
      )}

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={viewMode === 'product' ? 'Cari nama produk...' : 'Cari invoice SP, nama customer, atau queue...'}
          className="pl-10 pr-4 py-3 w-full rounded-2xl border-2 border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#ff4b86] transition-colors"
        />
      </div>

      {viewMode === 'product' && filteredProductOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-20 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
            <span className="material-symbols-outlined text-4xl text-gray-400">{isProductSearchEmpty ? 'check_circle' : 'search_off'}</span>
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-1">
            {isProductSearchEmpty ? 'Semua Sudah Diklaim!' : 'Tidak ditemukan'}
          </h3>
          <p className="text-gray-500 text-sm">
            {isProductSearchEmpty ? 'Tidak ada pesanan selesai yang belum memiliki nama staff.' : 'Tidak ada pesanan dengan nama produk yang dicari.'}
          </p>
        </div>
      ) : viewMode === 'product' ? (
        <div className="flex items-center gap-3 px-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={selectAll}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                isAllSelected
                  ? 'bg-[#ff4b86] border-[#ff4b86]'
                  : 'border-gray-300 group-hover:border-[#ff4b86]'
              }`}
            >
              {isAllSelected && (
                <span className="material-symbols-outlined text-white text-[14px]">check</span>
              )}
            </div>
            <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900">
              Pilih Semua ({filteredProductOrders.length} transaksi)
            </span>
          </label>

          <div className="ml-auto w-full max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk terjual..."
              className="pl-3 pr-3 py-2 w-full rounded-2xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#ff4b86] transition-colors"
            />
          </div>
        </div>
      ) : null}

      {/* === ORDER CARDS / PRINT TABLE === */}
      {viewMode === 'product' ? (
        <div className="space-y-3">
          {currentPageOrders.map((order) => {
            const isSelected = selectedIds.has(order.id);
            const items = order.order_product_items ?? [];
            const firstImage = items[0]?.product_variants?.products?.product_images?.find(
              (img) => img.is_primary
            )?.image_url ?? items[0]?.product_variants?.products?.product_images?.[0]?.image_url;

            const paidDate = order.paid_at
              ? new Date(order.paid_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
              : null;

            return (
              <div
                key={order.id}
                onClick={() => toggleSelect(order.id)}
                className={`group relative bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-[#ff4b86] shadow-lg shadow-pink-100/60'
                    : 'border-gray-100 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-4 bottom-4 w-1 bg-[#ff4b86] rounded-r-full" />
                )}

                <div className="flex items-start gap-4 pl-1">
                  <div className="flex-shrink-0 pt-1">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#ff4b86] border-[#ff4b86]'
                          : 'border-gray-300 group-hover:border-[#ff4b86]'
                      }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-white text-[14px]">check</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt="product"
                        className="w-14 h-14 rounded-xl object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400 text-[24px]">inventory_2</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            {order.order_number}
                          </span>
                          {paidDate && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                              {paidDate}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {order.profiles?.name || order.profiles?.email || 'Customer'}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`text-base font-black ${isSelected ? 'text-[#ff4b86]' : 'text-gray-900'}`}>
                          Rp {formatCurrency(order.total)}
                        </p>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {items.map((item) => (
                          <span
                            key={item.id}
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                              isSelected
                                ? 'bg-pink-50 border-pink-200 text-pink-700'
                                : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                          >
                            <span className="font-black">{item.quantity}×</span>
                            {item.product_variants?.products?.name ?? 'Produk'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
              <div>
                Menampilkan {currentPageOrders.length} dari {filteredProductOrders.length} transaksi
              </div>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-[#ff4b86] hover:text-[#ff4b86]"
                >
                  Sebelumnya
                </button>
                <span className="px-2">Halaman {currentPage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-[#ff4b86] hover:text-[#ff4b86]"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
      {/* PRINT_FEATURE_DISABLED - print table view (komment untuk disable):
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Queue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPrintOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 align-top text-gray-900 font-semibold">{order.doku_order_id || '-'}</td>
                  <td className="px-4 py-4 align-top text-gray-700">{order.customer_name || order.customer_email || '-'}</td>
                  <td className="px-4 py-4 align-top text-gray-700">{order.queue_number || '-'}</td>
                  <td className="px-4 py-4 align-top text-right font-black text-gray-900">Rp {formatCurrency(order.amount ?? 0)}</td>
                  <td className="px-4 py-4 align-top text-right text-gray-500">
                    {order.paid_at
                      ? new Date(order.paid_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })
                      : order.created_at
                      ? new Date(order.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      */}
    </div>
  );
}
