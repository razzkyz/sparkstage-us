import { useState, useRef, useEffect } from 'react';

interface Variant {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  variant_sku: string;
  current_stock: number;
}

interface VariantSelectorWithSearchProps {
  variants: Variant[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectVariant: (variantId: number) => void;
  placeholder?: string;
}

export const VariantSelectorWithSearch = ({
  variants,
  searchQuery,
  onSearchChange,
  onSelectVariant,
  placeholder = 'Cari produk...',
}: VariantSelectorWithSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Always show variants (filtered or all)
  const displayVariants = variants;

  // Close dropdown when clicking outside
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

  // Reset highlighted index when variants change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [displayVariants.length]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || displayVariants.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % displayVariants.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + displayVariants.length) % displayVariants.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (displayVariants[highlightedIndex]) {
          handleSelect(displayVariants[highlightedIndex].variant_id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (variantId: number) => {
    onSelectVariant(variantId);
    onSearchChange('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (value: string) => {
    onSearchChange(value);
    setIsOpen(true); // Always open when typing or focusing
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-2 focus:ring-[#ff4b86]/20"
        />
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
          search
        </span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute z-50 mt-2 w-full max-h-[300px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {displayVariants.length > 0 ? (
            displayVariants.map((variant, index) => (
              <button
                key={variant.variant_id}
                onClick={() => handleSelect(variant.variant_id)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                  index === highlightedIndex
                    ? 'bg-[#ff4b86]/10'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {variant.product_name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {variant.variant_name} • SKU: {variant.variant_sku}
                    </p>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                      Stock: {variant.current_stock}
                    </span>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              <span className="material-symbols-outlined mb-2 text-4xl text-gray-400">
                search_off
              </span>
              <p>Tidak ada produk ditemukan</p>
              <p className="text-xs mt-1">Coba kata kunci lain</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
