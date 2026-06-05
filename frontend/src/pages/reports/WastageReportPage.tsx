import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { reportsApi } from '../../api/reports';
import Pagination from '../../components/ui/Pagination';

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function WastageReportPage() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-wastage', startDate, endDate, page],
    queryFn: () => reportsApi.getWastageReport({ startDate, endDate, page, limit: 20 }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-red-500" />
            Wastage Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Fabric wastage from cutting and reconciliation</p>
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
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && !isError && data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-sm text-gray-500">Total Wastage</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {parseFloat(data.totalQuantityYard).toFixed(2)} yd
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-sm text-gray-500">Entries</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalEntries}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-red-600 px-6 py-8"><AlertTriangle className="w-4 h-4" /> Failed to load wastage data.</div>
        ) : (data?.data?.length ?? 0) === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No wastage entries in this period.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Date', 'Product', 'Roll', 'Quantity', 'Reason', 'By'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data.map((w: any) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(w.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{w.product?.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{w.product?.productCode}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.roll?.rollNumber ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">
                        {parseFloat(w.quantity).toFixed(4)} {w.unit?.abbreviation}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">
                        <p className="truncate" title={w.reason}>{w.reason}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{w.user?.username}</td>
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
