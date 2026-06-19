import { useState, useRef, useEffect } from 'react';
import type { HierarchicalCategoryOption } from './categoryManagerHelpers';

type HierarchicalCategorySelectProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  options: HierarchicalCategoryOption[];
  disabled?: boolean;
};

export function HierarchicalCategorySelect({
  value,
  onChange,
  options,
  disabled = false,
}: HierarchicalCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find selected category name
  const selectedOption = options.find((opt) => opt.category.id === value);
  const selectedText = selectedOption 
    ? `${selectedOption.level > 0 ? '↳ ' : ''}${selectedOption.category.name}`
    : 'No parent';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleParent = (parentId: number) => {
    setExpandedParents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  const handleSelect = (categoryId: number | null) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  // Get visible options (parents + expanded children)
  const visibleOptions = options.filter((opt) => {
    // Always show parent categories (level 0)
    if (opt.level === 0) return true;
    
    // For children, only show if their parent is expanded
    const parent = options.find((p) => p.category.id === opt.category.parent_id);
    return parent && expandedParents.has(parent.category.id);
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected value button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm outline-none transition-colors ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:border-[#ff4b86] focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>{selectedText}</span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl max-h-[300px] overflow-y-auto">
          {/* No parent option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
              value === null ? 'bg-blue-100 font-bold text-blue-900' : 'text-gray-700'
            }`}
          >
            No parent
          </button>

          {/* Hierarchical options */}
          {visibleOptions.map((opt) => {
            const isParent = opt.level === 0 && opt.hasChildren;
            const isExpanded = expandedParents.has(opt.category.id);
            const isSelected = value === opt.category.id;
            const indent = opt.level * 20; // 20px per level

            return (
              <div key={opt.category.id}>
                <div
                  className={`flex items-center transition-colors ${
                    isSelected 
                      ? 'bg-blue-100 font-bold text-blue-900' 
                      : opt.level === 0 
                      ? 'hover:bg-gray-50 text-gray-900 font-medium' 
                      : 'hover:bg-blue-50 text-gray-700'
                  }`}
                  style={{ paddingLeft: `${12 + indent}px` }}
                >
                  {/* Expand/collapse button for parents with children */}
                  {isParent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleParent(opt.category.id);
                      }}
                      className="mr-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded hover:bg-blue-200 text-blue-600 font-bold transition-colors"
                    >
                      {isExpanded ? '−' : '+'}
                    </button>
                  )}

                  {/* Spacer for non-parent items */}
                  {!isParent && opt.level === 0 && <span className="mr-1 w-6 flex-shrink-0" />}

                  {/* Arrow indicator for children */}
                  {opt.level > 0 && <span className="mr-2 text-blue-400 text-xs flex-shrink-0">↳</span>}

                  {/* Category name button */}
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.category.id)}
                    className="flex-1 py-2 pr-3 text-left text-sm"
                  >
                    {opt.category.name}
                    {opt.hasChildren && opt.level === 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({options.filter((o) => o.category.parent_id === opt.category.id).length} sub)
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {visibleOptions.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-gray-500">
              No categories available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
