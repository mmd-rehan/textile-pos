import { useQuery } from '@tanstack/react-query';
import { Eye, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { purchasesApi } from '../../api/purchases';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { formatAmount, GLOBAL_SALE_CURRENCY } from '../../constants/currencies';
import type { InvoiceStatus } from '../../types';

const STATUS_BADGE: Record<InvoiceStatus, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }> = {
  PAID: { label: 'Paid', variant: 'green' },
  PARTIALLY_PAID: { label: 'Partial', variant: 'yellow' },
  UNPAID: { label: 'Unpaid', variant: 'red' },
  DRAFT: { label: 'Draft', variant: 'gray' },
  SENT: { label: 'Received', variant: 'blue' },
  CANCELLED: { label: 'Cancelled', variant: 'red' },
};

export default function PurchaseListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { page, search }],
    queryFn: () => purchasesApi.getAll({ page, limit: 20, search: search || undefined }),
  });

  const purchases = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">All fabric purchase receipts</p>
        </div>
        <Button onClick={() => navigate('/purchases/new')}>
          <Plus className="w-4 h-4" /> New Purchase
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search PO number, supplier…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm">No purchase orders yet.</p>
            <Link to="/purchases/new" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
              <Plus className="w-4 h-4" /> Create your first purchase
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Rolls</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((po) => {
                  const s = STATUS_BADGE[po.status] ?? STATUS_BADGE.DRAFT;
                  return (
                    <tr key={po.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/purchases/${po.id}`)}>
                      <td className="px-4 py-3 font-medium text-gray-900 font-mono">{po.poNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{po.supplier?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(po.orderDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        <span>{formatAmount(po.totalOriginalCurrency, po.purchaseCurrencyCode)}</span>
                        {po.purchaseCurrencyCode !== GLOBAL_SALE_CURRENCY && (
                          <span className="ml-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{po.purchaseCurrencyCode}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{po._count?.purchaseRolls ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${po.id}`); }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
