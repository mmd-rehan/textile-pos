import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { inventoryApi } from '../../api/inventory';
import Pagination from '../../components/ui/Pagination';
import type { MovementDirection, MovementType } from '../../types';

const MOVEMENT_TYPES: MovementType[] = [
  'PURCHASE_IN',
  'SALE_OUT',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'WASTAGE',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'RETURN_IN',
  'RETURN_OUT',
  'OPENING_STOCK',
];

const TYPE_LABELS: Record<MovementType, string> = {
  PURCHASE_IN: 'Purchase In',
  SALE_OUT: 'Sale Out',
  ADJUSTMENT_IN: 'Adjustment In',
  ADJUSTMENT_OUT: 'Adjustment Out',
  WASTAGE: 'Wastage',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  RETURN_IN: 'Return In',
  RETURN_OUT: 'Return Out',
  OPENING_STOCK: 'Opening Stock',
};

export default function MovementsPage() {
  const [page, setPage] = useState(1);
  const [movementType, setMovementType] = useState('');
  const [direction, setDirection] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-movements', { page, movementType, direction, dateFrom, dateTo }],
    queryFn: () =>
      inventoryApi.getMovements({
        page,
        limit: 30,
        movementType: movementType || undefined,
        direction: (direction as MovementDirection) || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const movements = data?.data ?? [];
  const meta = data?.meta;

  const resetFilters = () => {
    setMovementType('');
    setDirection('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = movementType || direction || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Movements</h1>
        <p className="text-sm text-gray-500 mt-1">All stock movement history across rolls and products</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Type</label>
            <select
              value={movementType}
              onChange={(e) => { setMovementType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All types</option>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Direction</label>
            <select
              value={direction}
              onChange={(e) => { setDirection(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Both</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No movements found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Dir</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Roll</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {TYPE_LABELS[m.movementType] ?? m.movementType}
                    </td>
                    <td className="px-4 py-3">
                      {m.direction === 'IN' ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs">
                          <ArrowDown className="w-3 h-3" /> IN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-medium text-xs">
                          <ArrowUp className="w-3 h-3" /> OUT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {m.product ? (
                        <span>
                          <span className="font-medium">{m.product.name}</span>
                          <span className="text-gray-400 ml-1 font-mono">({m.product.productCode})</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {m.roll ? m.roll.rollNumber : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {parseFloat(m.quantity).toFixed(2)} {m.unit?.abbreviation ?? ''}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {m.referenceType}
                      {m.referenceId && <span className="text-gray-400 ml-1 font-mono text-xs">{m.referenceId.slice(0, 8)}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.user?.username ?? '—'}</td>
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

      {meta && (
        <p className="text-xs text-gray-400 text-right">
          {meta.total} total movement{meta.total !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
