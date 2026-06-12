import { useEffect, useRef, useState } from 'react';

interface Variant {
  variant_id: number;
  product_name: string;
  variant_name: string;
  variant_sku: string;
  current_stock: number;
  price: number | null;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariantId: number | null;
  onSelectVariant: (variantId: number | null) => void;
  searchQuery?: string;
  placeholder?: string;
}

export const VariantSelector = ({
  variants,
  selectedVariantId,
  onSelectVariant,
  searchQuery = '',
  placeholder = '-- Pilih varian --',
}: VariantSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  const combinedSearch = (searchQuery || internalSearch).toLowerCase();

  // Filter variants based on search
  const filteredVariants = variants.filter((v) => {
    const searchText = `${v.product_name} ${v.variant_name} ${v.variant_sku}`.toLowerCase();
    return searchText.includes(combinedSearch);
  });

  const selectedVariant = variants.find((v) => v.variant_id === selectedVariantId);

  // Calculate menu position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (variantId: number) => {
    onSelectVariant(variantId);
    setIsOpen(false);
    setInternalSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectVariant(null);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-left focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className={selectedVariant ? 'text-gray-900 font-medium' : 'text-gray-500'}>
          {selectedVariant
            ? `${selectedVariant.product_name} - ${selectedVariant.variant_name} (${selectedVariant.variant_sku})`
            : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedVariant && (
            <button
              onClick={handleClear}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              title="Hapus pilihan"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
          <span
            className={`material-symbols-outlined text-[18px] transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Dropdown Menu - Fixed Position */}
      {isOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
            zIndex: 9999,
          }}
          className="shadow-lg rounded-lg border border-gray-200 bg-white overflow-hidden"
        >
          {/* Search Input */}
          <div className="border-b border-gray-200 bg-gray-50 p-2 sticky top-0">
            <input
              type="text"
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder="Cari varian..."
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
            />
          </div>

          {/* Options List */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredVariants.length > 0 ? (
              filteredVariants.map((variant) => (
                <button
                  key={variant.variant_id}
                  onClick={() => handleSelect(variant.variant_id)}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors border-b border-gray-100 last:border-b-0 hover:bg-[#ff4b86]/10 ${
                    selectedVariantId === variant.variant_id
                      ? 'bg-[#ff4b86]/5 border-l-4 border-l-[#ff4b86]'
                      : ''
                  }`}
                >
                  <div className="font-semibold text-gray-900">
                    {variant.product_name} - {variant.variant_name}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {variant.variant_sku} | Stok: {variant.current_stock}
                    {variant.price && ` | Rp ${variant.price.toLocaleString('id-ID')}`}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Tidak ada varian yang cocok
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
