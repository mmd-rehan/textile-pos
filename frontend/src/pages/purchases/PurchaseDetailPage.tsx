import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Banknote, Barcode, CreditCard, Package, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchasesApi } from '../../api/purchases';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatAmount, getCurrency, GLOBAL_SALE_CURRENCY } from '../../constants/currencies';
import { useAppStore } from '../../store/useAppStore';
import type { InvoiceStatus, SupplierPayment } from '../../types';

const STATUS_BADGE: Record<InvoiceStatus, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }> = {
  PAID: { label: 'Paid', variant: 'green' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'yellow' },
  UNPAID: { label: 'Unpaid', variant: 'red' },
  DRAFT: { label: 'Draft', variant: 'gray' },
  SENT: { label: 'Received', variant: 'blue' },
  CANCELLED: { label: 'Cancelled', variant: 'red' },
};

const ROLL_STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }> = {
  IN_STOCK: { label: 'In Stock', variant: 'green' },
  ALLOCATED: { label: 'Allocated', variant: 'blue' },
  SOLD: { label: 'Sold', variant: 'gray' },
  WASTED: { label: 'Wasted', variant: 'red' },
  DAMAGED: { label: 'Damaged', variant: 'red' },
};

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'Other'];

function fmtQty(n: string | number) {
  return parseFloat(String(n)).toFixed(2);
}

