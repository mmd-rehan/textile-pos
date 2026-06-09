import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, BarChart2 } from 'lucide-react';
import { useState } from 'react';
import { reportsApi } from '../../api/reports';
import Pagination from '../../components/ui/Pagination';
import { formatAmount } from '../../constants/currencies';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';

type ViewMode = 'invoices' | 'monthly' | 'products';

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  UNPAID: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function SalesReportPage() {
  const { code: baseCurrencyCode } = useBaseCurrency();
  const [view, setView] = useState<ViewMode>('invoices');
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [saleType, setSaleType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());

  const invoicesQ = useQuery({
    queryKey: ['report-sales', startDate, endDate, saleType, status, page],
    queryFn: () => reportsApi.getSalesReport({ startDate, endDate, saleType: saleType || undefined, status: status || undefined, page, limit: 20 }),
    enabled: view === 'invoices',
  });

  const monthlyQ = useQuery({
    queryKey: ['report-sales-monthly', year, saleType],
    queryFn: () => reportsApi.getMonthlySales({ year, saleType: saleType || undefined }),
    select: (r) => r.data,
    enabled: view === 'monthly',
  });

  const productsQ = useQuery({
    queryKey: ['report-sales-products', startDate, endDate, saleType, page],
    queryFn: () => reportsApi.getProductSalesSummary({ startDate, endDate, saleType: saleType || undefined, page, limit: 20 }),
    enabled: view === 'products',
  });

  const invoices = invoicesQ.data;
  const monthly = monthlyQ.data;
  const products = productsQ.data;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary-600" />
            Sales Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Retail and wholesale invoice analysis</p>
        </div>
        <button className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Export (coming soon)
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['invoices', 'monthly', 'products'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); setPage(1); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {v === 'products' ? 'By Product' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          {view === 'monthly' ? (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min="2020" max="2099"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 w-28"
              />
            </div>
          ) : (
            <>
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
            </>
          )}
          <select
            value={saleType}
            onChange={(e) => { setSaleType(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">All types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
          </select>
          {view === 'invoices' && (
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">All statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          )}
        </div>
      </div>

      {/* ── Invoice list ─────────────────────────────────────────────────────── */}
      {view === 'invoices' && (
        <>
          {/* Totals summary */}
          {invoices?.totals && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Invoices', value: String(invoices.totals.invoiceCount) },
                { label: 'Grand Total', value: formatAmount(invoices.totals.grandTotal ?? invoices.totals.netAmount, baseCurrencyCode) },
                { label: 'Tax Collected', value: formatAmount(invoices.totals.taxTotal ?? '0', baseCurrencyCode) },
                { label: 'Collected', value: formatAmount(invoices.totals.paidAmount, baseCurrencyCode) },
                { label: 'Outstanding', value: formatAmount(invoices.totals.dueAmount, baseCurrencyCode) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {invoicesQ.isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
            ) : invoicesQ.isError ? (
              <div className="flex items-center gap-2 text-red-600 px-6 py-8"><AlertTriangle className="w-4 h-4" /> Failed to load report.</div>
            ) : (invoices?.data?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No invoices found for the selected filters.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Invoice #', 'Date', 'Customer', 'Type', 'Net', 'Paid', 'Due', 'Status'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoices?.data.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {new Date(inv.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-gray-800">{inv.customer?.name ?? <span className="text-gray-400">Walk-in</span>}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${inv.saleType === 'WHOLESALE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                              {inv.saleType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{formatAmount(inv.netAmount, baseCurrencyCode)}</td>
                          <td className="px-4 py-3 text-right text-green-700">{formatAmount(inv.paidAmount, baseCurrencyCode)}</td>
                          <td className="px-4 py-3 text-right text-amber-700">{parseFloat(inv.dueAmount) > 0 ? formatAmount(inv.dueAmount, baseCurrencyCode) : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {inv.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-100">
                  <Pagination
                    page={page}
                    totalPages={invoices?.meta?.totalPages ?? 1}
                    total={invoices?.meta?.total ?? 0}
                    limit={20}
                    onPageChange={setPage}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Monthly view ─────────────────────────────────────────────────────── */}
      {view === 'monthly' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {monthlyQ.isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
          ) : (monthly?.months?.length ?? 0) === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No data for {year}.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Month', 'Invoices', 'Net Total', 'Collected', 'Outstanding'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthly?.months.map((row) => (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {new Date(row.month + '-01').toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.invoiceCount}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatAmount(row.netAmount, baseCurrencyCode)}</td>
                    <td className="px-4 py-3 text-green-700">{formatAmount(row.paidAmount, baseCurrencyCode)}</td>
                    <td className="px-4 py-3 text-amber-700">
                      {parseFloat(row.dueAmount) > 0 ? formatAmount(row.dueAmount, baseCurrencyCode) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Product sales view ───────────────────────────────────────────────── */}
      {view === 'products' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {productsQ.isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
          ) : (products?.data?.length ?? 0) === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No product sales in this period.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Product', 'Type', 'Lines', 'Total Qty', 'Revenue'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products?.data.map((p: any) => (
                      <tr key={p.productId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.productName}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.productCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${p.productType === 'FABRIC_ROLL' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.productType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{p.lineCount}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {parseFloat(p.totalQty).toFixed(2)} {p.productType === 'FABRIC_ROLL' ? 'yd' : 'pcs'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatAmount(p.totalRevenue, baseCurrencyCode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <Pagination page={page} totalPages={products?.meta?.totalPages ?? 1} total={products?.meta?.total ?? 0} limit={20} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
