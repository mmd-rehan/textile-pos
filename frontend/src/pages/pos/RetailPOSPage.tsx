import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Barcode,
  CheckCircle,
  Minus,
  Plus,
  Printer,
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
import type { BarcodeLookupResult, Customer, ReceiptData, SaleInvoice } from '../../types';

const M_TO_YD = 1.093613;
const YD_TO_M = 0.9144;

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_WALLET', label: 'Mobile Wallet' },
];

interface CartLine {
  id: string;
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

interface PaymentEntry {
  method: string;
  amount: string;
}

interface RollPickerState {
  productName: string;
  productId: string;
  rolls: Array<{
    id: string;
    rollNumber: string;
    remainingLengthYard: string;
    salePricePerYard: string | null;
    status: string;
    location: string | null;
  }>;
}

function getLineValues(line: CartLine) {
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

function getInvoiceTotals(lines: CartLine[], payments: PaymentEntry[]) {
  const netAmount = lines.reduce((s, l) => s + getLineValues(l).subTotal, 0);
  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const due = Math.max(0, netAmount - totalPaid);
  return { netAmount, totalPaid, due };
}

export default function RetailPOSPage() {
  const { showNotification } = useAppStore();
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [barcodeValue, setBarcodeValue] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: 'CASH', amount: '' }]);
  const [notes, setNotes] = useState('');

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [rollPicker, setRollPicker] = useState<RollPickerState | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  const [completedSale, setCompletedSale] = useState<SaleInvoice | null>(null);
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
      } else if (result.type === 'PRODUCT' && result.product) {
        const p = result.product;
        if (p.availableRolls.length === 0) {
          setScanError(`No rolls in stock for ${p.name}`);
        } else if (p.availableRolls.length === 1) {
          const roll = p.availableRolls[0];
          addRollToCart({
            id: roll.id,
            rollNumber: roll.rollNumber,
            productId: p.id,
            productName: p.name,
            productCode: p.productCode,
            colorName: null,
            designName: null,
            remainingLengthYard: roll.remainingLengthYard,
            salePricePerYard: roll.salePricePerYard ?? null,
          });
        } else {
          setRollPicker({
            productName: p.name,
            productId: p.id,
            rolls: p.availableRolls.map((r) => ({
              id: r.id,
              rollNumber: r.rollNumber,
              remainingLengthYard: r.remainingLengthYard,
              salePricePerYard: r.salePricePerYard ?? null,
              status: r.status,
              location: r.location ?? null,
            })),
          });
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
    const existing = cartLines.find((l) => l.rollId === roll.id);
    if (existing) {
      setScanError(`Roll ${roll.rollNumber} is already in the cart.`);
      return;
    }
    setCartLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
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
      },
    ]);
    setScanError(null);
  }

  function updateLine(id: string, updates: Partial<CartLine>) {
    setCartLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }

  function removeLine(id: string) {
    setCartLines((prev) => prev.filter((l) => l.id !== id));
  }

  function handleUnitChange(lineId: string, line: CartLine, newUnit: 'YARD' | 'METER') {
    if (newUnit === line.unit) return;
    // Convert unitPrice when switching unit
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
    cartLines.every((l) => parseFloat(l.billedQuantity) > 0 && parseFloat(l.unitPrice) >= 0) &&
    !isSubmitting;

  async function handleCompleteSale() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitErrors([]);

    const idempotencyKey = crypto.randomUUID();

    try {
      const dto = {
        customerId: customerId ?? undefined,
        lines: cartLines.map((l) => ({
          productId: l.productId,
          rollId: l.rollId,
          billedQuantity: parseFloat(l.billedQuantity),
          actualCutQuantity: l.actualCutQuantity !== '' ? parseFloat(l.actualCutQuantity) : undefined,
          unit: l.unit,
          unitPrice: parseFloat(l.unitPrice),
          discountAmount: parseFloat(l.discountAmount) || 0,
        })),
        payments: payments
          .filter((p) => parseFloat(p.amount) > 0)
          .map((p) => ({ method: p.method, amount: parseFloat(p.amount) })),
        notes: notes || undefined,
      };

      const res = await salesApi.createRetailSale(dto, idempotencyKey);
      const invoice = res.data;
      setCompletedSale(invoice);

      // Fetch receipt data (has company info)
      try {
        const receiptRes = await salesApi.getReceipt(invoice.id);
        setReceiptData(receiptRes.data);
      } catch {
        setReceiptData({ invoice, company: { name: 'Textile Shop', address: '', phone: '' } });
      }

      setShowReceipt(true);

      // Reset cart for next sale
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
          <p className="text-sm text-gray-500 mt-0.5">Scan a roll barcode to add to cart</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Barcode className="w-4 h-4" />
          <span>Barcode input active</span>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Cart */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Barcode scanner */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
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
            {scanError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
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
                <p className="text-sm">Cart is empty. Scan a barcode to add items.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Roll / Product</th>
                      <th className="px-4 py-3 text-left">Billed Qty</th>
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
                      const v = getLineValues(line);
                      const hasWastage = v.wastageYard > 0.001;
                      const insufficientLength = v.remainingAfterCut < -0.001;
                      return (
                        <tr key={line.id} className={insufficientLength ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 font-mono text-xs">{line.rollNumber}</p>
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
                              <p className="text-xs text-amber-600 mt-0.5">
                                Wastage: {v.wastageYard.toFixed(4)} yd
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
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
                              type="number"
                              min="0"
                              step="0.01"
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
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(line.id, { unitPrice: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
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
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order summary + Payment */}
        <div className="w-80 flex flex-col gap-4 shrink-0">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Customer (optional)
            </label>
            {customerId && selectedCustomer ? (
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
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      >
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
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
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Payments
              </label>
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
                  type="number"
                  min="0"
                  step="0.01"
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

            {/* Totals */}
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
                <span className="font-mono">
                  {formatAmount(Math.abs(totalPaid - netAmount), GLOBAL_SALE_CURRENCY)}
                </span>
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

          {/* Submit errors */}
          {submitErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              {submitErrors.map((e, i) => (
                <p key={i} className="text-sm text-red-700">{e}</p>
              ))}
            </div>
          )}

          {/* Complete sale button */}
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
                    productCode: '',
                    colorName: null,
                    designName: null,
                    remainingLengthYard: roll.remainingLengthYard,
                    salePricePerYard: roll.salePricePerYard,
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
                    <p className="text-xs text-gray-500">
                      {formatAmount(roll.salePricePerYard, GLOBAL_SALE_CURRENCY)}/yd
                    </p>
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

function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const { invoice, company } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal open onClose={onClose} title="Sale Receipt" size="md">
      {/* Print styles injected inline so only #receipt-content prints */}
      <style>{`
        @media print {
          body > *:not(#print-receipt-root) { display: none !important; }
          #print-receipt-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div id="print-receipt-root">
        <div id="receipt-content" className="space-y-4 text-sm">
          {/* Company header */}
          <div className="text-center border-b border-gray-200 pb-4">
            <h2 className="text-lg font-bold text-gray-900">{company.name}</h2>
            {company.address && <p className="text-gray-500 text-xs">{company.address}</p>}
            {company.phone && <p className="text-gray-500 text-xs">{company.phone}</p>}
          </div>

          {/* Invoice info */}
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

          {/* Line items */}
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
                      <p className="text-gray-400 font-mono">{item.roll?.rollNumber}</p>
                      {item.color && <p className="text-gray-400">{item.color.name}</p>}
                    </td>
                    <td className="text-right py-1.5 font-mono">
                      {parseFloat(item.billedQuantity).toFixed(2)} {item.unit?.abbreviation}
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

          {/* Totals */}
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

          {/* Payments */}
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

      {/* Action buttons (hidden on print) */}
      <div className="flex gap-3 mt-4 print:hidden">
        <button
          onClick={handlePrint}
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
