import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { batchesApi } from '../../api/batches';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

export default function BatchesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['batches', { page, search }],
    queryFn: () => batchesApi.getAll({ page, limit: 20, search: search || undefined }),
  });

  const batches = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-500 mt-1">Purchase batches for fabric rolls</p>
        </div>
        <Button disabled title="Batch creation will be available in the purchasing module">
          <Plus className="w-4 h-4" /> New Batch
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search batch number…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No batches yet</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Batch Number</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Rolls</th>
                  <th className="px-4 py-3 text-left">Received</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{batch.batchNumber}</td>
                    <td className="px-4 py-3 text-gray-500">{batch.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{batch._count?.rolls ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {batch.receivedAt ? new Date(batch.receivedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{batch.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && meta.totalPages > 1 && (
              <div className="px-4 border-t border-gray-200">
                <Pagination
                  page={page}
                  totalPages={meta.totalPages}
                  total={meta.total}
                  limit={meta.limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
