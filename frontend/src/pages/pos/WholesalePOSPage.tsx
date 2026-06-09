import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Barcode,
  CheckCircle,
  ClipboardList,
  Minus,
  Package,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { customersApi } from '../../api/customers';
import { inventoryApi } from '../../api/inventory';
import type { CreateWholesaleSaleInput } from '../../api/sales';
import { salesApi } from '../../api/sales';
import { settingsApi } from '../../api/settings';
import Modal from '../../components/ui/Modal';
import { formatAmount } from '../../constants/currencies';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import { useAppStore } from '../../store/useAppStore';
import type {
  BarcodeLookupResult,
  Customer,
  CustomerOutstanding,
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

interface WholesaleRollCartLine {
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
  isFullRoll: boolean;
  billedQuantity: string;
  actualCutQuantity: string;
  unit: 'YARD' | 'METER';
  unitPrice: string;
  discountAmount: string;
}

interface WholesaleQtyCartLine {
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

type WholesaleCartLine = WholesaleRollCartLine | WholesaleQtyCartLine;

interface PaymentEntry {
  method: string;
  amount: string;
}

interface RollPickerState {
  productName: string;
  productId: string;
  productCode: string;
  wholesalePrice: string;
  rolls: RollSummaryItem[];
}

interface StockPickerState {
  productName: string;
  productId: string;
  productCode: string;
  wholesalePrice: string;
  items: StockItemSummary[];
}

// ── Calculation helpers ──────────────────────────────────────────────────────

function getRollLineValues(line: WholesaleRollCartLine) {
  const factor = line.unit === 'METER' ? M_TO_YD : 1;
  const remaining = parseFloat(line.remainingLengthYard) || 0;
  const billed = line.isFullRoll ? remaining : parseFloat(line.billedQuantity) || 0;
  const actualCut =
    !line.isFullRoll && line.actualCutQuantity !== ''
      ? parseFloat(line.actualCutQuantity) || 0
      : billed;
  const billedYard = line.isFullRoll ? remaining : billed * factor;
  const actualCutYard = line.isFullRoll ? remaining : actualCut * factor;
  const remainingAfterCut = remaining - actualCutYard;
  const wastageYard = Math.max(0, actualCutYard - billedYard);
  const unitPrice = parseFloat(line.unitPrice) || 0;
  const discount = parseFloat(line.discountAmount) || 0;
  const grossSubTotal = billed * unitPrice;
  const subTotal = Math.max(0, grossSubTotal - discount);
  return { billed, billedYard, actualCutYard, remainingAfterCut, wastageYard, grossSubTotal, subTotal };
}

function getQtyLineSubtotal(line: WholesaleQtyCartLine) {
  const qty = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unitPrice) || 0;
  const discount = parseFloat(line.discountAmount) || 0;
  return Math.max(0, qty * price - discount);
}

function getInvoiceTotals(
  lines: WholesaleCartLine[],
  payments: PaymentEntry[],
  taxEnabled: boolean,
  taxRatePercent: number,
) {
  const subtotal = lines.reduce((s, l) => {
    if (l.lineType === 'ROLL') return s + getRollLineValues(l).grossSubTotal;
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return s + qty * price;
  }, 0);
  const discountTotal = lines.reduce((s, l) => s + (parseFloat(l.discountAmount) || 0), 0);
  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const taxAmount = taxEnabled ? Math.round(taxableAmount * taxRatePercent) / 100 : 0;
  const grandTotal = taxableAmount + taxAmount;
  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const due = Math.max(0, grandTotal - totalPaid);
  return { subtotal, discountTotal, taxableAmount, taxAmount, grandTotal, totalPaid, due };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function WholesalePOSPage() {
  const { showNotification } = useAppStore();
  const { code: baseCurrencyCode } = useBaseCurrency();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Barcode
  const [barcodeValue, setBarcodeValue] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<POSSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Cart
  const [rollLines, setRollLines] = useState<WholesaleRollCartLine[]>([]);
  const [qtyLines, setQtyLines] = useState<WholesaleQtyCartLine[]>([]);

  // Customer (required for wholesale)
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerOutstanding, setCustomerOutstanding] = useState<CustomerOutstanding | null>(null);

  // Payments
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: 'CASH', amount: '' }]);

  // Notes and delivery challan
  const [notes, setNotes] = useState('');
  const [deliveryChallanNumber, setDeliveryChallanNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  // Invoice modal
  const [invoiceData, setInvoiceData] = useState<ReceiptData | null>(null);
  const [lastChallan, setLastChallan] = useState({ number: '', address: '' });
  const [showInvoice, setShowInvoice] = useState(false);

  // Pickers
  const [rollPicker, setRollPicker] = useState<RollPickerState | null>(null);
  const [stockPicker, setStockPicker] = useState<StockPickerState | null>(null);

  const { data: taxSettings } = useQuery({
    queryKey: ['settings-tax'],
    queryFn: () => settingsApi.getTax(),
    select: (r) => r.data,
    staleTime: 60_000,
  });

  const taxEnabled = taxSettings?.taxEnabled ?? false;
  const taxRatePercent = parseFloat(taxSettings?.taxRatePercent ?? '0') || 0;
  const taxLabel = taxSettings?.taxLabel || 'Tax';

  const { data: customersData } = useQuery({
    queryKey: ['ws-customers-search', customerSearch],
    queryFn: () => customersApi.getAll({ search: customerSearch || undefined, limit: 10 }),
    enabled: customerSearch.length > 0 || showCustomerDropdown,
    select: (r) => r.data,
  });

  const selectedCustomer: Customer | undefined = customersData?.find((c) => c.id === customerId);

  // Load customer outstanding when customer changes
  useEffect(() => {
    if (!customerId) {
      setCustomerOutstanding(null);
      return;
    }
    customersApi.getOutstanding(customerId)
      .then((res) => setCustomerOutstanding(res.data))
      .catch(() => setCustomerOutstanding(null));
  }, [customerId]);

  const refocusBarcode = useCallback(() => {
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // ── Product search ──────────────────────────────────────────────────────────

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
          wholesalePrice: result.wholesalePrice,
        });
      } else {
        setRollPicker({
          productName: result.name,
          productId: result.id,
          productCode: result.productCode,
          wholesalePrice: result.wholesalePrice,
          rolls,
        });
      }
    } else {
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
          wholesalePrice: result.wholesalePrice,
          items,
        });
      }
    }
    refocusBarcode();
  }

  // ── Barcode scan ────────────────────────────────────────────────────────────

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
          wholesalePrice: null,
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
            wholesalePrice: '',
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
              wholesalePrice: p.wholesalePrice,
            });
          } else {
            setRollPicker({
              productName: p.name,
              productId: p.id,
              productCode: p.productCode,
              wholesalePrice: p.wholesalePrice,
              rolls: rolls,
            });
          }
        } else {
          const items = p.stockItems ?? [];
          if (items.length === 0) {
            setScanError(`No stock available for "${p.name}"`);
          } else if (items.length === 1) {
            addStockItemToCart(
              { id: p.id, name: p.name, productCode: p.productCode, productType: p.productType, wholesalePrice: p.wholesalePrice, color: p.color ?? null, design: p.design ?? null },
              items[0],
            );
          } else {
            setStockPicker({
              productName: p.name,
              productId: p.id,
              productCode: p.productCode,
              wholesalePrice: p.wholesalePrice,
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

  // ── Cart helpers ─────────────────────────────────────────────────────────────

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
    wholesalePrice: string | null;
  }) {
    if (rollLines.find((l) => l.rollId === roll.id)) {
      setScanError(`Roll ${roll.rollNumber} is already in the cart.`);
      return;
    }
    const defaultPrice =
      roll.wholesalePrice && parseFloat(roll.wholesalePrice) > 0
        ? roll.wholesalePrice
        : (roll.salePricePerYard ?? '0');
    setRollLines((prev) => [
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
        isFullRoll: false,
        billedQuantity: '',
        actualCutQuantity: '',
        unit: 'YARD',
        unitPrice: defaultPrice,
        discountAmount: '0',
      } satisfies WholesaleRollCartLine,
    ]);
    setScanError(null);
  }

  function addStockItemToCart(
    product: { id: string; name: string; productCode: string; productType: string; wholesalePrice?: string; color?: { name: string } | null; design?: { name: string } | null },
    item: StockItemSummary,
  ) {
    const existing = qtyLines.find((l) => l.productStockItemId === item.id);
    if (existing) {
      setQtyLines((prev) =>
        prev.map((l) =>
          l.productStockItemId === item.id
            ? { ...l, quantity: String((parseFloat(l.quantity) || 0) + 1) }
            : l,
        ),
      );
      return;
    }
    const defaultPrice =
      product.wholesalePrice && parseFloat(product.wholesalePrice) > 0
        ? product.wholesalePrice
        : (item.salePricePerUnit ?? '0');
    setQtyLines((prev) => [
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
        unitPrice: defaultPrice,
        discountAmount: '0',
      } satisfies WholesaleQtyCartLine,
    ]);
    setScanError(null);
  }

  function updateRollLine(id: string, updates: Partial<WholesaleRollCartLine>) {
    setRollLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }

  function updateQtyLine(id: string, updates: Partial<WholesaleQtyCartLine>) {
    setQtyLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }

  function handleUnitChange(lineId: string, line: WholesaleRollCartLine, newUnit: 'YARD' | 'METER') {
    if (newUnit === line.unit || line.isFullRoll) return;
    const price = parseFloat(line.unitPrice) || 0;
    const newPrice =
      newUnit === 'METER' ? (price * YD_TO_M).toFixed(2) : (price / YD_TO_M).toFixed(2);
    updateRollLine(lineId, { unit: newUnit, unitPrice: newPrice });
  }

  function toggleFullRoll(lineId: string, line: WholesaleRollCartLine) {
    updateRollLine(lineId, {
      isFullRoll: !line.isFullRoll,
      billedQuantity: '',
      actualCutQuantity: '',
      unit: 'YARD',
    });
  }

  // ── Payment helpers ───────────────────────────────────────────────────────────

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
    const allLines: WholesaleCartLine[] = [...rollLines, ...qtyLines];
    const { due } = getInvoiceTotals(allLines, payments, taxEnabled, taxRatePercent);
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

  // ── Submit ────────────────────────────────────────────────────────────────────

  const allLines: WholesaleCartLine[] = [...rollLines, ...qtyLines];
  const canSubmit =
    !!customerId &&
    allLines.length > 0 &&
    rollLines.every((l) => {
      if (l.isFullRoll) return parseFloat(l.unitPrice) >= 0;
      return parseFloat(l.billedQuantity) > 0 && parseFloat(l.unitPrice) >= 0;
    }) &&
    qtyLines.every((l) => parseFloat(l.quantity) > 0 && parseFloat(l.unitPrice) >= 0) &&
    !isSubmitting;

  async function handleCompleteSale() {
    if (!canSubmit) return;
    if (!customerId) {
      setSubmitErrors(['Please select a customer before completing the sale.']);
      return;
    }
    setIsSubmitting(true);
    setSubmitErrors([]);

    const idempotencyKey = crypto.randomUUID();

    try {
      const dto: CreateWholesaleSaleInput = {
        customerId: customerId!,
        lines: rollLines.length > 0
          ? rollLines.map((l) => {
              const remaining = parseFloat(l.remainingLengthYard) || 0;
              return {
                productId: l.productId,
                rollId: l.rollId,
                billedQuantity: l.isFullRoll ? remaining : parseFloat(l.billedQuantity),
                actualCutQuantity:
                  !l.isFullRoll && l.actualCutQuantity !== ''
                    ? parseFloat(l.actualCutQuantity)
                    : undefined,
                unit: 'YARD' as const,
                unitPrice: parseFloat(l.unitPrice),
                discountAmount: parseFloat(l.discountAmount) || 0,
                isFullRoll: l.isFullRoll,
              };
            })
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
        deliveryChallanNumber: deliveryChallanNumber || undefined,
        deliveryAddress: deliveryAddress || undefined,
      };

      const res = await salesApi.createWholesaleSale(dto, idempotencyKey);
      const invoice = res.data;

      setLastChallan({ number: deliveryChallanNumber, address: deliveryAddress });

      try {
        const receiptRes = await salesApi.getReceipt(invoice.id);
        setInvoiceData(receiptRes.data);
      } catch {
        setInvoiceData({ invoice, company: { name: 'Textile Shop', address: '', phone: '' } });
      }

      setShowInvoice(true);
      setRollLines([]);
      setQtyLines([]);
      setPayments([{ method: 'CASH', amount: '' }]);
      setNotes('');
      setDeliveryChallanNumber('');
      setDeliveryAddress('');
      showNotification(`Wholesale invoice ${invoice.invoiceNumber} created!`, 'success');
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to complete sale. Please try again.';
      const code = err?.code ?? '';
      setSubmitErrors([code ? `[${code}] ${msg}` : msg]);
    } finally {
      setIsSubmitting(false);
      refocusBarcode();
    }
  }

  const { subtotal, discountTotal, taxableAmount, taxAmount, grandTotal, totalPaid, due } = getInvoiceTotals(
    allLines,
    payments,
    taxEnabled,
    taxRatePercent,
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-full" onClick={() => refocusBarcode()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wholesale POS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bulk sales with customer account — multiple rolls per invoice</p>
        </div>
      </div>

      {/* Required customer selector */}
      <div className="bg-white rounded-xl border-2 border-primary-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-semibold text-primary-900">
            Customer <span className="text-red-500">*</span>
          </span>
          {!customerId && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              Required for wholesale
            </span>
          )}
        </div>

        {selectedCustomer ? (
          <div className="flex items-center justify-between bg-primary-50 rounded-lg px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-gray-900">{selectedCustomer.name}</p>
              <div className="flex gap-3 mt-0.5">
                {selectedCustomer.phone && (
                  <span className="text-xs text-gray-500">{selectedCustomer.phone}</span>
                )}
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded uppercase ${
                  selectedCustomer.type === 'WHOLESALE'
                    ? 'bg-blue-100 text-blue-700'
                    : selectedCustomer.type === 'CREDIT'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedCustomer.type}
                </span>
                {customerOutstanding && (
                  <span className={`text-xs font-medium ${
                    parseFloat(customerOutstanding.currentBalance) > 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    Balance: {formatAmount(customerOutstanding.currentBalance, baseCurrencyCode)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setCustomerId(null); setCustomerSearch(''); }}
              className="text-gray-400 hover:text-red-500 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search customer by name or phone…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {showCustomerDropdown && customersData && customersData.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-52 overflow-y-auto">
                {customersData.map((c) => (
                  <button
                    key={c.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerId(c.id);
                      setCustomerSearch('');
                      setShowCustomerDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded uppercase ${
                      c.type === 'WHOLESALE' ? 'bg-blue-100 text-blue-700'
                      : c.type === 'CREDIT' ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showCustomerDropdown && customerSearch.length > 0 && customersData?.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-30 px-4 py-3 text-sm text-gray-400">
                No customers found for "{customerSearch}"
              </div>
            )}
          </div>
        )}

        {/* Credit limit display */}
        {customerOutstanding?.creditLimit && (
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            <span>Limit: <strong>{formatAmount(customerOutstanding.creditLimit, baseCurrencyCode)}</strong></span>
            {customerOutstanding.availableCredit && (
              <span>Available: <strong className={parseFloat(customerOutstanding.availableCredit) < 0 ? 'text-red-600' : 'text-green-700'}>
                {formatAmount(customerOutstanding.availableCredit, baseCurrencyCode)}
              </strong></span>
            )}
            <span>Unpaid invoices: <strong>{customerOutstanding.unpaidInvoicesCount}</strong></span>
          </div>
        )}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Scan + Search + Cart */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Input panel */}
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
                    if (e.key === 'Enter') { e.preventDefault(); handleBarcodeSubmit(); }
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
                        onClick={(e) => { e.stopPropagation(); handleSearchResultSelect(result); }}
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
                          {result.wholesalePrice && parseFloat(result.wholesalePrice) > 0 && (
                            <p className="text-xs text-blue-600 mt-0.5">
                              WS: {formatAmount(result.wholesalePrice, baseCurrencyCode)}/{isRoll ? 'yd' : 'pc'}
                            </p>
                          )}
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
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-20 px-4 py-3 text-sm text-gray-400">
                  No products found for "{productSearch}"
                </div>
              )}
            </div>

            {scanError && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {scanError}
                <button onClick={() => setScanError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1">
            {allLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Cart is empty. Scan a barcode or search to add rolls.</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-full">
                {/* Roll lines */}
                {rollLines.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-blue-50 border-b border-blue-100">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">Roll / Product</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">Full</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">Qty</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">Unit</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">Price/u</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">Disc</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">Subtotal</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rollLines.map((line) => {
                        const { subTotal, billed } = getRollLineValues(line);
                        const remaining = parseFloat(line.remainingLengthYard) || 0;
                        return (
                          <tr key={line.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 text-xs">{line.productName}</p>
                              <p className="text-xs text-gray-400 font-mono">{line.rollNumber}</p>
                              {(line.colorName || line.designName) && (
                                <p className="text-xs text-gray-400">
                                  {[line.colorName, line.designName].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              <p className="text-xs text-blue-600 mt-0.5">{remaining.toFixed(2)} yd avail</p>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFullRoll(line.id, line); }}
                                title={line.isFullRoll ? 'Partial sale' : 'Full roll sale'}
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                  line.isFullRoll
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-300 text-gray-300 hover:border-blue-400'
                                }`}
                              >
                                {line.isFullRoll && <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                            <td className="px-2 py-3">
                              {line.isFullRoll ? (
                                <span className="text-sm font-medium text-gray-700 block text-right">
                                  {remaining.toFixed(2)}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.billedQuantity}
                                  onChange={(e) => { e.stopPropagation(); updateRollLine(line.id, { billedQuantity: e.target.value }); }}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="0.00"
                                  className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                                />
                              )}
                            </td>
                            <td className="px-2 py-3 text-center">
                              {line.isFullRoll ? (
                                <span className="text-xs text-gray-500">yd</span>
                              ) : (
                                <select
                                  value={line.unit}
                                  onChange={(e) => { e.stopPropagation(); handleUnitChange(line.id, line, e.target.value as 'YARD' | 'METER'); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                                >
                                  <option value="YARD">yd</option>
                                  <option value="METER">m</option>
                                </select>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => { e.stopPropagation(); updateRollLine(line.id, { unitPrice: e.target.value }); }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.discountAmount}
                                onChange={(e) => { e.stopPropagation(); updateRollLine(line.id, { discountAmount: e.target.value }); }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatAmount(subTotal, baseCurrencyCode)}
                              </span>
                              {line.isFullRoll && (
                                <p className="text-xs text-blue-600">{billed.toFixed(2)} yd total</p>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); setRollLines((prev) => prev.filter((l) => l.id !== line.id)); }}
                                className="text-gray-300 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Quantity lines */}
                {qtyLines.length > 0 && (
                  <table className="w-full text-sm border-t border-amber-100">
                    <thead className="bg-amber-50 border-b border-amber-100">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">Product</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">Qty</th>
                        <th className="text-left px-2 py-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">Unit</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">Price/u</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">Disc</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">Subtotal</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {qtyLines.map((line) => {
                        const subtotal = getQtyLineSubtotal(line);
                        return (
                          <tr key={line.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 text-xs">{line.productName}</p>
                              <p className="text-xs text-gray-400 font-mono">{line.productCode}</p>
                              {(line.colorName || line.designName) && (
                                <p className="text-xs text-gray-400">
                                  {[line.colorName, line.designName].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              <p className="text-xs text-amber-600 mt-0.5">
                                {parseFloat(line.quantityOnHand).toFixed(0)} {line.unitAbbreviation} avail
                              </p>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={(e) => { e.stopPropagation(); const q = parseFloat(line.quantity) || 1; if (q > 1) updateQtyLine(line.id, { quantity: String(q - 1) }); }}
                                  className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={line.quantity}
                                  onChange={(e) => { e.stopPropagation(); updateQtyLine(line.id, { quantity: e.target.value }); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-14 text-center text-sm border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateQtyLine(line.id, { quantity: String((parseFloat(line.quantity) || 0) + 1) }); }}
                                  className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-xs text-gray-500">{line.unitAbbreviation}</td>
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => { e.stopPropagation(); updateQtyLine(line.id, { unitPrice: e.target.value }); }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.discountAmount}
                                onChange={(e) => { e.stopPropagation(); updateQtyLine(line.id, { discountAmount: e.target.value }); }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {formatAmount(subtotal, baseCurrencyCode)}
                            </td>
                            <td className="px-2 py-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); setQtyLines((prev) => prev.filter((l) => l.id !== line.id)); }}
                                className="text-gray-300 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Delivery + Payment + Totals */}
        <div className="w-80 flex flex-col gap-4">
          {/* Delivery challan (placeholder) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Delivery Challan</span>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wide">optional</span>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={deliveryChallanNumber}
                onChange={(e) => setDeliveryChallanNumber(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Challan number"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Delivery address"
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Optional note…"
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Payment</span>
              <button
                onClick={(e) => { e.stopPropagation(); addPayment(); }}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add method
              </button>
            </div>
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    value={p.method}
                    onChange={(e) => updatePayment(i, { method: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={p.amount}
                    onChange={(e) => updatePayment(i, { amount: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0.00"
                    className="w-28 text-right text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                  {payments.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removePayment(i); }}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {due > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); fillRemainingAsCash(); }}
                className="mt-2 w-full text-xs text-primary-600 hover:text-primary-800 border border-primary-200 rounded-lg py-1.5 hover:bg-primary-50"
              >
                Fill {formatAmount(due, baseCurrencyCode)} as Cash
              </button>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="space-y-2">
              {discountTotal > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatAmount(subtotal, baseCurrencyCode)}</span>
                </div>
              )}
              {discountTotal > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Discount</span>
                  <span className="text-orange-600">- {formatAmount(discountTotal, baseCurrencyCode)}</span>
                </div>
              )}
              {taxEnabled && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{taxLabel} ({taxRatePercent}%)</span>
                  <span>{formatAmount(taxAmount, baseCurrencyCode)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Paid now</span>
                <span className="text-green-700">{formatAmount(totalPaid, baseCurrencyCode)}</span>
              </div>
              {due > 0 && (
                <div className="flex justify-between text-sm font-semibold text-amber-700 bg-amber-50 rounded px-2 py-1">
                  <span>Credit balance</span>
                  <span>{formatAmount(due, baseCurrencyCode)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-2">
                <span>Grand Total</span>
                <span>{formatAmount(grandTotal, baseCurrencyCode)}</span>
              </div>
            </div>

            {submitErrors.length > 0 && (
              <div className="mt-3 space-y-1">
                {submitErrors.map((e, i) => (
                  <div key={i} className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {e}
                  </div>
                ))}
              </div>
            )}

            {!customerId && (
              <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Select a customer to enable checkout
              </p>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); handleCompleteSale(); }}
              disabled={!canSubmit}
              className="mt-3 w-full py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? 'Processing…' : 'Complete Wholesale Sale'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Roll picker modal ────────────────────────────────────────────────── */}
      {rollPicker && (
        <Modal
          open={!!rollPicker}
          onClose={() => { setRollPicker(null); refocusBarcode(); }}
          title={`Select roll — ${rollPicker.productName}`}
        >
          <div className="space-y-1 max-h-80 overflow-y-auto">
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
                    wholesalePrice: rollPicker.wholesalePrice,
                  });
                  setRollPicker(null);
                  refocusBarcode();
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 border border-gray-200 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 font-mono">{roll.rollNumber}</p>
                  {roll.location && <p className="text-xs text-gray-400">{roll.location}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">{parseFloat(roll.remainingLengthYard).toFixed(2)} yd</p>
                  {roll.salePricePerYard && (
                    <p className="text-xs text-gray-400">{formatAmount(roll.salePricePerYard, baseCurrencyCode)}/yd</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Stock picker modal ───────────────────────────────────────────────── */}
      {stockPicker && (
        <Modal
          open={!!stockPicker}
          onClose={() => { setStockPicker(null); refocusBarcode(); }}
          title={`Select variant — ${stockPicker.productName}`}
        >
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {stockPicker.items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  addStockItemToCart(
                    {
                      id: stockPicker.productId,
                      name: stockPicker.productName,
                      productCode: stockPicker.productCode,
                      productType: 'FIXED_PRODUCT',
                      wholesalePrice: stockPicker.wholesalePrice,
                      color: item.color ?? null,
                      design: item.design ?? null,
                    },
                    item,
                  );
                  setStockPicker(null);
                  refocusBarcode();
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 border border-gray-200 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {[item.color?.name, item.design?.name].filter(Boolean).join(' · ') || 'Default'}
                  </p>
                  {item.location && <p className="text-xs text-gray-400">{item.location}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">
                    {parseFloat(item.quantityOnHand).toFixed(0)} {item.unit?.abbreviation ?? 'pc'}
                  </p>
                  {item.salePricePerUnit && (
                    <p className="text-xs text-gray-400">{formatAmount(item.salePricePerUnit, baseCurrencyCode)}/pc</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Wholesale invoice modal ──────────────────────────────────────────── */}
      {invoiceData && (
        <Modal
          open={showInvoice}
          onClose={() => { setShowInvoice(false); setInvoiceData(null); }}
          title="Wholesale Invoice"
        >
          <WholesaleInvoiceView
            receiptData={invoiceData}
            challanNumber={lastChallan.number}
            deliveryAddress={lastChallan.address}
            onPrint={() => window.print()}
            onClose={() => { setShowInvoice(false); setInvoiceData(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Wholesale invoice print view ─────────────────────────────────────────────

interface WholesaleInvoiceViewProps {
  receiptData: ReceiptData;
  challanNumber: string;
  deliveryAddress: string;
  onPrint: () => void;
  onClose: () => void;
}

function WholesaleInvoiceView({ receiptData, challanNumber, deliveryAddress, onPrint, onClose }: WholesaleInvoiceViewProps) {
  const { code: baseCurrencyCode } = useBaseCurrency();
  const { invoice, company } = receiptData;
  const invoiceCurrency = (invoice as any).currencyCode ?? baseCurrencyCode;
  const items = invoice.saleInvoiceItems ?? [];
  const pmts = invoice.salePayments ?? [];
  const paid = parseFloat(invoice.paidAmount) || 0;
  const due = parseFloat(invoice.dueAmount) || 0;
  const net = parseFloat(invoice.netAmount) || 0;
  const discount = parseFloat(invoice.discountAmount) || 0;

  return (
    <div className="space-y-4">
      {/* Print area */}
      <div id="wholesale-invoice-print" className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Company */}
        <div className="text-center mb-4 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{company.name}</h2>
          {company.address && <p className="text-xs text-gray-500">{company.address}</p>}
          {company.phone && <p className="text-xs text-gray-500">{company.phone}</p>}
          <span className="inline-block mt-2 text-xs font-bold px-3 py-1 bg-blue-100 text-blue-800 rounded-full uppercase tracking-wide">
            Wholesale Invoice
          </span>
        </div>

        {/* Invoice meta */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">Invoice No.</p>
            <p className="font-bold text-gray-900">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Date</p>
            <p className="font-medium text-gray-700">
              {new Date(invoice.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
          {invoice.customer && (
            <>
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-semibold text-gray-900">{invoice.customer.name}</p>
                {invoice.customer.phone && <p className="text-xs text-gray-500">{invoice.customer.phone}</p>}
              </div>
            </>
          )}
          {invoice.cashier && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Issued by</p>
              <p className="text-gray-700">{invoice.cashier.username}</p>
            </div>
          )}
          {challanNumber && (
            <div>
              <p className="text-xs text-gray-500">Challan No.</p>
              <p className="font-medium text-gray-900">{challanNumber}</p>
            </div>
          )}
          {deliveryAddress && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Delivery Address</p>
              <p className="text-gray-700">{deliveryAddress}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mb-4">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Item</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Qty</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Price</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">
                  <p className="font-medium text-gray-900">{item.product?.name ?? '—'}</p>
                  {item.roll && (
                    <p className="text-xs text-gray-400 font-mono">{item.roll.rollNumber}</p>
                  )}
                  {(item.color || item.design) && (
                    <p className="text-xs text-gray-400">
                      {[item.color?.name, item.design?.name].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {parseFloat(item.billedQuantity).toFixed(2)} {item.unit?.abbreviation ?? 'yd'}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {formatAmount(item.unitPrice, invoiceCurrency)}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">
                  {formatAmount(item.subTotal, invoiceCurrency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="space-y-1.5 text-sm">
          {discount > 0 && (
            <div className="flex justify-between text-gray-500 text-xs">
              <span>Subtotal</span>
              <span>{formatAmount(parseFloat(invoice.totalAmount) || 0, invoiceCurrency)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>−{formatAmount(discount, invoiceCurrency)}</span>
            </div>
          )}
          {invoice.taxEnabled && parseFloat(invoice.taxAmount) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{invoice.taxLabel || 'Tax'} ({parseFloat(invoice.taxRatePercent).toFixed(2)}%)</span>
              <span>{formatAmount(invoice.taxAmount, invoiceCurrency)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-2">
            <span>Grand Total</span>
            <span>{formatAmount(net, invoiceCurrency)}</span>
          </div>
        </div>

        {/* Payments */}
        {pmts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payments Received</p>
            {pmts.map((p) => (
              <div key={p.id} className="flex justify-between text-sm text-gray-700">
                <span>{p.paymentMethod.replace(/_/g, ' ')}</span>
                <span>{formatAmount(p.amount, invoiceCurrency)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-medium text-green-700 mt-1">
              <span>Total Paid</span>
              <span>{formatAmount(paid, invoiceCurrency)}</span>
            </div>
          </div>
        )}

        {/* Due */}
        {due > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-amber-800">Credit Balance</p>
              <p className="text-xs text-amber-600">Added to customer account</p>
            </div>
            <p className="text-lg font-bold text-amber-900">{formatAmount(due, invoiceCurrency)}</p>
          </div>
        )}

        {due <= 0 && (
          <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">Fully Paid</span>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">Note: {invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onPrint}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Printer className="w-4 h-4" />
          Print Invoice
        </button>
        <button
          onClick={onClose}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <Package className="w-4 h-4" />
          New Sale
        </button>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #wholesale-invoice-print { display: block !important; }
        }
      `}</style>
    </div>
  );
}
