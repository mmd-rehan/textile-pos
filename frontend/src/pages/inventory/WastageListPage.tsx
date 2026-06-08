import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BarChart2, BarChart3, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';
import { rollsApi } from '../../api/rolls';
import { type ManualWastagePayload, type WastageSourceType, wastageApi } from '../../api/wastage';
import Pagination from '../../components/ui/Pagination';
import { useAuthStore } from '../../store/useAuthStore';

type Tab = 'all' | 'by-user' | 'manual' | 'reconciliation' | 'summary';

const SOURCE_LABELS: Record<WastageSourceType, string> = {
  SALE_OVERCUT: 'Sale Overcut',
  MANUAL_DAMAGE: 'Manual Damage',
  MANUAL_WASTAGE: 'Manual Wastage',
  RECONCILIATION_LOSS: 'Reconciliation Loss',
};

const SOURCE_COLORS: Record<WastageSourceType, string> = {
  SALE_OVERCUT: 'bg-yellow-100 text-yellow-800',
  MANUAL_DAMAGE: 'bg-red-100 text-red-800',
  MANUAL_WASTAGE: 'bg-orange-100 text-orange-800',
  RECONCILIATION_LOSS: 'bg-purple-100 text-purple-800',
};

function SourceBadge({ sourceType }: { sourceType: WastageSourceType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[sourceType]}`}>
      {SOURCE_LABELS[sourceType]}
    </span>
  );
}

interface ManualWastageModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ManualWastageModal({ onClose, onSuccess }: ManualWastageModalProps) {
  const queryClient = useQueryClient();
  const [rollSearch, setRollSearch] = useState('');
  const [selectedRoll, setSelectedRoll] = useState<any | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('yd');
  const [sourceType, setSourceType] = useState<'MANUAL_DAMAGE' | 'MANUAL_WASTAGE'>('MANUAL_DAMAGE');
  const [reason, setReason] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [error, setError] = useState('');

  const { data: rollResults } = useQuery({
    queryKey: ['rolls-search', rollSearch],
    queryFn: () => rollsApi.getAll({ search: rollSearch, limit: 10, status: 'IN_STOCK' }),
    enabled: rollSearch.length >= 2 && !selectedRoll,
  });

  const mutation = useMutation({
    mutationFn: (payload: ManualWastagePayload) => wastageApi.createManual(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wastage'] });
      queryClient.invalidateQueries({ queryKey: ['wastage-summary'] });
      queryClient.invalidateQueries({ queryKey: ['rolls'] });
      onSuccess();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to record wastage');
    },
  });

  const remaining = selectedRoll ? parseFloat(selectedRoll.remainingLengthYard) : null;
  const enteredQty = parseFloat(quantity) || 0;
  const isNearLimit = remaining !== null && enteredQty > 0 && enteredQty >= remaining * 0.9;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selectedRoll) { setError('Select a roll'); return; }
    if (!quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      setError('Enter a valid quantity greater than zero');
      return;
    }
    if (!reason.trim()) { setError('Reason is required'); return; }

    mutation.mutate({
      rollId: selectedRoll.id,
      quantity,
      unit,
      sourceType,
      reason: reason.trim(),
      responsibleUserId: responsibleUserId || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Record Damage / Wastage</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Roll selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Roll *</label>
            {selectedRoll ? (
              <div className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                <div>
                  <span className="font-medium text-sm text-gray-900">{selectedRoll.rollNumber}</span>
                  <span className="ml-2 text-xs text-gray-500 font-mono">{selectedRoll.barcode}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    Remaining: <strong>{parseFloat(selectedRoll.remainingLengthYard).toFixed(2)} yd</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedRoll(null); setRollSearch(''); }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={rollSearch}
                  onChange={(e) => setRollSearch(e.target.value)}
                  placeholder="Search roll number or barcode…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {rollResults && rollResults.data.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-lg shadow-sm max-h-40 overflow-y-auto">
                    {rollResults.data.map((r: any) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setSelectedRoll(r); setRollSearch(''); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between"
                      >
                        <span className="font-medium">{r.rollNumber}</span>
                        <span className="text-gray-500 text-xs">{parseFloat(r.remainingLengthYard).toFixed(2)} yd remaining</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quantity + unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 0.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="yd">Yard (yd)</option>
                <option value="m">Meter (m)</option>
              </select>
            </div>
          </div>

          {isNearLimit && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Quantity is at or near the roll's remaining length ({remaining?.toFixed(2)} yd).
            </div>
          )}

          {/* Source type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Type *</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="MANUAL_DAMAGE">Manual Damage (fabric torn, dirty, contaminated)</option>
              <option value="MANUAL_WASTAGE">Manual Wastage (misplaced, general loss)</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Describe what happened to this fabric…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Responsible user (optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Responsible User ID (optional)</label>
            <input
              type="text"
              value={responsibleUserId}
              onChange={(e) => setResponsibleUserId(e.target.value)}
              placeholder="User ID if someone is accountable"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Recording…' : 'Record Wastage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DateFilters({
  dateFrom, dateTo, onFromChange, onToChange, onClear,
}: {
  dateFrom: string; dateTo: string;
  onFromChange: (v: string) => void; onToChange: (v: string) => void; onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-600">From</label>
        <input type="date" value={dateFrom} onChange={(e) => onFromChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-600">To</label>
        <input type="date" value={dateTo} onChange={(e) => onToChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      {(dateFrom || dateTo) && (
        <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear</button>
      )}
    </div>
  );
}

export default function WastageListPage() {
  const { hasPermission } = useAuthStore();
  const canRecordManual = hasPermission('write:inventory');

  const [tab, setTab] = useState<Tab>('all');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState<WastageSourceType | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  function resetPage() { setPage(1); }
  function clearDates() { setDateFrom(''); setDateTo(''); resetPage(); }

  const allQuery = useQuery({
    queryKey: ['wastage', 'all', page, dateFrom, dateTo, sourceFilter],
    queryFn: () =>
      wastageApi.getAll({
        page, limit: 30,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sourceType: (sourceFilter || undefined) as WastageSourceType | undefined,
      }),
    enabled: tab === 'all',
  });

  const manualQuery = useQuery({
    queryKey: ['wastage', 'manual', page, dateFrom, dateTo],
    queryFn: () =>
      wastageApi.getAll({
        page, limit: 30,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sourceType: undefined,
      }),
    select: (res) => ({
      ...res,
      data: res.data.filter((e: any) =>
        e.sourceType === 'MANUAL_DAMAGE' || e.sourceType === 'MANUAL_WASTAGE',
      ),
    }),
    enabled: tab === 'manual',
  });

  const reconciliationQuery = useQuery({
    queryKey: ['wastage', 'reconciliation', page, dateFrom, dateTo],
    queryFn: () =>
      wastageApi.getAll({
        page, limit: 30,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sourceType: 'RECONCILIATION_LOSS',
      }),
    enabled: tab === 'reconciliation',
  });

  const byUserQuery = useQuery({
    queryKey: ['wastage-report', dateFrom, dateTo],
    queryFn: () =>
      wastageApi.getUserReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    enabled: tab === 'by-user',
  });

  const summaryQuery = useQuery({
    queryKey: ['wastage-summary', dateFrom, dateTo],
    queryFn: () =>
      wastageApi.getSummary({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    enabled: tab === 'summary',
  });

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Wastage', icon: <BarChart2 className="w-4 h-4" /> },
    { key: 'manual', label: 'Manual Damage/Wastage', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'reconciliation', label: 'Reconciliation Loss', icon: <RefreshCw className="w-4 h-4" /> },
    { key: 'by-user', label: 'By User', icon: <Users className="w-4 h-4" /> },
    { key: 'summary', label: 'Summary', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  function WastageTable({ entries, meta }: { entries: any[]; meta?: any }) {
    if (entries.length === 0) {
      return (
        <div className="p-12 text-center">
          <BarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No wastage entries found.</p>
        </div>
      );
    }
    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Roll</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">Responsible</th>
                <th className="px-4 py-3 text-left">Recorded By</th>
                <th className="px-4 py-3 text-left">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge sourceType={e.sourceType as WastageSourceType} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 font-medium text-sm">{e.product?.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{e.product?.productCode}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {e.roll?.rollNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900 whitespace-nowrap">
                    {parseFloat(e.quantity).toFixed(2)} {e.unit?.abbreviation}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate" title={e.reason}>
                    {e.reason}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {e.responsibleUser?.username ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{e.user?.username}</td>
                  <td className="px-4 py-3 text-xs">
                    {e.saleInvoice && (
                      <span className="text-blue-600 font-mono">{e.saleInvoice.invoiceNumber}</span>
                    )}
                    {e.rollReconciliation && (
                      <span className="text-purple-600 text-xs">
                        Recon ({e.rollReconciliation.reconciliationResult})
                      </span>
                    )}
                    {!e.saleInvoice && !e.rollReconciliation && '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wastage</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track fabric wastage and shrinkage records</p>
        </div>
        {canRecordManual && (
          <button
            onClick={() => { setSuccessMsg(''); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
          >
            <AlertTriangle className="w-4 h-4" />
            Record Damage / Wastage
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); resetPage(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <DateFilters
          dateFrom={dateFrom} dateTo={dateTo}
          onFromChange={(v) => { setDateFrom(v); resetPage(); }}
          onToChange={(v) => { setDateTo(v); resetPage(); }}
          onClear={clearDates}
        />
        {tab === 'all' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value as any); resetPage(); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All sources</option>
              <option value="SALE_OVERCUT">Sale Overcut</option>
              <option value="MANUAL_DAMAGE">Manual Damage</option>
              <option value="MANUAL_WASTAGE">Manual Wastage</option>
              <option value="RECONCILIATION_LOSS">Reconciliation Loss</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {tab === 'all' && (
          allQuery.isLoading
            ? <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
            : <WastageTable entries={allQuery.data?.data ?? []} meta={allQuery.data?.meta} />
        )}

        {tab === 'manual' && (
          manualQuery.isLoading
            ? <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
            : <WastageTable entries={manualQuery.data?.data ?? []} meta={manualQuery.data?.meta} />
        )}

        {tab === 'reconciliation' && (
          reconciliationQuery.isLoading
            ? <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
            : <WastageTable entries={reconciliationQuery.data?.data ?? []} meta={reconciliationQuery.data?.meta} />
        )}

        {tab === 'by-user' && (
          byUserQuery.isLoading
            ? <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
            : (byUserQuery.data?.data ?? []).length === 0
              ? (
                <div className="p-12 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No wastage data for selected period.</p>
                </div>
              )
              : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-right">Total Entries</th>
                      <th className="px-4 py-3 text-right">Total Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(byUserQuery.data?.data ?? []).map((r: any) => (
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
              )
        )}

        {tab === 'summary' && (
          summaryQuery.isLoading
            ? <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
            : (() => {
                const s = summaryQuery.data?.data;
                if (!s) return <div className="p-8 text-center text-gray-500 text-sm">No data.</div>;
                return (
                  <div className="p-6 space-y-6">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Wastage', value: `${parseFloat(s.totalWastageYard).toFixed(2)} yd`, color: 'text-gray-900' },
                        { label: 'Sale Overcut', value: `${parseFloat(s.saleOvercutWastageYard).toFixed(2)} yd`, color: 'text-yellow-700' },
                        { label: 'Manual Damage/Wastage', value: `${(parseFloat(s.manualDamageWastageYard) + parseFloat(s.manualWastageYard)).toFixed(2)} yd`, color: 'text-red-700' },
                        { label: 'Reconciliation Loss', value: `${parseFloat(s.reconciliationLossYard).toFixed(2)} yd`, color: 'text-purple-700' },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                          <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Entry count */}
                    <p className="text-sm text-gray-600">
                      Total entries: <strong>{s.entryCount}</strong>
                    </p>

                    {/* Top products */}
                    {s.topProductsByWastage?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Products by Wastage</h3>
                        <table className="w-full text-sm">
                          <thead className="text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">
                            <tr>
                              <th className="py-2 text-left">Product</th>
                              <th className="py-2 text-right">Total Wastage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {s.topProductsByWastage.map((p: any) => (
                              <tr key={p.productId} className="hover:bg-gray-50">
                                <td className="py-2">
                                  <span className="font-medium text-gray-900">{p.name}</span>
                                  <span className="ml-2 text-xs text-gray-400 font-mono">{p.productCode}</span>
                                </td>
                                <td className="py-2 text-right font-mono text-gray-900">
                                  {parseFloat(p.total).toFixed(2)} yd
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()
        )}
      </div>

      {/* Manual wastage modal */}
      {showModal && (
        <ManualWastageModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setSuccessMsg('Wastage recorded successfully.');
          }}
        />
      )}
    </div>
  );
}
