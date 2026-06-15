import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Printer, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { suppliersApi } from '../../api/suppliers';
import Button from '../../components/ui/Button';
import { formatAmount } from '../../constants/currencies';
import { useAppStore } from '../../store/useAppStore';

interface FilterForm {
  fromDate: string;
  toDate: string;
}

export default function SupplierStatementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useAppStore();
  const [appliedFilters, setAppliedFilters] = useState<FilterForm>({
    fromDate: '',
    toDate: '',
  });
  const [pendingFilters, setPendingFilters] = useState<FilterForm>({
    fromDate: '',
    toDate: '',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['supplier-statement', id, appliedFilters],
    queryFn: () =>
      suppliersApi.getStatement(id!, {
        fromDate: appliedFilters.fromDate || undefined,
        toDate: appliedFilters.toDate || undefined,
      }),
    enabled: !!id,
  });

  const stmt = data?.data;

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setAppliedFilters({ ...pendingFilters });
  }

  function handlePrint() {
    if (!id) return;
    const params = new URLSearchParams();
    if (appliedFilters.fromDate) params.set('fromDate', appliedFilters.fromDate);
    if (appliedFilters.toDate) params.set('toDate', appliedFilters.toDate);
    const qs = params.toString();
    const url = `/purchases/suppliers/${id}/statement/print${qs ? `?${qs}` : ''}`;
    // Open in a new tab so the user can keep filtering in the main view.
    // The print view auto-triggers window.print() once data is loaded.
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleExport() {
    if (!stmt) return;
    showNotification('PDF export not yet available — use Print for now.', 'info');
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 text-sm">Loading statement…</div>;
  }

  if (error || !stmt) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Could not load supplier statement.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-primary-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header — hidden on print */}
      <div className="flex items-center gap-4 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Account Statement</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generated {new Date(stmt.generatedAt).toLocaleString()}
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>

      {/* Filters — hidden on print */}
      <form
        onSubmit={handleApply}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 grid grid-cols-3 gap-4 items-end print:hidden"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From date</label>
          <input
            type="date"
            value={pendingFilters.fromDate}
            onChange={(e) =>
              setPendingFilters((f) => ({ ...f, fromDate: e.target.value }))
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To date</label>
          <input
            type="date"
            value={pendingFilters.toDate}
            onChange={(e) =>
              setPendingFilters((f) => ({ ...f, toDate: e.target.value }))
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">
            <Search className="w-4 h-4" /> Apply
          </Button>
          {(appliedFilters.fromDate || appliedFilters.toDate) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAppliedFilters({ fromDate: '', toDate: '' });
                setPendingFilters({ fromDate: '', toDate: '' });
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Statement header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 print:shadow-none print:border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{stmt.supplier.name}</h2>
            {stmt.supplier.contactName && (
              <p className="text-sm text-gray-500">{stmt.supplier.contactName}</p>
            )}
            {stmt.supplier.phone && (
              <p className="text-xs text-gray-500 mt-0.5">{stmt.supplier.phone}</p>
            )}
            {stmt.supplier.email && (
              <p className="text-xs text-gray-500">{stmt.supplier.email}</p>
            )}
            {stmt.supplier.address && (
              <p className="text-xs text-gray-500 mt-1 max-w-md">{stmt.supplier.address}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Statement period</p>
            <p className="font-mono">
              {stmt.fromDate ? new Date(stmt.fromDate).toLocaleDateString() : 'Beginning'}
              {' → '}
              {stmt.toDate ? new Date(stmt.toDate).toLocaleDateString() : 'Today'}
            </p>
            <p className="mt-2">Base currency</p>
            <p className="font-mono font-semibold text-gray-700">{stmt.baseCurrencyCode}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Opening Balance</p>
            <p className="text-lg font-bold font-mono text-gray-800 mt-1">
              {formatAmount(stmt.openingBalanceBase, stmt.baseCurrencyCode)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Purchases (Credit)</p>
            <p className="text-lg font-bold font-mono text-blue-700 mt-1">
              {formatAmount(stmt.totalCreditBase, stmt.baseCurrencyCode)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Payments (Debit)</p>
            <p className="text-lg font-bold font-mono text-green-700 mt-1">
              {formatAmount(stmt.totalDebitBase, stmt.baseCurrencyCode)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Closing Balance</p>
            <p
              className={`text-lg font-bold font-mono mt-1 ${parseFloat(stmt.closingBalanceBase) > 0 ? 'text-red-700' : 'text-gray-800'}`}
            >
              {formatAmount(stmt.closingBalanceBase, stmt.baseCurrencyCode)}
            </p>
          </div>
        </div>
      </div>

      {/* Entries table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto print:shadow-none">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Reference</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-center">Currency</th>
              <th className="px-4 py-3 text-right">Balance ({stmt.baseCurrencyCode})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="bg-gray-50/60">
              <td className="px-4 py-2 text-xs text-gray-500" colSpan={7}>
                Opening Balance
              </td>
              <td className="px-4 py-2 text-right font-mono font-semibold text-gray-700">
                {formatAmount(stmt.openingBalanceBase, stmt.baseCurrencyCode)}
              </td>
            </tr>
            {stmt.entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                  No entries in the selected period.
                </td>
              </tr>
            ) : (
              stmt.entries.map((e) => {
                const isPurchase = e.referenceType === 'PURCHASE_ORDER';
                const isPayment = e.referenceType === 'SUPPLIER_PAYMENT';
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {new Date(e.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {e.referenceNumber}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${isPurchase
                            ? 'bg-blue-50 text-blue-700'
                            : isPayment
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {isPurchase ? 'Purchase' : isPayment ? 'Payment' : e.referenceType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{e.description}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-700">
                      {parseFloat(e.debitOriginalCurrency) > 0
                        ? formatAmount(e.debitOriginalCurrency, e.currencyCode)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-700">
                      {parseFloat(e.creditOriginalCurrency) > 0
                        ? formatAmount(e.creditOriginalCurrency, e.currencyCode)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-mono text-gray-500">
                      {e.currencyCode}
                      {e.currencyCode !== stmt.baseCurrencyCode && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          @ {parseFloat(e.exchangeRateToBaseCurrency).toFixed(4)}
                        </div>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold ${parseFloat(e.balanceAfterBase) > 0 ? 'text-red-700' : 'text-gray-700'}`}
                    >
                      {formatAmount(e.balanceAfterBase, stmt.baseCurrencyCode)}
                    </td>
                  </tr>
                );
              })
            )}
            <tr className="bg-gray-100 border-t-2 border-gray-300">
              <td className="px-4 py-3 font-semibold text-gray-800" colSpan={4}>
                Closing Balance
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-green-700">
                {formatAmount(stmt.totalDebitBase, stmt.baseCurrencyCode)}
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-blue-700">
                {formatAmount(stmt.totalCreditBase, stmt.baseCurrencyCode)}
              </td>
              <td className="px-4 py-3 text-center text-xs font-mono text-gray-500">
                {stmt.baseCurrencyCode}
              </td>
              <td
                className={`px-4 py-3 text-right font-mono font-bold ${parseFloat(stmt.closingBalanceBase) > 0 ? 'text-red-700' : 'text-gray-800'}`}
              >
                {formatAmount(stmt.closingBalanceBase, stmt.baseCurrencyCode)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
