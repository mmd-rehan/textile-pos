import { useQuery } from '@tanstack/react-query';
import { Barcode, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rollsApi } from '../../api/rolls';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { formatAmount } from '../../constants/currencies';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import type { RollStatus } from '../../types';

const STATUS_BADGE: Record<RollStatus, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }> = {
  IN_STOCK: { label: 'In Stock', variant: 'green' },
  ALLOCATED: { label: 'Allocated', variant: 'blue' },
  SOLD: { label: 'Sold', variant: 'gray' },
  WASTED: { label: 'Wasted', variant: 'yellow' },
  DAMAGED: { label: 'Damaged', variant: 'red' },
  FINISHED: { label: 'Finished', variant: 'purple' },
};

const STATUSES: RollStatus[] = ['IN_STOCK', 'ALLOCATED', 'SOLD', 'WASTED', 'DAMAGED', 'FINISHED'];

export default function RollListPage() {
  const navigate = useNavigate();
  const { code: baseCurrencyCode } = useBaseCurrency();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['rolls', { page, search, status: statusFilter }],
    queryFn: () => rollsApi.getAll({ page, limit: 30, search: search || undefined, status: statusFilter || undefined }),
  });

  const rolls = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rolls</h1>
        <p className="text-sm text-gray-500 mt-1">Individual fabric rolls in inventory</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Roll #, barcode, product…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_BADGE[s].label}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : rolls.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No rolls found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Roll #</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Color</th>
                  <th className="px-4 py-3 text-left">Batch</th>
                  <th className="px-4 py-3 text-right">Original</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3 text-right">Sale/yd</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-left">Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rolls.map((roll) => {
                  const s = STATUS_BADGE[roll.status];
                  return (
                    <tr
                      key={roll.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/inventory/rolls/${roll.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{roll.rollNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{roll.product?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{roll.color?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{roll.batch?.batchNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {parseFloat(roll.originalLengthYard).toFixed(2)} yd
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                        {parseFloat(roll.remainingLengthYard).toFixed(2)} yd
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">
                        {roll.salePricePerYard
                          ? formatAmount(roll.salePricePerYard, baseCurrencyCode)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs font-mono text-gray-400">
                          <Barcode className="w-3 h-3" />
                          {roll.barcode ?? '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
    </div>
  );
}
