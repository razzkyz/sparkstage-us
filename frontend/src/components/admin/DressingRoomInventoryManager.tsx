import { useState } from 'react';
import { Edit2, Search, Save, X, Loader } from 'lucide-react';
import { useDressingRoomInventorySummary, useUpdateDressingRoomInventory } from '../../hooks/useDressingRoomInventory';
import type { DressingRoomInventorySummary } from '../../types/dressingRoom';

interface InventoryFormState {
  variantId: number;
  totalQty: number;
  availableQty: number;
  reservedQty: number;
  damagedQty: number;
  inLaundryQty: number;
}

export function DressingRoomInventoryManager() {
  const { data: inventory, isLoading, error, refetch } = useDressingRoomInventorySummary();
  const updateInventory = useUpdateDressingRoomInventory();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formState, setFormState] = useState<InventoryFormState | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'ok'>('all');

  const products = inventory ? [...new Set(inventory.map((item) => item.product_name))] : [];

  const filteredInventory = inventory?.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchLower) ||
      item.variant_name.toLowerCase().includes(searchLower) ||
      item.sku.toLowerCase().includes(searchLower);

    const matchesProduct = !filterProduct || item.product_name === filterProduct;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'low' && item.available_quantity <= 2) ||
      (statusFilter === 'ok' && item.available_quantity > 2);

    return matchesSearch && matchesProduct && matchesStatus;
  });

  const lowStockClass = (availableQty: number) =>
    availableQty <= 2 ? 'bg-rose-50' : 'bg-white';

  const handleEdit = (item: DressingRoomInventorySummary) => {
    setEditingId(item.variant_id);
    setFormState({
      variantId: item.variant_id,
      totalQty: item.total_quantity,
      availableQty: item.available_quantity,
      reservedQty: item.reserved_quantity,
      damagedQty: item.damaged_quantity,
      inLaundryQty: item.in_laundry_quantity,
    });
  };

  const handleSave = async () => {
    if (!formState) return;

    try {
      await updateInventory.mutateAsync({
        variantId: formState.variantId,
        totalQty: formState.totalQty,
        availableQty: formState.availableQty,
        reservedQty: formState.reservedQty,
        damagedQty: formState.damagedQty,
        inLaundryQty: formState.inLaundryQty,
      });

      setEditingId(null);
      setFormState(null);
    } catch (err) {
      console.error('Failed to update inventory:', err);
      alert('Gagal update inventory');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 shadow-sm">
        <p className="font-semibold">Error loading inventory</p>
        <p className="mt-2">{String(error)}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1.7fr,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm">
            <Search className="h-5 w-5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari produk, varian, atau SKU"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 mb-2">
              Filter Produk
            </label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Semua Produk</option>
              {products.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 mb-2">
              Status Stok
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'low' | 'ok')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="all">Semua Status</option>
              <option value="low">Stok Rendah (≤ 2)</option>
              <option value="ok">Stok Aman (&gt; 2)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Ringkasan</p>
            <p className="text-sm text-slate-700">
              Menampilkan {filteredInventory?.length ?? 0} dari {inventory?.length ?? 0} item inventory.
            </p>
          </div>
          {(filterProduct || searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setFilterProduct('');
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm text-slate-700">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">Produk</th>
              <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">Varian</th>
              <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">SKU</th>
              <th className="whitespace-nowrap px-4 py-4 text-center font-semibold">Total</th>
              <th className="whitespace-nowrap px-4 py-4 text-center font-semibold">Available</th>
              <th className="whitespace-nowrap px-4 py-4 text-center font-semibold">Reserved</th>
              <th className="whitespace-nowrap px-4 py-4 text-center font-semibold">Laundry</th>
              <th className="whitespace-nowrap px-4 py-4 text-center font-semibold">Damaged</th>
              <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">Harga</th>
              <th className="whitespace-nowrap px-4 py-4 text-center font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredInventory && filteredInventory.length > 0 ? (
              filteredInventory.map((item) => (
                <tr key={item.variant_id} className={`${lowStockClass(item.available_quantity)} transition-colors hover:bg-slate-50`}>
                  {editingId === item.variant_id && formState ? (
                    <td colSpan={10} className="px-4 py-4 bg-sky-50">
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600">Total</label>
                            <input
                              type="number"
                              value={formState.totalQty}
                              onChange={(e) => setFormState({ ...formState, totalQty: parseInt(e.target.value) || 0 })}
                              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600">Available</label>
                            <input
                              type="number"
                              value={formState.availableQty}
                              onChange={(e) => setFormState({ ...formState, availableQty: parseInt(e.target.value) || 0 })}
                              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600">Reserved</label>
                            <input
                              type="number"
                              value={formState.reservedQty}
                              onChange={(e) => setFormState({ ...formState, reservedQty: parseInt(e.target.value) || 0 })}
                              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600">Laundry</label>
                            <input
                              type="number"
                              value={formState.inLaundryQty}
                              onChange={(e) => setFormState({ ...formState, inLaundryQty: parseInt(e.target.value) || 0 })}
                              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600">Damaged</label>
                            <input
                              type="number"
                              value={formState.damagedQty}
                              onChange={(e) => setFormState({ ...formState, damagedQty: parseInt(e.target.value) || 0 })}
                              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={handleSave}
                            disabled={updateInventory.isPending}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updateInventory.isPending ? (
                              <>
                                <Loader className="h-4 w-4 animate-spin" />
                                Menyimpan...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Simpan
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setFormState(null);
                            }}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-300"
                          >
                            <X className="h-4 w-4" />
                            Batal
                          </button>
                        </div>

                        {updateInventory.error && (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            Error: {String(updateInventory.error)}
                          </div>
                        )}
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-4 text-slate-900 font-medium">{item.product_name}</td>
                      <td className="px-4 py-4 text-slate-700">{item.variant_name}</td>
                      <td className="px-4 py-4 text-slate-600 font-mono text-xs bg-slate-50">{item.sku}</td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-900">{item.total_quantity}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                          {item.available_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                          {item.reserved_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                          {item.in_laundry_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold ${item.damaged_quantity ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}`}>
                          {item.damaged_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-slate-700">Rp {item.price.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleEdit(item)}
                          disabled={editingId !== null}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-600 transition hover:bg-slate-50 disabled:opacity-50"
                          title="Edit inventory"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-600">
                  Tidak ada inventory dressing room
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
          Available
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-700" />
          Reserved
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
          In Laundry
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-700" />
          Damaged
        </div>
      </div>
    </div>
  );
}

export default DressingRoomInventoryManager;
