import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Barcode,
  CheckCircle,
  Minus,
  Package,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  User,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { customersApi } from '../../api/customers';
import { inventoryApi } from '../../api/inventory';
import { salesApi } from '../../api/sales';
import Modal from '../../components/ui/Modal';
import { formatAmount, GLOBAL_SALE_CURRENCY } from '../../constants/currencies';
import { useAppStore } from '../../store/useAppStore';
import type {
  BarcodeLookupResult,
  Customer,
  POSSearchResult,
  ReceiptData,
  RollSummaryItem,
  StockItemSummary,
} from '../../types';

const M_TO_YD = 1.093613;
const YD_TO_M = 0.9144;

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_WALLET', label: 'Mobile Wallet' },
];

// ── Cart line types ──────────────────────────────────────────────────────────

interface RollCartLine {
  id: string;
  lineType: 'ROLL';
  rollId: string;
  productId: string;
  rollNumber: string;
  productName: string;
  productCode: string;
  colorName: string | null;
  designName: string | null;
  remainingLengthYard: string;
  billedQuantity: string;
  actualCutQuantity: string;
  unit: 'YARD' | 'METER';
  unitPrice: string;
  discountAmount: string;
}

interface QuantityCartLine {
  id: string;
  lineType: 'QUANTITY';
  productId: string;
  productStockItemId: string;
  productName: string;
  productCode: string;
  colorName: string | null;
  designName: string | null;
  quantityOnHand: string;
  unitAbbreviation: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
}

type CartLine = RollCartLine | QuantityCartLine;

// ── Other interfaces ─────────────────────────────────────────────────────────

interface PaymentEntry {
  method: string;
  amount: string;
}

interface RollPickerState {
  productName: string;
  productId: string;
  productCode: string;
  rolls: RollSummaryItem[];
}

interface StockPickerState {
  productName: string;
  productId: string;
  productCode: string;
  items: StockItemSummary[];
}

// ── Line value helpers ───────────────────────────────────────────────────────

function getRollLineValues(line: RollCartLine) {
  const factor = line.unit === 'METER' ? M_TO_YD : 1;
  const billed = parseFloat(line.billedQuantity) || 0;
  const actualCut = line.actualCutQuantity !== '' ? parseFloat(line.actualCutQuantity) || 0 : billed;
  const billedYard = billed * factor;
  const actualCutYard = actualCut * factor;
  const remaining = parseFloat(line.remainingLengthYard) || 0;
  const remainingAfterCut = remaining - actualCutYard;
  const wastageYard = Math.max(0, actualCutYard - billedYard);
  const unitPrice = parseFloat(line.unitPrice) || 0;
  const discount = parseFloat(line.discountAmount) || 0;
  const grossSubTotal = billed * unitPrice;
  const subTotal = Math.max(0, grossSubTotal - discount);
  return { billedYard, actualCutYard, remainingAfterCut, wastageYard, grossSubTotal, subTotal };
}

function getQtyLineSubtotal(line: QuantityCartLine) {
  const qty = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unitPrice) || 0;
  const discount = parseFloat(line.discountAmount) || 0;
  return Math.max(0, qty * price - discount);
}

