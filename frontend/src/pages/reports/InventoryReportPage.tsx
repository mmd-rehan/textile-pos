import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, Package } from 'lucide-react';
import { useState } from 'react';
import { reportsApi } from '../../api/reports';
import Pagination from '../../components/ui/Pagination';
import { formatAmount, GLOBAL_SALE_CURRENCY } from '../../constants/currencies';

type ViewMode = 'stock' | 'lowstock' | 'movements';

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function InventoryReportPage() {
  const [view, setView] = useState<ViewMode>('stock');
  const [productType, setProductType] = useState('');
  const [threshold, setThreshold] = useState(10);
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [movementType, setMovementType] = useState('');
  const [page, setPage] = useState(1);

  const stockQ = useQuery({
    queryKey: ['report-stock', productType, page],
    queryFn: () => reportsApi.getStockReport({ productType: productType || undefined, page, limit: 20 }),
    enabled: view === 'stock',
  });

  const lowStockQ = useQuery({
    queryKey: ['report-low-stock', threshold, page],
    queryFn: () => reportsApi.getLowStockRolls({ threshold, page, limit: 20 }),
    enabled: view === 'lowstock',
  });

  const movementsQ = useQuery({
    queryKey: ['report-movements', startDate, endDate, movementType, page],
    queryFn: () => reportsApi.getRollMovements({ startDate, endDate, movementType: movementType || undefined, page, limit: 20 }),
    enabled: view === 'movements',
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-600" />
            Inventory Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Stock levels, low-stock alerts, and movements</p>
        </div>
        <button className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Export (coming soon)
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['stock', 'lowstock', 'movements'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); setPage(1); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {v === 'lowstock' ? 'Low Stock' : v === 'movements' ? 'Movements' : 'Current Stock'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          {view === 'stock' && (
            <select value={productType} onChange={(e) => { setProductType(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
              <option value="">All product types</option>
              <option value="FABRIC_ROLL">Fabric Roll</option>
              <option value="FIXED_PRODUCT">Fixed Product</option>
              <option value="CUT_PIECE">Cut Piece</option>
            </select>
          )}
          {view === 'lowstock' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Threshold (yd)</label>
              <input type="number" min="1" max="100" value={threshold}
                onChange={(e) => { setThreshold(Number(e.target.value)); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 w-24" />
            </div>
          )}
          {view === 'movements' && (
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
              <select value={movementType} onChange={(e) => { setMovementType(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                <option value="">All types</option>
                <option value="PURCHASE">Purchase</option>
                <option value="SALE">Sale</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="WASTAGE">Wastage</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* ── Current stock ────────────────────────────────────────────────────── */}
      {view === 'stock' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {stockQ.isLoading ? <LoadingRow /> : stockQ.isError ? <ErrorRow /> : (stockQ.data?.data?.length ?? 0) === 0 ? <EmptyRow msg="No products found." /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Product', 'Type', 'Category', 'Rolls In Stock', 'Total Yd', 'Stock Items', 'Total Qty', 'Retail Price'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockQ.data?.data.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.productCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${p.productType === 'FABRIC_ROLL' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.productType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.category?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${p.rollCount === 0 ? 'text-red-500' : 'text-gray-900'}`}>{p.rollCount}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{p.productType === 'FABRIC_ROLL' ? `${parseFloat(p.totalRemainingYard).toFixed(2)} yd` : '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{p.stockItemCount || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{parseFloat(p.totalStockQty) > 0 ? p.totalStockQty : '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{formatAmount(p.retailPrice, GLOBAL_SALE_CURRENCY)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <Pagination page={page} totalPages={stockQ.data?.meta?.totalPages ?? 1} total={stockQ.data?.meta?.total ?? 0} limit={20} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Low stock ───────────────────────────────────────────────────────── */}
      {view === 'lowstock' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {lowStockQ.isLoading ? <LoadingRow /> : lowStockQ.isError ? <ErrorRow /> : (lowStockQ.data?.data?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
              <Package className="w-8 h-8 mb-2 opacity-30" />
              No rolls below {threshold} yd.
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 font-medium">
                  {lowStockQ.data?.meta?.total ?? 0} roll(s) have less than {threshold} yd remaining
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Roll #', 'Product', 'Remaining', 'Original', 'Status', 'Location'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lowStockQ.data?.data.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.rollNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{r.product?.name}</p>
                          <p className="text-xs text-gray-400">{r.product?.productCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-red-600">{parseFloat(r.remainingLengthYard).toFixed(2)} yd</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{parseFloat(r.originalLengthYard).toFixed(2)} yd</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase bg-amber-100 text-amber-700">{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{r.location ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <Pagination page={page} totalPages={lowStockQ.data?.meta?.totalPages ?? 1} total={lowStockQ.data?.meta?.total ?? 0} limit={20} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Movements ────────────────────────────────────────────────────────── */}
      {view === 'movements' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {movementsQ.isLoading ? <LoadingRow /> : movementsQ.isError ? <ErrorRow /> : (movementsQ.data?.data?.length ?? 0) === 0 ? <EmptyRow msg="No movements in this period." /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Date', 'Product', 'Roll', 'Type', 'Dir', 'Qty', 'Before', 'After', 'User'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movementsQ.data?.data.map((m: any) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {new Date(m.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-xs">{m.product?.name}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.roll?.rollNumber ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase bg-gray-100 text-gray-600">{m.movementType}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${m.direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {m.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{parseFloat(m.quantity).toFixed(2)} {m.unit?.abbreviation}</td>
                        <td className="px-4 py-3 text-gray-500">{m.beforeQuantity ? parseFloat(m.beforeQuantity).toFixed(2) : '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{m.afterQuantity ? parseFloat(m.afterQuantity).toFixed(2) : '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{m.user?.username}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <Pagination page={page} totalPages={movementsQ.data?.meta?.totalPages ?? 1} total={movementsQ.data?.meta?.total ?? 0} limit={20} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingRow() {
  return <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>;
}
function ErrorRow() {
  return (
    <div className="flex items-center gap-2 text-red-600 px-6 py-8">
      <AlertTriangle className="w-4 h-4" /> Failed to load data.
    </div>
  );
}
function EmptyRow({ msg }: { msg: string }) {
  return <div className="flex items-center justify-center py-16 text-gray-400 text-sm">{msg}</div>;
}