interface PaymentForm {
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useAppStore();
  const qc = useQueryClient();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: '',
    paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => purchasesApi.getOne(id!),
    enabled: !!id,
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['purchase-payments', id],
    queryFn: () => purchasesApi.getPayments(id!),
    enabled: !!id,
  });

  const payments: SupplierPayment[] = paymentsData?.data ?? [];

  const recordPayment = useMutation({
    mutationFn: () =>
      purchasesApi.createPayment(id!, {
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes || undefined,
      }),
    onSuccess: (res) => {
      showNotification('Payment recorded successfully.', 'success');
      qc.invalidateQueries({ queryKey: ['purchase', id] });
      qc.invalidateQueries({ queryKey: ['purchase-payments', id] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setPaymentModalOpen(false);
      setPaymentForm({ amount: '', paymentMethod: 'Cash', paymentDate: new Date().toISOString().slice(0, 10), notes: '' });
    },
    onError: (err: any) => {
      showNotification(err?.message ?? 'Failed to record payment.', 'error');
    },
  });

  const po = data?.data;

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>;
  }

  if (!po) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Purchase not found.</p>
        <button onClick={() => navigate('/purchases')} className="mt-2 text-sm text-primary-600 hover:underline">
          Back to purchases
        </button>
      </div>
    );
  }

  const status = STATUS_BADGE[po.status] ?? STATUS_BADGE.DRAFT;
  const isForeign = po.purchaseCurrencyCode !== GLOBAL_SALE_CURRENCY;
  const buyCcy = getCurrency(po.purchaseCurrencyCode);
  const baseCcy = getCurrency(GLOBAL_SALE_CURRENCY);
  const rate = parseFloat(po.exchangeRateToBaseCurrency);

  const paid = parseFloat(po.paidAmountOriginalCurrency ?? '0');
  const due = parseFloat(po.dueAmountOriginalCurrency ?? '0');
  const hasDue = due > 0 && po.status !== 'PAID';

  function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(paymentForm.amount);
    if (!amt || amt <= 0) {
      showNotification('Payment amount must be greater than zero.', 'error');
      return;
    }
    if (amt > due) {
      showNotification(`Amount exceeds due amount of ${due.toFixed(2)} ${po!.purchaseCurrencyCode}.`, 'error');
      return;
    }
    recordPayment.mutate();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchases')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{po.poNumber}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
            {isForeign && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {po.purchaseCurrencyCode}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {po.supplier?.name} · {new Date(po.orderDate).toLocaleDateString()}
            {isForeign && (
              <span className="ml-2 text-xs text-gray-400">
                1 {buyCcy.code} = {rate.toFixed(4)} {baseCcy.code}
              </span>
            )}
          </p>
        </div>
        {hasDue && (
          <Button onClick={() => setPaymentModalOpen(true)}>
            <Plus className="w-4 h-4" /> Record Payment
          </Button>
        )}
      </div>

      {/* Payment summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Total ({po.purchaseCurrencyCode})
          </p>
          <p className="text-xl font-bold text-gray-900 mt-1 font-mono">
            {formatAmount(po.totalOriginalCurrency, po.purchaseCurrencyCode)}
          </p>
          {isForeign && (
            <p className="mt-0.5 text-xs text-gray-500 font-mono">
              ≈ {formatAmount(po.totalBaseCurrency, GLOBAL_SALE_CURRENCY)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Paid ({po.purchaseCurrencyCode})
          </p>
          <p className="text-xl font-bold text-green-700 mt-1 font-mono">
            {formatAmount(po.paidAmountOriginalCurrency, po.purchaseCurrencyCode)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Due ({po.purchaseCurrencyCode})
          </p>
          <p className={`text-xl font-bold mt-1 font-mono ${due > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {formatAmount(po.dueAmountOriginalCurrency, po.purchaseCurrencyCode)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rolls Created</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{po.purchaseRolls?.length ?? po._count?.purchaseRolls ?? 0}</p>
        </div>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-800">Payment History</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-right">Amount ({po.purchaseCurrencyCode})</th>
                {isForeign && <th className="px-4 py-3 text-right">Amount ({GLOBAL_SALE_CURRENCY})</th>}
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-700">{p.paymentMethod}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                    {formatAmount(p.amountOriginalCurrency, p.currencyCode)}
                  </td>
                  {isForeign && (
                    <td className="px-4 py-3 text-right font-mono text-gray-400 text-xs">
                      {formatAmount(p.amountBaseCurrency, GLOBAL_SALE_CURRENCY)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rolls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-800">Rolls</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Roll #</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Color / Design</th>
                <th className="px-4 py-3 text-right">Length</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-right">Buy/yd ({po.purchaseCurrencyCode})</th>
                {isForeign && <th className="px-4 py-3 text-right">Buy/yd ({GLOBAL_SALE_CURRENCY})</th>}
                <th className="px-4 py-3 text-right">Sale/yd ({GLOBAL_SALE_CURRENCY})</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Barcode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {po.purchaseRolls?.map((pr) => {
                const roll = pr.roll;
                if (!roll) return null;
                const rs = ROLL_STATUS_BADGE[roll.status] ?? ROLL_STATUS_BADGE.IN_STOCK;
                return (
                  <tr
                    key={pr.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/inventory/rolls/${roll.id}`)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 text-xs">{roll.rollNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{roll.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {roll.color?.name ?? '—'}{roll.design ? ` / ${roll.design.name}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtQty(roll.originalLengthYard)} yd</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtQty(roll.remainingLengthYard)} yd</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">
                      {roll.purchasePricePerYardOriginalCurrency
                        ? formatAmount(roll.purchasePricePerYardOriginalCurrency, po.purchaseCurrencyCode)
                        : '—'}
                    </td>
                    {isForeign && (
                      <td className="px-4 py-3 text-right font-mono text-gray-400 text-xs">
                        {roll.purchasePricePerYardBaseCurrency
                          ? formatAmount(roll.purchasePricePerYardBaseCurrency, GLOBAL_SALE_CURRENCY)
                          : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-mono text-gray-500">
                      {roll.salePricePerYard ? formatAmount(roll.salePricePerYard, GLOBAL_SALE_CURRENCY) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={rs.variant}>{rs.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs font-mono text-gray-500">
                        <Barcode className="w-3 h-3" />
                        {roll.barcode ?? '—'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products summary */}
      {po.purchaseItems && po.purchaseItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Products Summary</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Cost ({po.purchaseCurrencyCode})</th>
                <th className="px-4 py-3 text-right">Subtotal ({po.purchaseCurrencyCode})</th>
                {isForeign && <th className="px-4 py-3 text-right">Subtotal ({GLOBAL_SALE_CURRENCY})</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {po.purchaseItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{item.product?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    {fmtQty(item.orderedQuantity)} {item.unit?.abbreviation ?? 'yd'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">
                    {formatAmount(item.unitCostOriginalCurrency, po.purchaseCurrencyCode)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                    {formatAmount(item.lineTotalOriginalCurrency, po.purchaseCurrencyCode)}
                  </td>
                  {isForeign && (
                    <td className="px-4 py-3 text-right font-mono text-gray-400 text-xs">
                      {formatAmount(item.lineTotalBaseCurrency, GLOBAL_SALE_CURRENCY)}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={isForeign ? 3 : 3} className="px-4 py-3 text-right font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                  {formatAmount(po.totalOriginalCurrency, po.purchaseCurrencyCode)}
                </td>
                {isForeign && (
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-500 text-xs">
                    {formatAmount(po.totalBaseCurrency, GLOBAL_SALE_CURRENCY)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {po.notes && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-2">Notes</h2>
          <p className="text-sm text-gray-600">{po.notes}</p>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Payment"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-semibold">Due: {formatAmount(po.dueAmountOriginalCurrency, po.purchaseCurrencyCode)}</p>
            <p className="text-xs mt-0.5">Supplier: {po.supplier?.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ({po.purchaseCurrencyCode}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={due}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={`0.00 (max ${due.toFixed(2)})`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Optional notes…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordPayment.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Banknote className="w-4 h-4" />
              {recordPayment.isPending ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