function getInvoiceTotals(lines: CartLine[], payments: PaymentEntry[]) {
  const netAmount = lines.reduce((s, l) => {
    if (l.lineType === 'ROLL') return s + getRollLineValues(l).subTotal;
    return s + getQtyLineSubtotal(l);
  }, 0);
  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const due = Math.max(0, netAmount - totalPaid);
  return { netAmount, totalPaid, due };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function RetailPOSPage() {
  const { showNotification } = useAppStore();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [barcodeValue, setBarcodeValue] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<POSSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: 'CASH', amount: '' }]);
  const [notes, setNotes] = useState('');

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [rollPicker, setRollPicker] = useState<RollPickerState | null>(null);
  const [stockPicker, setStockPicker] = useState<StockPickerState | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => customersApi.getAll({ search: customerSearch || undefined, limit: 10 }),
    enabled: customerSearch.length > 0 || showCustomerDropdown,
    select: (r) => r.data,
  });

  const selectedCustomer = customersData?.find((c) => c.id === customerId);

  const refocusBarcode = useCallback(() => {
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Product search (debounced)
  function handleProductSearchChange(value: string) {
    setProductSearch(value);
    setShowSearchDropdown(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await inventoryApi.posSearch(value.trim(), 8);
        setSearchResults(res.data);
        setShowSearchDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }

  function handleSearchResultSelect(result: POSSearchResult) {
    setProductSearch('');
    setSearchResults([]);
    setShowSearchDropdown(false);

    if (result.productType === 'FABRIC_ROLL') {
      const rolls = result.availableRolls;
      if (rolls.length === 0) {
        setScanError(`No rolls in stock for "${result.name}"`);
        return;
      }
      if (rolls.length === 1) {
        addRollToCart({
          id: rolls[0].id,
          rollNumber: rolls[0].rollNumber,
          productId: result.id,
          productName: result.name,
          productCode: result.productCode,
          colorName: result.color?.name ?? null,
          designName: result.design?.name ?? null,
          remainingLengthYard: rolls[0].remainingLengthYard,
          salePricePerYard: rolls[0].salePricePerYard ?? null,
        });
      } else {
        setRollPicker({
          productName: result.name,
          productId: result.id,
          productCode: result.productCode,
          rolls: rolls,
        });
      }
    } else {
      // FIXED_PRODUCT or CUT_PIECE
      const items = result.stockItems;
      if (items.length === 0) {
        setScanError(`No stock available for "${result.name}"`);
        return;
      }
      if (items.length === 1) {
        addStockItemToCart(result, items[0]);
      } else {
        setStockPicker({
          productName: result.name,
          productId: result.id,
          productCode: result.productCode,
          items: items,
        });
      }
    }
    refocusBarcode();
  }

  // Barcode scan
  const handleBarcodeSubmit = async () => {
    const val = barcodeValue.trim();
    if (!val) return;
    setScanLoading(true);
    setScanError(null);
    try {
      const res = await inventoryApi.lookupBarcode(val);
      const result: BarcodeLookupResult = res.data;

      if (result.type === 'ROLL') {
        if (result.blocked) {
          setScanError(result.statusMessage ?? 'Roll cannot be sold');
          setBarcodeValue('');
          return;
        }
        if (!result.roll) return;
        addRollToCart({
          id: result.roll.id,
          rollNumber: result.roll.rollNumber,
          productId: result.roll.product?.id ?? '',
          productName: result.roll.product?.name ?? '',
          productCode: result.roll.product?.productCode ?? '',
          colorName: result.roll.color?.name ?? null,
          designName: result.roll.design?.name ?? null,
          remainingLengthYard: result.roll.remainingLengthYard,
          salePricePerYard: result.roll.salePricePerYard ?? null,
        });
      } else if (result.type === 'STOCK_ITEM' && result.stockItem) {
        const si = result.stockItem;
        if (parseFloat(si.quantityOnHand) <= 0) {
          setScanError(`"${si.product.name}" is out of stock`);
          setBarcodeValue('');
          return;
        }
        addStockItemToCart(
          {
            id: si.productId,
            name: si.product.name,
            productCode: si.product.productCode,
            productType: si.product.productType,
            color: si.color ?? null,
            design: si.design ?? null,
          },
          {
            id: si.id,
            quantityOnHand: si.quantityOnHand,
            barcodeValue: si.barcodeValue,
            salePricePerUnit: si.salePricePerUnit,
            location: si.location,
            color: si.color ?? null,
            design: si.design ?? null,
            unit: si.unit,
          },
        );
      } else if (result.type === 'PRODUCT' && result.product) {
        const p = result.product;
        if (p.productType === 'FABRIC_ROLL') {
          const rolls = p.availableRolls ?? [];
          if (rolls.length === 0) {
            setScanError(`No rolls in stock for "${p.name}"`);
          } else if (rolls.length === 1) {
            addRollToCart({
              id: rolls[0].id,
              rollNumber: rolls[0].rollNumber,
              productId: p.id,
              productName: p.name,
              productCode: p.productCode,
              colorName: p.color?.name ?? null,
              designName: p.design?.name ?? null,
              remainingLengthYard: rolls[0].remainingLengthYard,
              salePricePerYard: rolls[0].salePricePerYard ?? null,
            });
          } else {
            setRollPicker({
              productName: p.name,
              productId: p.id,
              productCode: p.productCode,
              rolls: rolls,
            });
          }
        } else {
          const items = p.stockItems ?? [];
          if (items.length === 0) {
            setScanError(`No stock available for "${p.name}"`);
          } else if (items.length === 1) {
            addStockItemToCart(
              { id: p.id, name: p.name, productCode: p.productCode, productType: p.productType, color: p.color ?? null, design: p.design ?? null },
              items[0],
            );
          } else {
            setStockPicker({
              productName: p.name,
              productId: p.id,
              productCode: p.productCode,
              items: items,
            });
          }
        }
      }
      setBarcodeValue('');
    } catch (err: any) {
      const code = err?.code ?? err?.response?.data?.error?.code;
      setScanError(code === 'BARCODE_NOT_FOUND' ? 'Barcode not found.' : 'Lookup failed.');
      setBarcodeValue('');
    } finally {
      setScanLoading(false);
      refocusBarcode();
    }
  };

  function addRollToCart(roll: {
    id: string;
    rollNumber: string;
    productId: string;
    productName: string;
    productCode: string;
    colorName: string | null;
    designName: string | null;
    remainingLengthYard: string;
    salePricePerYard: string | null;
  }) {
    const existing = cartLines.find((l) => l.lineType === 'ROLL' && l.rollId === roll.id);
    if (existing) {
      setScanError(`Roll ${roll.rollNumber} is already in the cart.`);
      return;
    }
    setCartLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        lineType: 'ROLL',
        rollId: roll.id,
        productId: roll.productId,
        rollNumber: roll.rollNumber,
        productName: roll.productName,
        productCode: roll.productCode,
        colorName: roll.colorName,
        designName: roll.designName,
        remainingLengthYard: roll.remainingLengthYard,
        billedQuantity: '',
        actualCutQuantity: '',
        unit: 'YARD',
        unitPrice: roll.salePricePerYard ?? '0',
        discountAmount: '0',
      } satisfies RollCartLine,
    ]);
    setScanError(null);
  }

  function addStockItemToCart(
    product: { id: string; name: string; productCode: string; productType: string; color?: { name: string } | null; design?: { name: string } | null },
    item: StockItemSummary,
  ) {
    const existing = cartLines.find((l) => l.lineType === 'QUANTITY' && l.productStockItemId === item.id);
    if (existing) {
      // Increment quantity instead of duplicate
      setCartLines((prev) =>
        prev.map((l) => {
          if (l.lineType === 'QUANTITY' && l.productStockItemId === item.id) {
            const newQty = (parseFloat(l.quantity) || 0) + 1;
            return { ...l, quantity: String(newQty) };
          }
          return l;
        }),
      );
      return;
    }
    setCartLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        lineType: 'QUANTITY',
        productId: product.id,
        productStockItemId: item.id,
        productName: product.name,
        productCode: product.productCode,
        colorName: item.color?.name ?? product.color?.name ?? null,
        designName: item.design?.name ?? product.design?.name ?? null,
        quantityOnHand: item.quantityOnHand,
        unitAbbreviation: item.unit?.abbreviation ?? 'pc',
        quantity: '1',
        unitPrice: item.salePricePerUnit ?? '0',
        discountAmount: '0',
      } satisfies QuantityCartLine,
    ]);
    setScanError(null);
  }

  function updateLine(id: string, updates: Partial<RollCartLine> | Partial<QuantityCartLine>) {
    setCartLines((prev) => prev.map((l) => (l.id === id ? ({ ...l, ...updates } as CartLine) : l)));
  }

  function removeLine(id: string) {
    setCartLines((prev) => prev.filter((l) => l.id !== id));
  }

  function handleUnitChange(lineId: string, line: RollCartLine, newUnit: 'YARD' | 'METER') {
    if (newUnit === line.unit) return;
    const price = parseFloat(line.unitPrice) || 0;
    const newPrice =
      newUnit === 'METER' ? (price * YD_TO_M).toFixed(2) : (price / YD_TO_M).toFixed(2);
    updateLine(lineId, { unit: newUnit, unitPrice: newPrice });
  }

  function addPayment() {
    setPayments((prev) => [...prev, { method: 'CASH', amount: '' }]);
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePayment(index: number, updates: Partial<PaymentEntry>) {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  }

  function fillRemainingAsCash() {
    const { due } = getInvoiceTotals(cartLines, payments);
    if (due <= 0) return;
    const cashIdx = payments.findIndex((p) => p.method === 'CASH');
    if (cashIdx >= 0) {
      updatePayment(cashIdx, {
        amount: (parseFloat(payments[cashIdx].amount || '0') + due).toFixed(2),
      });
    } else {
      setPayments((prev) => [...prev, { method: 'CASH', amount: due.toFixed(2) }]);
    }
  }

  const canSubmit =
    cartLines.length > 0 &&
    cartLines.every((l) => {
      if (l.lineType === 'ROLL') return parseFloat(l.billedQuantity) > 0 && parseFloat(l.unitPrice) >= 0;
      return parseFloat(l.quantity) > 0 && parseFloat(l.unitPrice) >= 0;
    }) &&
    !isSubmitting;

  async function handleCompleteSale() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitErrors([]);

    const idempotencyKey = crypto.randomUUID();

    const rollLines = cartLines.filter((l): l is RollCartLine => l.lineType === 'ROLL');
    const qtyLines = cartLines.filter((l): l is QuantityCartLine => l.lineType === 'QUANTITY');

    try {
      const dto = {
        customerId: customerId ?? undefined,
        lines: rollLines.length > 0
          ? rollLines.map((l) => ({
              productId: l.productId,
              rollId: l.rollId,
              billedQuantity: parseFloat(l.billedQuantity),
              actualCutQuantity: l.actualCutQuantity !== '' ? parseFloat(l.actualCutQuantity) : undefined,
              unit: l.unit,
              unitPrice: parseFloat(l.unitPrice),
              discountAmount: parseFloat(l.discountAmount) || 0,
            }))
          : undefined,
        quantityLines: qtyLines.length > 0
          ? qtyLines.map((l) => ({
              productId: l.productId,
              productStockItemId: l.productStockItemId,
              quantity: parseFloat(l.quantity),
              unitPrice: parseFloat(l.unitPrice),
              discountAmount: parseFloat(l.discountAmount) || 0,
            }))
          : undefined,
        payments: payments
          .filter((p) => parseFloat(p.amount) > 0)
          .map((p) => ({ method: p.method, amount: parseFloat(p.amount) })),
        notes: notes || undefined,
      };

      const res = await salesApi.createRetailSale(dto, idempotencyKey);
      const invoice = res.data;

      try {
        const receiptRes = await salesApi.getReceipt(invoice.id);
        setReceiptData(receiptRes.data);
      } catch {
        setReceiptData({ invoice, company: { name: 'Textile Shop', address: '', phone: '' } });
      }

      setShowReceipt(true);
      setCartLines([]);
      setPayments([{ method: 'CASH', amount: '' }]);
      setNotes('');
      setCustomerId(null);
      setCustomerSearch('');
      showNotification(`Sale ${invoice.invoiceNumber} completed!`, 'success');
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to complete sale. Please try again.';
      const code = err?.code ?? '';
      setSubmitErrors([code ? `[${code}] ${msg}` : msg]);
    } finally {
      setIsSubmitting(false);
      refocusBarcode();
    }
  }

  const { netAmount, totalPaid, due } = getInvoiceTotals(cartLines, payments);

  return (
    <div className="flex flex-col gap-4 h-full" onClick={() => refocusBarcode()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retail POS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Scan a barcode or search by product name / code</p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Cart */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Input panel: barcode + product search */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
            {/* Barcode row */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={barcodeRef}
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBarcodeSubmit();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Scan or type barcode, press Enter…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  disabled={scanLoading}
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleBarcodeSubmit(); }}
                disabled={!barcodeValue.trim() || scanLoading}
                className="px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanLoading ? 'Scanning…' : 'Scan'}
              </button>
            </div>

            {/* Product search row */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                value={productSearch}
                onChange={(e) => handleProductSearchChange(e.target.value)}
                onFocus={() => productSearch.trim() && setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Search product by name or code…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              )}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-72 overflow-y-auto">
                  {searchResults.map((result) => {
                    const isRoll = result.productType === 'FABRIC_ROLL';
                    const stockCount = isRoll ? result.availableRolls.length : result.stockItems.length;
                    const totalQty = isRoll
                      ? result.availableRolls.reduce((s, r) => s + parseFloat(r.remainingLengthYard), 0)
                      : result.stockItems.reduce((s, i) => s + parseFloat(i.quantityOnHand), 0);
                    return (
                      <button
                        key={result.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSearchResultSelect(result);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${isRoll ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {isRoll ? 'Roll' : result.productType === 'CUT_PIECE' ? 'Cut' : 'Fixed'}
                            </span>
                            <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                          </div>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{result.productCode}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {stockCount > 0 ? (
                            <>
                              <p className="text-xs font-medium text-green-700">
                                {isRoll ? `${totalQty.toFixed(1)} yd` : `${totalQty.toFixed(0)} pcs`}
                              </p>
                              <p className="text-xs text-gray-400">{stockCount} {isRoll ? 'roll(s)' : 'variant(s)'}</p>
                            </>
                          ) : (
                            <p className="text-xs text-red-500">Out of stock</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {showSearchDropdown && !searchLoading && productSearch.trim() && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 px-4 py-3 text-sm text-gray-400">
                  No products found for "{productSearch}"
                </div>
              )}
            </div>

            {scanError && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {scanError}
                <button onClick={() => setScanError(null)} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Cart table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1">
            {cartLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Cart is empty. Scan a barcode or search to add items.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-left">Qty</th>
                      <th className="px-4 py-3 text-left">Actual Cut</th>
                      <th className="px-3 py-3 text-left">Unit</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Discount</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cartLines.map((line) => {
                      if (line.lineType === 'ROLL') {
                        const v = getRollLineValues(line);
                        const hasWastage = v.wastageYard > 0.001;
                        const insufficientLength = v.remainingAfterCut < -0.001;
                        return (
                          <tr key={line.id} className={insufficientLength ? 'bg-red-50' : 'bg-blue-50/30'}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-blue-100 text-blue-700">Roll</span>
                                <p className="font-mono text-xs font-medium text-gray-900">{line.rollNumber}</p>
                              </div>
                              <p className="text-gray-500 text-xs truncate max-w-[160px]">{line.productName}</p>
                              {line.colorName && (
                                <p className="text-gray-400 text-xs">{line.colorName}{line.designName ? ` · ${line.designName}` : ''}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-0.5">
                                Remaining: <span className={`font-mono ${insufficientLength ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                  {parseFloat(line.remainingLengthYard).toFixed(2)} yd
                                </span>
                                {' '}→ <span className={`font-mono ${insufficientLength ? 'text-red-600 font-bold' : v.remainingAfterCut < 0.5 ? 'text-amber-600' : 'text-green-600'}`}>
                                  {Math.max(0, v.remainingAfterCut).toFixed(2)} yd
                                </span>
                              </p>
                              {hasWastage && (
                                <p className="text-xs text-amber-600 mt-0.5">Wastage: {v.wastageYard.toFixed(4)} yd</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number" min="0" step="0.01"
                                value={line.billedQuantity}
                                onChange={(e) => updateLine(line.id, { billedQuantity: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="0.00"
                              />
                              {line.unit === 'METER' && parseFloat(line.billedQuantity) > 0 && (
                                <p className="text-xs text-gray-400 font-mono mt-0.5 text-right">
                                  ≈ {(parseFloat(line.billedQuantity) * M_TO_YD).toFixed(2)} yd
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number" min="0" step="0.01"
                                value={line.actualCutQuantity}
                                onChange={(e) => updateLine(line.id, { actualCutQuantity: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder={line.billedQuantity || '= billed'}
                              />
                              {insufficientLength && (
                                <p className="text-xs text-red-600 font-medium mt-0.5">Exceeds roll</p>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <select
                                value={line.unit}
                                onChange={(e) => handleUnitChange(line.id, line, e.target.value as 'YARD' | 'METER')}
                                onClick={(e) => e.stopPropagation()}
                                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="YARD">yd</option>
                                <option value="METER">m</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number" min="0" step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => updateLine(line.id, { unitPrice: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number" min="0" step="0.01"
                                value={line.discountAmount}
                                onChange={(e) => updateLine(line.id, { discountAmount: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 whitespace-nowrap">
                              {formatAmount(v.subTotal, GLOBAL_SALE_CURRENCY)}
                            </td>
                            <td className="px-3 py-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); removeLine(line.id); }}
                                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      // QUANTITY line
                      const subtotal = getQtyLineSubtotal(line);
                      const qtyNum = parseFloat(line.quantity) || 0;
                      const onHand = parseFloat(line.quantityOnHand) || 0;
                      const overStock = qtyNum > onHand;
                      return (
                        <tr key={line.id} className={overStock ? 'bg-red-50' : 'bg-amber-50/30'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-amber-100 text-amber-700">
                                <Package className="w-3 h-3 inline mr-0.5" />Fixed
                              </span>
                            </div>
                            <p className="text-gray-900 text-xs font-medium truncate max-w-[160px]">{line.productName}</p>
                            {line.colorName && (
                              <p className="text-gray-400 text-xs">{line.colorName}{line.designName ? ` · ${line.designName}` : ''}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">
                              On hand: <span className={`font-mono font-medium ${overStock ? 'text-red-600' : 'text-green-600'}`}>
                                {onHand.toFixed(0)} {line.unitAbbreviation}
                              </span>
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); updateLine(line.id, { quantity: String(Math.max(1, qtyNum - 1)) }); }}
                                className="p-1 rounded border border-gray-300 hover:bg-gray-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number" min="1" step="1"
                                value={line.quantity}
                                onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-16 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500 ${overStock ? 'border-red-400' : 'border-gray-300'}`}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); updateLine(line.id, { quantity: String(qtyNum + 1) }); }}
                                className="p-1 rounded border border-gray-300 hover:bg-gray-100"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            {overStock && (
                              <p className="text-xs text-red-600 font-medium mt-0.5">Exceeds stock</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 italic">—</td>
                          <td className="px-3 py-3">
                            <span className="text-sm text-gray-600">{line.unitAbbreviation}</span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number" min="0" step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(line.id, { unitPrice: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number" min="0" step="0.01"
                              value={line.discountAmount}
                              onChange={(e) => updateLine(line.id, { discountAmount: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 whitespace-nowrap">
                            {formatAmount(subtotal, GLOBAL_SALE_CURRENCY)}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); removeLine(line.id); }}
                              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Customer + Payment + Submit */}
        <div className="w-80 flex flex-col gap-4 shrink-0">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Customer (optional)
            </label>
            {customerId && selectedCustomer ? (
              <div>
                <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary-600" />
                    <div>
                      <p className="text-sm font-medium text-primary-900">{selectedCustomer.name}</p>
                      {selectedCustomer.phone && (
                        <p className="text-xs text-primary-600">{selectedCustomer.phone}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCustomerId(null); setCustomerSearch(''); }}
                    className="p-1 text-primary-400 hover:text-primary-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {parseFloat(selectedCustomer.currentBalance) > 0 && (
                  <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${
                    selectedCustomer.creditLimit &&
                    parseFloat(selectedCustomer.currentBalance) >= parseFloat(selectedCustomer.creditLimit)
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Outstanding:{' '}
                      <span className="font-mono font-semibold">
                        {formatAmount(selectedCustomer.currentBalance, GLOBAL_SALE_CURRENCY)}
                      </span>
                      {selectedCustomer.creditLimit && (
                        <> / Limit: <span className="font-mono">{formatAmount(selectedCustomer.creditLimit, GLOBAL_SALE_CURRENCY)}</span></>
                      )}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Search by name or phone…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {showCustomerDropdown && customersData && customersData.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {customersData.map((c: Customer) => (
                      <button
                        key={c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerId(c.id);
                          setCustomerSearch('');
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{c.name}</p>
                            {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                          </div>
                          {parseFloat(c.currentBalance) > 0 && (
                            <span className="text-xs font-mono text-amber-700 shrink-0 ml-2">
                              {formatAmount(c.currentBalance, GLOBAL_SALE_CURRENCY)}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payments</label>
              <button
                onClick={(e) => { e.stopPropagation(); addPayment(); }}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {payments.map((payment, idx) => (
              <div key={idx} className="flex gap-2">
                <select
                  value={payment.method}
                  onChange={(e) => updatePayment(idx, { method: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number" min="0" step="0.01"
                  value={payment.amount}
                  onChange={(e) => updatePayment(idx, { amount: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="0.00"
                  className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {payments.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removePayment(idx); }}
                    className="p-1.5 text-gray-400 hover:text-red-500"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total</span>
                <span className="font-mono">{formatAmount(netAmount, GLOBAL_SALE_CURRENCY)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Paid</span>
                <span className="font-mono text-green-600">{formatAmount(totalPaid, GLOBAL_SALE_CURRENCY)}</span>
              </div>
              <div className={`flex justify-between text-sm font-semibold ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span>{due > 0 ? 'Due' : 'Change'}</span>
                <span className="font-mono">{formatAmount(Math.abs(totalPaid - netAmount), GLOBAL_SALE_CURRENCY)}</span>
              </div>
              {due > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); fillRemainingAsCash(); }}
                  className="w-full text-xs text-primary-600 hover:text-primary-700 text-right"
                >
                  Fill remaining as cash →
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={2}
              placeholder="Any notes for this sale…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {submitErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              {submitErrors.map((e, i) => (
                <p key={i} className="text-sm text-red-700">{e}</p>
              ))}
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); handleCompleteSale(); }}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Complete Sale
              </>
            )}
          </button>
        </div>
      </div>

      {/* Roll picker modal */}
      {rollPicker && (
        <Modal
          open
          onClose={() => { setRollPicker(null); refocusBarcode(); }}
          title={`Select Roll — ${rollPicker.productName}`}
          size="sm"
        >
          <div className="space-y-2">
            {rollPicker.rolls.map((roll) => (
              <button
                key={roll.id}
                onClick={() => {
                  addRollToCart({
                    id: roll.id,
                    rollNumber: roll.rollNumber,
                    productId: rollPicker.productId,
                    productName: rollPicker.productName,
                    productCode: rollPicker.productCode,
                    colorName: null,
                    designName: null,
                    remainingLengthYard: roll.remainingLengthYard,
                    salePricePerYard: roll.salePricePerYard ?? null,
                  });
                  setRollPicker(null);
                  refocusBarcode();
                }}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-primary-50 rounded-lg text-sm text-left border border-transparent hover:border-primary-200 transition-colors"
              >
                <div>
                  <p className="font-mono font-medium text-gray-900">{roll.rollNumber}</p>
                  {roll.location && <p className="text-xs text-gray-400">{roll.location}</p>}
                </div>
                <div className="text-right">
                  <p className="font-mono text-gray-700">{parseFloat(roll.remainingLengthYard).toFixed(2)} yd</p>
                  {roll.salePricePerYard && (
                    <p className="text-xs text-gray-500">{formatAmount(roll.salePricePerYard, GLOBAL_SALE_CURRENCY)}/yd</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Stock item picker modal */}
      {stockPicker && (
        <Modal
          open
          onClose={() => { setStockPicker(null); refocusBarcode(); }}
          title={`Select Variant — ${stockPicker.productName}`}
          size="sm"
        >
          <div className="space-y-2">
            {stockPicker.items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  addStockItemToCart(
                    { id: stockPicker.productId, name: stockPicker.productName, productCode: stockPicker.productCode, productType: 'FIXED_PRODUCT' },
                    item,
                  );
                  setStockPicker(null);
                  refocusBarcode();
                }}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-amber-50 rounded-lg text-sm text-left border border-transparent hover:border-amber-200 transition-colors"
              >
                <div>
                  {item.color && <p className="font-medium text-gray-900">{item.color.name}{item.design ? ` · ${item.design.name}` : ''}</p>}
                  {!item.color && <p className="font-medium text-gray-900">Default Variant</p>}
                  {item.location && <p className="text-xs text-gray-400">{item.location}</p>}
                  {item.barcodeValue && <p className="text-xs font-mono text-gray-400">{item.barcodeValue}</p>}
                </div>
                <div className="text-right">
                  <p className={`font-mono font-medium ${parseFloat(item.quantityOnHand) > 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {parseFloat(item.quantityOnHand).toFixed(0)} {item.unit?.abbreviation ?? 'pc'}
                  </p>
                  {item.salePricePerUnit && (
                    <p className="text-xs text-gray-500">{formatAmount(item.salePricePerUnit, GLOBAL_SALE_CURRENCY)}/pc</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Receipt modal */}
      {showReceipt && receiptData && (
        <ReceiptModal
          data={receiptData}
          onClose={() => {
            setShowReceipt(false);
            refocusBarcode();
          }}
        />
      )}
    </div>
  );
}

// ── Receipt modal ────────────────────────────────────────────────────────────

function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const { invoice, company } = data;

  return (
    <Modal open onClose={onClose} title="Sale Receipt" size="md">
      <style>{`
        @media print {
          body > *:not(#print-receipt-root) { display: none !important; }
          #print-receipt-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div id="print-receipt-root">
        <div id="receipt-content" className="space-y-4 text-sm">
          <div className="text-center border-b border-gray-200 pb-4">
            <h2 className="text-lg font-bold text-gray-900">{company.name}</h2>
            {company.address && <p className="text-gray-500 text-xs">{company.address}</p>}
            {company.phone && <p className="text-gray-500 text-xs">{company.phone}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-500">Invoice</p>
              <p className="font-mono font-bold text-gray-900">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Date</p>
              <p className="text-gray-900">{new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
            {invoice.customer && (
              <div className="col-span-2">
                <p className="text-gray-500">Customer</p>
                <p className="text-gray-900">{invoice.customer.name}</p>
                {invoice.customer.phone && <p className="text-gray-400">{invoice.customer.phone}</p>}
              </div>
            )}
            <div className="col-span-2">
              <p className="text-gray-500">Cashier</p>
              <p className="text-gray-900">{invoice.cashier?.username}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1">Item</th>
                  <th className="text-right py-1">Qty</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.saleInvoiceItems?.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1.5">
                      <p className="font-medium text-gray-900">{item.product?.name}</p>
                      {item.roll?.rollNumber && (
                        <p className="text-gray-400 font-mono">{item.roll.rollNumber}</p>
                      )}
                      {item.color && <p className="text-gray-400">{item.color.name}</p>}
                    </td>
                    <td className="text-right py-1.5 font-mono">
                      {parseFloat(item.billedQuantity).toFixed(2)} {item.unit?.abbreviation ?? (item.roll ? 'yd' : 'pc')}
                    </td>
                    <td className="text-right py-1.5 font-mono">
                      {formatAmount(item.unitPrice, GLOBAL_SALE_CURRENCY)}
                    </td>
                    <td className="text-right py-1.5 font-mono font-medium">
                      {formatAmount(item.subTotal, GLOBAL_SALE_CURRENCY)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 pt-3 space-y-1 text-xs">
            {parseFloat(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span className="font-mono">- {formatAmount(invoice.discountAmount, GLOBAL_SALE_CURRENCY)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span className="font-mono">{formatAmount(invoice.netAmount, GLOBAL_SALE_CURRENCY)}</span>
            </div>
          </div>

          {invoice.salePayments && invoice.salePayments.length > 0 && (
            <div className="border-t border-gray-200 pt-3 space-y-1 text-xs">
              {invoice.salePayments.map((p) => (
                <div key={p.id} className="flex justify-between text-gray-600">
                  <span>{p.paymentMethod.replace('_', ' ')}</span>
                  <span className="font-mono text-green-600">{formatAmount(p.amount, GLOBAL_SALE_CURRENCY)}</span>
                </div>
              ))}
              {parseFloat(invoice.dueAmount) > 0 && (
                <div className="flex justify-between font-bold text-red-600">
                  <span>Due</span>
                  <span className="font-mono">{formatAmount(invoice.dueAmount, GLOBAL_SALE_CURRENCY)}</span>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-3 text-center text-xs text-gray-400">
            Thank you for your business!
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <Printer className="w-4 h-4" />
          Print Receipt
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          New Sale
        </button>
      </div>
    </Modal>
  );
}
