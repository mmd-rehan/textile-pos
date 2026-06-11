import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { productsApi, type PurchaseProductSearchResult } from '../../api/products';
import type { ProductType } from '../../types';
import Badge from '../ui/Badge';

type TypeFilter = 'ALL' | ProductType;

const TYPE_CHIPS: { label: string; value: TypeFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Fabric Rolls', value: 'FABRIC_ROLL' },
  { label: 'Cut Pieces', value: 'CUT_PIECE' },
  { label: 'Fixed Products', value: 'FIXED_PRODUCT' },
];

const PRODUCT_TYPE_BADGE: Record<ProductType, { label: string; variant: 'blue' | 'yellow' | 'purple' }> = {
  FABRIC_ROLL: { label: 'Roll', variant: 'blue' },
  FIXED_PRODUCT: { label: 'Fixed', variant: 'yellow' },
  CUT_PIECE: { label: 'Cut', variant: 'purple' },
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface PurchaseProductPickerProps {
  value: string;
  onSelect: (product: PurchaseProductSearchResult) => void;
  error?: boolean;
}

export default function PurchaseProductPicker({ value, onSelect, error }: PurchaseProductPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<PurchaseProductSearchResult | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchText, 300);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['purchase-product-search', debouncedSearch, typeFilter],
    queryFn: () =>
      productsApi.searchForPurchase({
        search: debouncedSearch || undefined,
        productType: typeFilter !== 'ALL' ? typeFilter : undefined,
        pageSize: 20,
      }),
    enabled: isOpen,
  });

  const results = data?.data ?? [];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 40);
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Reset selection when value is cleared externally (e.g., row removal or form reset)
  useEffect(() => {
    if (!value) setSelectedProduct(null);
  }, [value]);

  // Scroll focused result into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[focusedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  function open() {
    setIsOpen(true);
    setSearchText('');
  }

  function handleSelect(product: PurchaseProductSearchResult) {
    setSelectedProduct(product);
    setIsOpen(false);
    setSearchText('');
    onSelect(product);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && results[focusedIndex]) {
        handleSelect(results[focusedIndex]);
        return;
      }
      // Exact barcode/code match → auto-select
      if (debouncedSearch && results.length > 0) {
        const exact = results.find(
          (p) => p.barcode === debouncedSearch || p.productCode === debouncedSearch,
        );
        if (exact) { handleSelect(exact); return; }
      }
      // Single result → auto-select
      if (results.length === 1) {
        handleSelect(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const typeBadge = selectedProduct ? PRODUCT_TYPE_BADGE[selectedProduct.productType] : null;

  return (
    <div ref={containerRef} className="relative">
      {/* ── Selected product card ── */}
      {!isOpen && selectedProduct ? (
        <div
          className={`flex items-start gap-2 p-2.5 border rounded-lg bg-gray-50 ${
            error ? 'border-red-300' : 'border-gray-200'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {typeBadge && <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>}
              <span className="text-sm font-medium text-gray-900 truncate">{selectedProduct.name}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
              <span className="font-mono">{selectedProduct.productCode}</span>
              {selectedProduct.barcode && (
                <span className="font-mono text-gray-400">{selectedProduct.barcode}</span>
              )}
              {selectedProduct.category && <span>{selectedProduct.category.name}</span>}
              {selectedProduct.brand && <span>{selectedProduct.brand.name}</span>}
              {selectedProduct.defaultUnit && <span>{selectedProduct.defaultUnit.abbreviation}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={open}
            className="flex-shrink-0 text-xs px-2 py-1 rounded text-primary-600 hover:text-primary-800 hover:bg-primary-50 transition-colors"
          >
            Change
          </button>
        </div>
      ) : !isOpen ? (
        /* ── Trigger button ── */
        <button
          type="button"
          onClick={open}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-sm border rounded bg-white text-left focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors ${
            error
              ? 'border-red-300 hover:border-red-400'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-gray-400">Search product by name, code, or barcode…</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        </button>
      ) : null}

      {/* ── Dropdown ── */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
          {/* Type filter chips */}
          <div className="px-3 pt-2.5 pb-2 border-b border-gray-100">
            <div className="flex gap-1.5 flex-wrap">
              {TYPE_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => {
                    setTypeFilter(chip.value);
                    setFocusedIndex(-1);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    typeFilter === chip.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search input */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setFocusedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Name, code, barcode, brand, category…"
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoComplete="off"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText('');
                    setFocusedIndex(-1);
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Results list */}
          <div className="max-h-60 overflow-y-auto" ref={listRef}>
            {isFetching && (
              <div className="px-4 py-6 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500 mx-auto mb-1.5" />
                <p className="text-xs text-gray-500">Searching…</p>
              </div>
            )}

            {!isFetching && isError && (
              <div className="px-4 py-5 text-center">
                <p className="text-xs text-red-600">Failed to load products. Please try again.</p>
              </div>
            )}

            {!isFetching && !isError && results.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-500">No products found</p>
                {debouncedSearch && (
                  <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                )}
                {!debouncedSearch && (
                  <p className="text-xs text-gray-400 mt-1">Start typing to search</p>
                )}
              </div>
            )}

            {!isFetching &&
              !isError &&
              results.map((product, i) => {
                const { label, variant } = PRODUCT_TYPE_BADGE[product.productType];
                const isFocused = focusedIndex === i;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors ${
                      isFocused ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={variant}>{label}</Badge>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                          <span className="font-mono">{product.productCode}</span>
                          {product.barcode && (
                            <span className="font-mono text-gray-400">{product.barcode}</span>
                          )}
                          {product.category && <span>{product.category.name}</span>}
                          {product.brand && <span>{product.brand.name}</span>}
                          {product.color && <span>{product.color.name}</span>}
                          {product.design && <span>{product.design.name}</span>}
                          {product.defaultUnit && <span>{product.defaultUnit.abbreviation}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-mono whitespace-nowrap pt-0.5">
                        {product.retailPrice}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {!isFetching && results.length > 0
                ? `${results.length} result${results.length !== 1 ? 's' : ''}`
                : ''}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
