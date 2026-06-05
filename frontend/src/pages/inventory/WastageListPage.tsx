import { useQuery } from '@tanstack/react-query';
import { BarChart2, Users } from 'lucide-react';
import { useState } from 'react';
import { wastageApi } from '../../api/wastage';
import Pagination from '../../components/ui/Pagination';

type Tab = 'entries' | 'report';

export default function WastageListPage() {
  const [tab, setTab] = useState<Tab>('entries');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['wastage', page, dateFrom, dateTo],
    queryFn: () =>
      wastageApi.getAll({
        page,
        limit: 30,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    enabled: tab === 'entries',
  });

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['wastage-report', dateFrom, dateTo],
    queryFn: () =>
      wastageApi.getUserReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    enabled: tab === 'report',
  });

  const entries = data?.data ?? [];
  const meta = data?.meta;
  const reportRows = reportData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wastage</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track fabric wastage and shrinkage records</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('entries')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'entries'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> All Entries
        </button>
        <button
          onClick={() => setTab('report')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'report'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" /> By User
        </button>
      </div>

      {/* Date filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear
          </button>
        )}
      </div>

      {tab === 'entries' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No wastage entries found.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Roll</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e: any) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-gray-900 font-medium">{e.product?.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{e.product?.productCode}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{e.roll?.rollNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {parseFloat(e.quantity).toFixed(2)} {e.unit?.abbreviation}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{e.reason}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{e.user?.username}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {meta && meta.totalPages > 1 && (
                <div className="px-4 border-t border-gray-200">
                  <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'report' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {reportLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : reportRows.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No wastage data for selected period.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-right">Total Entries</th>
                  <th className="px-4 py-3 text-right">Total Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportRows.map((r: any) => (
                  <tr key={r.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.username}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{r.totalEntries}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                      {parseFloat(r.totalQuantity).toFixed(2)} {r.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
