import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  Edit2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../../api/customers';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { formatAmount, GLOBAL_SALE_CURRENCY } from '../../constants/currencies';
import { useAppStore } from '../../store/useAppStore';
import type { CustomerLedgerEntry } from '../../types';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_WALLET', label: 'Mobile Wallet' },
];

interface PaymentForm {
  amount: string;
  paymentMethod: string;
  notes: string;
}

const TYPE_COLORS: Record<string, string> = {
  RETAIL: 'bg-blue-100 text-blue-700',
  WHOLESALE: 'bg-purple-100 text-purple-700',
  CREDIT: 'bg-amber-100 text-amber-700',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const [ledgerPage, setLedgerPage] = useState(1);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id!),
    enabled: !!id,
    select: (r) => r.data,
  });

  const { data: outstandingData } = useQuery({
    queryKey: ['customer-outstanding', id],
    queryFn: () => customersApi.getOutstanding(id!),
    enabled: !!id,
    select: (r) => r.data,
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['customer-ledger', id, ledgerPage],
    queryFn: () => customersApi.getLedger(id!, { page: ledgerPage, limit: 15 }),
    enabled: !!id,
  });

  const ledgerEntries: CustomerLedgerEntry[] = ledgerData?.data ?? [];
  const ledgerMeta = ledgerData?.meta;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentForm>({
    defaultValues: { amount: '', paymentMethod: 'CASH', notes: '' },
  });

  const paymentMutation = useMutation({
    mutationFn: (values: PaymentForm) =>
      customersApi.recordPayment(id!, {
        amount: parseFloat(values.amount),
        paymentMethod: values.paymentMethod,
        notes: values.notes || undefined,
        idempotencyKey: `pay-${id}-${Date.now()}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customer-outstanding', id] });
      qc.invalidateQueries({ queryKey: ['customer-ledger', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      showNotification('Payment recorded successfully.', 'success');
      setPaymentModalOpen(false);
      reset();
    },
    onError: (err: any) => {
      showNotification(err?.message ?? 'Failed to record payment.', 'error');
    },
  });

  if (customerLoading) {
    return <div className="p-8 text-center text-gray-500 text-sm">Loading customer…</div>;
  }

  if (!customerData) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-sm mb-4">Customer not found.</p>
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          Back to Customers
        </Button>
      </div>
    );
  }

  const c = customerData;
  const outstanding = outstandingData;
  const balance = parseFloat(c.currentBalance);
  const creditLimit = c.creditLimit ? parseFloat(c.creditLimit) : null;
  const overLimit = creditLimit !== null && balance > creditLimit;
  const creditUsedPct = creditLimit && creditLimit > 0 ? Math.min((balance / creditLimit) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type] ?? 'bg-gray-100 text-gray-700'}`}>
                {c.type}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {c.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              {c.phone && <span>{c.phone}</span>}
              {c.email && <span>{c.email}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setPaymentModalOpen(true)}>
            <CreditCard className="w-4 h-4" /> Receive Payment
          </Button>
          <Link to={`/customers/${id}/edit`}>
            <Button variant="secondary">
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance card */}
        <div className={`rounded-xl border p-5 shadow-sm ${overLimit ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Outstanding Balance
          </p>
          <p className={`text-2xl font-bold font-mono ${balance > 0 ? (overLimit ? 'text-red-600' : 'text-amber-600') : 'text-green-600'}`}>
            {formatAmount(c.currentBalance, GLOBAL_SALE_CURRENCY)}
          </p>
          {overLimit && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Over credit limit
            </div>
          )}
          {balance <= 0 && (
            <p className="text-xs text-green-600 mt-1">No outstanding balance</p>
          )}
        </div>

        {/* Credit limit card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Credit Limit
          </p>
          {creditLimit !== null ? (
            <>
              <p className="text-2xl font-bold font-mono text-gray-900">
                {formatAmount(c.creditLimit!, GLOBAL_SALE_CURRENCY)}
              </p>
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overLimit ? 'bg-red-500' : creditUsedPct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${creditUsedPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {creditUsedPct.toFixed(0)}% used
                  {outstanding?.availableCredit && parseFloat(outstanding.availableCredit) > 0 && (
                    <> — {formatAmount(outstanding.availableCredit, GLOBAL_SALE_CURRENCY)} available</>
                  )}
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm mt-1">No limit set</p>
          )}
        </div>

        {/* Invoices card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Unpaid Invoices
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {outstanding?.unpaidInvoicesCount ?? c._count?.saleInvoices ?? 0}
          </p>
          {outstanding && parseFloat(outstanding.totalOutstandingAmount) > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Total due: {formatAmount(outstanding.totalOutstandingAmount, GLOBAL_SALE_CURRENCY)}
            </p>
          )}
          {c.address && (
            <p className="text-xs text-gray-400 mt-2 truncate">{c.address}</p>
          )}
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Ledger History</h2>
          {ledgerMeta && (
            <span className="text-xs text-gray-400">{ledgerMeta.total} entries</span>
          )}
        </div>

        {ledgerLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading ledger…</div>
        ) : ledgerEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No ledger entries yet</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Reference</th>
                  <th className="px-5 py-3 text-left">Remarks</th>
                  <th className="px-5 py-3 text-right">Debit</th>
                  <th className="px-5 py-3 text-right">Credit</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerEntries.map((entry) => {
                  const debit = parseFloat(entry.debit);
                  const credit = parseFloat(entry.credit);
                  const isDebit = debit > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString('en-PK', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                        <br />
                        <span className="text-gray-400">
                          {new Date(entry.createdAt).toLocaleTimeString('en-PK', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {entry.referenceType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs max-w-[220px] truncate">
                        {entry.remarks ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        {isDebit ? (
                          <span className="flex items-center justify-end gap-1 text-red-600">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {formatAmount(entry.debit, GLOBAL_SALE_CURRENCY)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        {credit > 0 ? (
                          <span className="flex items-center justify-end gap-1 text-green-600">
                            <TrendingDown className="w-3.5 h-3.5" />
                            {formatAmount(entry.credit, GLOBAL_SALE_CURRENCY)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className={`px-5 py-3 text-right font-mono font-medium ${parseFloat(entry.balanceAfter) > 0 ? 'text-amber-700' : 'text-gray-600'}`}>
                        {formatAmount(entry.balanceAfter, GLOBAL_SALE_CURRENCY)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ledgerMeta && ledgerMeta.totalPages > 1 && (
              <div className="px-5 border-t border-gray-200">
                <Pagination
                  page={ledgerPage}
                  totalPages={ledgerMeta.totalPages}
                  total={ledgerMeta.total}
                  limit={ledgerMeta.limit}
                  onPageChange={setLedgerPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Receive Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); reset(); }}
        title="Receive Payment"
      >
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">Customer</p>
          <p className="font-medium text-gray-900">{c.name}</p>
          <p className="text-sm text-amber-700 font-mono mt-1">
            Outstanding: {formatAmount(c.currentBalance, GLOBAL_SALE_CURRENCY)}
          </p>
        </div>

        <form
          onSubmit={handleSubmit((v) => paymentMutation.mutate(v))}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-mono">
                PKR
              </span>
              <input
                {...register('amount', {
                  required: 'Amount is required',
                  validate: (v) => {
                    const n = parseFloat(v);
                    if (isNaN(n) || n <= 0) return 'Amount must be positive';
                    return true;
                  },
                })}
                type="number"
                min="0.01"
                step="0.01"
                className="w-full pl-12 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              {...register('paymentMethod')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              {...register('notes')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Optional note"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => { setPaymentModalOpen(false); reset(); }}
            >
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button type="submit" loading={paymentMutation.isPending}>
              <ArrowUpRight className="w-4 h-4" /> Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
