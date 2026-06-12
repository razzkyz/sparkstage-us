import { Plus, Trash2 } from 'lucide-react';

interface Variant {
  id?: string;
  name: string;
  sku: string;
  size_label: string;
  color: string;
  price: number;
  daily_rental_fee: number;
  total_quantity: number;
}

interface Props {
  variants: Variant[];
  setVariants: (variants: Variant[]) => void;
}

export function DressingRoomProductVariantsSection({ variants, setVariants }: Props) {
  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        name: '',
        sku: '',
        size_label: '',
        color: '',
        price: 0,
        daily_rental_fee: 15000,
        total_quantity: 0,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = {
      ...newVariants[index],
      [field]: value,
    };
    setVariants(newVariants);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
        <div>
          <h4 className="font-bold text-gray-900">Varian Produk</h4>
          <p className="mt-0.5 text-xs text-gray-500">Minimal satu varian dibutuhkan.</p>
        </div>
        <button
          type="button"
          onClick={handleAddVariant}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#ff4b86] shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={index} className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Varian {index + 1}
                </span>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nama Varian</label>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                    placeholder="Contoh: Size S"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => handleChange(index, 'sku', e.target.value)}
                    placeholder="SKU123"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ukuran</label>
                  <input
                    type="text"
                    value={variant.size_label}
                    onChange={(e) => handleChange(index, 'size_label', e.target.value)}
                    placeholder="S, M, L"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Warna</label>
                  <input
                    type="text"
                    value={variant.color}
                    onChange={(e) => handleChange(index, 'color', e.target.value)}
                    placeholder="Putih, Biru"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Total Stok</label>
                  <input
                    type="number"
                    value={variant.total_quantity}
                    onChange={(e) => handleChange(index, 'total_quantity', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    value={variant.price}
                    onChange={(e) => handleChange(index, 'price', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Biaya Sewa / Hari (Rp)</label>
                  <input
                    type="number"
                    value={variant.daily_rental_fee}
                    onChange={(e) => handleChange(index, 'daily_rental_fee', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
