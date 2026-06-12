import { formatCurrency } from '@/utils/formatters';

interface DressingRoomProductCardProps {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  onToggleActive: (productId: number, currentlyActive: boolean) => void;
}

export function DressingRoomProductCard({ product, onEdit, onDelete, onToggleActive }: DressingRoomProductCardProps) {
  const isInactive = !product.is_active;

  const variants = product.dressing_room_product_variants || [];
  const variantCount = variants.length;
  
  // Calculate aggregated stats
  const minPrice = variants.length > 0 ? Math.min(...variants.map((v: any) => v.daily_rental_fee || 0)) : 0;
  const totalStock = variants.reduce((sum: number, v: any) => sum + (v.total_quantity || 0), 0);
  
  const stockStatus = totalStock === 0 ? 'out' : totalStock < 5 ? 'low' : 'ok';
  
  const getStockBarColor = (status: string) => {
    switch (status) {
      case 'out': return 'bg-gray-300';
      case 'low': return 'bg-[#ff4b86]';
      case 'ok': return 'bg-emerald-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div
      className={`group flex flex-col rounded-xl border overflow-hidden shadow-sm transition-all duration-200 ${
        isInactive
          ? 'border-gray-300 bg-gray-50 opacity-60 hover:opacity-80'
          : 'border-gray-200 bg-white hover:shadow-md hover:border-pink-300/50'
      }`}
    >
      <div className="group aspect-[4/3] w-full bg-gray-100 relative overflow-hidden">
        {product.image_url ? (
          <img
            alt={product.name}
            src={product.image_url}
            className={`h-full w-full object-cover transition-transform duration-150 ease-out group-hover:scale-[1.02] group-active:scale-[0.99] ${isInactive ? 'grayscale' : ''}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-700">
            <span className="material-symbols-outlined text-6xl">inventory_2</span>
          </div>
        )}
        
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="absolute inset-0 z-10 cursor-pointer bg-transparent transition-colors active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 z-20">
          <div className="flex flex-col items-start gap-1">
            {isInactive && (
              <div className="bg-gray-700/90 text-white text-[10px] font-bold px-2 py-1 rounded-md tracking-wide">
                NONAKTIF
              </div>
            )}
            {!isInactive && stockStatus === 'out' && (
              <div className="bg-neutral-800 text-gray-900 text-[10px] font-bold px-2 py-1 rounded-br-lg">
                SOLD OUT
              </div>
            )}
            {!isInactive && stockStatus === 'low' && (
              <div className="bg-[#ff4b86] text-white text-[10px] font-bold px-2 py-1 rounded-br-lg">
                LOW STOCK
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(product)}
              className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-neutral-900 hover:bg-white"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(product)}
              className="rounded-lg bg-[#ff4b86]/90 px-2 py-1 text-[10px] font-bold text-white hover:bg-[#ff4b86]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="flex justify-between items-start">
            <h4 className={`text-base font-bold leading-tight ${isInactive ? 'text-gray-400' : 'text-neutral-900'}`}>
              {product.name}
            </h4>
            <span className={`text-sm font-bold ${isInactive ? 'text-gray-400' : 'text-neutral-900'}`}>
              {formatCurrency(minPrice)}/hari
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-sans capitalize">
            {product.category} • {variantCount} variants
          </p>
        </div>

        {!isInactive && (
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-1.5">
              <span className={`text-xs font-medium font-sans ${stockStatus === 'low' ? 'text-[#ff4b86]' : 'text-gray-500'}`}>
                {totalStock} in stock
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                stockStatus === 'ok' ? 'bg-emerald-50 text-emerald-700' : 
                stockStatus === 'low' ? 'bg-pink-50 text-pink-700' : 
                'bg-gray-100 text-gray-600'
              }`}>
                {stockStatus === 'ok' ? 'IN STOCK' : stockStatus === 'low' ? 'LOW STOCK' : 'OUT OF STOCK'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStockBarColor(stockStatus)} rounded-full`}
                style={{ width: `${Math.min(100, (totalStock / 20) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {isInactive && (
          <div className="mt-auto rounded-lg border border-dashed border-gray-300 bg-gray-100/60 px-3 py-2 text-center">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Produk Nonaktif</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Tidak muncul di toko</p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-2 flex gap-2 mt-auto">
          {!isInactive && (
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              RESTOCK
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleActive(product.id, product.is_active)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
              isInactive
                ? 'border border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {isInactive ? 'Aktifkan' : 'Nonaktifkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
