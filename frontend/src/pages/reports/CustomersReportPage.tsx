import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CreditCard, Download, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../../api/reports';
import Pagination from '../../components/ui/Pagination';
import { formatAmount } from '../../constants/currencies';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';

export default function CustomersReportPage() {
  const { code: baseCurrencyCode } = useBaseCurrency();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-customers-outstanding', search, page],
    queryFn: () => reportsApi.getCustomerOutstanding({ search: search || undefined, page, limit: 20 }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-600" />
            Customer Outstanding
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Customers with unpaid balances</p>
        </div>
        <button className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Export (coming soon)
        </button>
      </div>

      {/* Summary + Search */}
      <div className="flex flex-wrap gap-4 items-center">
        {!isLoading && !isError && data && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-xs text-amber-600 font-medium">Total Outstanding</p>
              <p className="text-xl font-bold text-amber-900">{formatAmount(data.totalOutstanding, baseCurrencyCode)}</p>
            </div>
          </div>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-red-600 px-6 py-8"><AlertTriangle className="w-4 h-4" /> Failed to load data.</div>
        ) : (data?.data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
            <CreditCard className="w-8 h-8 mb-2 opacity-30" />
            {search ? `No customers matching "${search}" with outstanding balance.` : 'All customers are fully paid up.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Customer', 'Type', 'Phone', 'Outstanding Balance', 'Credit Limit', 'Available Credit', 'Invoices'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data.map((c: any) => {
                    const balance = parseFloat(c.currentBalance);
                    const limit = c.creditLimit ? parseFloat(c.creditLimit) : null;
                    const available = limit !== null ? limit - balance : null;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link to={`/customers/${c.id}`} className="font-medium text-primary-600 hover:underline">
                            {c.name}
                          </Link>
                          {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${c.type === 'WHOLESALE' ? 'bg-blue-100 text-blue-700' : c.type === 'CREDIT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-red-600">{formatAmount(c.currentBalance, baseCurrencyCode)}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {limit !== null ? formatAmount(limit, baseCurrencyCode) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {available !== null ? (
                            <span className={`font-medium ${available < 0 ? 'text-red-600' : 'text-green-700'}`}>
                              {formatAmount(available, baseCurrencyCode)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c._count?.saleInvoices ?? 0}</td>
                      </tr>
                    );
                  })}
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
