import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { reportsApi } from '../../api/reports';
import { suppliersApi } from '../../api/suppliers';
import Pagination from '../../components/ui/Pagination';
import { formatAmount, GLOBAL_SALE_CURRENCY } from '../../constants/currencies';

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  UNPAID: 'bg-red-100 text-red-700',
  DRAFT: 'bg-gray-100 text-gray-500',
};

export default function PurchasesReportPage() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-purchases', startDate, endDate, supplierId, status, page],
    queryFn: () =>
      reportsApi.getPurchaseReport({
        startDate,
        endDate,
        supplierId: supplierId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => suppliersApi.getAll({ limit: 100 }),
    select: (r) => r.data,
    staleTime: 300_000,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            Purchase Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Purchase orders — original currency and base currency totals</p>
        </div>
        <button className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Export (coming soon)
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">From</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">To</label>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
            <option value="">All suppliers</option>
            {suppliersData?.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
            <option value="">All statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Totals */}
      {!isLoading && !isError && data?.totals && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-sm text-gray-500">Purchase Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.totals.orderCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-sm text-gray-500">Total (Base Currency)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatAmount(data.totals.totalBaseCurrency, GLOBAL_SALE_CURRENCY)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-red-600 px-6 py-8"><AlertTriangle className="w-4 h-4" /> Failed to load purchase data.</div>
        ) : (data?.data?.length ?? 0) === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No purchase orders in this period.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['PO #', 'Date', 'Supplier', 'Currency', 'Total (Original)', 'Total (PKR)', 'Paid', 'Due', 'Rolls', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data.map((po: any) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{po.poNumber}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(po.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{po.supplier?.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          {po.purchaseCurrencyCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {po.purchaseCurrencyCode} {parseFloat(po.totalOriginalCurrency).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatAmount(po.totalBaseCurrency, GLOBAL_SALE_CURRENCY)}
                      </td>
                      <td className="px-4 py-3 text-green-700">
                        {po.purchaseCurrencyCode} {parseFloat(po.paidAmountOriginalCurrency).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-amber-700">
                        {parseFloat(po.dueAmountOriginalCurrency) > 0
                          ? `${po.purchaseCurrencyCode} ${parseFloat(po.dueAmountOriginalCurrency).toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{po._count?.purchaseRolls ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <Pagination page={page} totalPages={data?.meta?.totalPages ?? 1} total={data?.meta?.total ?? 0} limit={20} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
