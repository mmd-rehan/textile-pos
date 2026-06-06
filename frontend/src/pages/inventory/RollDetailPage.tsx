import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Barcode, CheckSquare, ClipboardList, Copy } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { inventoryApi } from '../../api/inventory';
import { rollsApi } from '../../api/rolls';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { formatAmount } from '../../constants/currencies';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import { useAppStore } from '../../store/useAppStore';
import type { RollStatus } from '../../types';

const STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }> = {
  IN_STOCK: { label: 'In Stock', variant: 'green' },
  ALLOCATED: { label: 'Allocated', variant: 'blue' },
  SOLD: { label: 'Sold', variant: 'gray' },
  WASTED: { label: 'Wasted', variant: 'yellow' },
  DAMAGED: { label: 'Damaged', variant: 'red' },
  FINISHED: { label: 'Finished', variant: 'purple' },
};

const RECON_BADGE: Record<string, { label: string; variant: 'green' | 'red' | 'yellow' | 'blue' }> = {
  MATCHED: { label: 'Matched', variant: 'green' },
  SHRINKAGE: { label: 'Shrinkage', variant: 'red' },
  EXCESS: { label: 'Excess', variant: 'yellow' },
  REMNANT: { label: 'Remnant Created', variant: 'blue' },
};

function fmt(n: string | number, currency: string) {
  return formatAmount(n, currency);
}

function MarkFinishedModal({ rollId, onClose }: { rollId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showNotification } = useAppStore();
  const [reason, setReason] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => rollsApi.markFinished(rollId, { reason }),
    onSuccess: () => {
      showNotification('Roll marked as finished', 'success');
      queryClient.invalidateQueries({ queryKey: ['roll', rollId] });
      onClose();
    },
    onError: (err: any) => {
      showNotification(err?.response?.data?.message ?? 'Failed to mark roll as finished', 'error');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Mark Roll as Finished</h2>
        <p className="text-sm text-gray-500">
          This will formally close the roll. Any remaining stock will be written off and an audit log will be created.
        </p>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Why is this roll being closed?"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !reason.trim()}
            className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Mark Finished'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RollDetailPage() {
  const { code: baseCurrencyCode } = useBaseCurrency();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useAppStore();
  const [movPage, setMovPage] = useState(1);
  const [reconPage, setReconPage] = useState(1);
  const [showMarkFinished, setShowMarkFinished] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['roll', id],
    queryFn: () => rollsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: movData, isLoading: movLoading } = useQuery({
    queryKey: ['roll-movements', id, movPage],
    queryFn: () => inventoryApi.getRollMovements(id!, { page: movPage, limit: 20 }),
    enabled: !!id,
  });

  const { data: reconData, isLoading: reconLoading } = useQuery({
    queryKey: ['roll-reconciliations', id, reconPage],
    queryFn: () => rollsApi.getReconciliations(id!, { page: reconPage, limit: 10 }),
    enabled: !!id,
  });

  const roll = data?.data;
  const movements = movData?.data ?? [];
  const movMeta = movData?.meta;
  const reconciliations = reconData?.data ?? [];
  const reconMeta = reconData?.meta;

  const copyBarcode = () => {
    if (roll?.barcode) {
      navigator.clipboard.writeText(roll.barcode);
      showNotification('Barcode copied to clipboard.', 'success');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>;

  if (!roll) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Roll not found.</p>
        <button onClick={() => navigate('/inventory/rolls')} className="mt-2 text-sm text-primary-600 hover:underline">
          Back to rolls
        </button>
      </div>
    );
  }

  const status = STATUS_BADGE[roll.status] ?? { label: roll.status, variant: 'gray' as const };
  const purchaseRef = roll.purchaseRolls?.[0];
  const buyCurrency = purchaseRef?.purchaseOrder.purchaseCurrencyCode ?? baseCurrencyCode;
  const isForeignBuy = buyCurrency !== baseCurrencyCode;
  const canReconcile = roll.status !== 'SOLD' && roll.status !== 'FINISHED';
  const canFinish = roll.status !== 'SOLD' && roll.status !== 'FINISHED';

  return (
    <div className="space-y-6 max-w-4xl">
      {showMarkFinished && (
        <MarkFinishedModal rollId={id!} onClose={() => setShowMarkFinished(false)} />
      )}

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/inventory/rolls')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{roll.rollNumber}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{roll.product?.name}</p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canReconcile && (
            <button
              onClick={() => navigate(`/inventory/rolls/${id}/reconcile`)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100"
            >
              <ClipboardList className="w-4 h-4" /> Reconcile
            </button>
          )}
          {canFinish && (
            <button
              onClick={() => setShowMarkFinished(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
            >
              <CheckSquare className="w-4 h-4" /> Mark Finished
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Original Length</p>
          <p className="text-xl font-bold text-gray-900 mt-1 font-mono">{parseFloat(roll.originalLengthYard).toFixed(2)} yd</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Remaining</p>
          <p className="text-xl font-bold text-primary-600 mt-1 font-mono">{parseFloat(roll.remainingLengthYard).toFixed(2)} yd</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Buy Price / yd ({buyCurrency})</p>
          <p className="text-xl font-bold text-gray-900 mt-1 font-mono">
            {roll.purchasePricePerYardOriginalCurrency
              ? fmt(roll.purchasePricePerYardOriginalCurrency, buyCurrency)
              : '—'}
          </p>
          {isForeignBuy && roll.purchasePricePerYardBaseCurrency && (
            <p className="mt-0.5 text-xs text-gray-500 font-mono">
              ≈ {fmt(roll.purchasePricePerYardBaseCurrency, baseCurrencyCode)} {baseCurrencyCode}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale Price / yd ({baseCurrencyCode})</p>
          <p className="text-xl font-bold text-gray-900 mt-1 font-mono">
            {roll.salePricePerYard ? fmt(roll.salePricePerYard, baseCurrencyCode) : '—'}
          </p>
        </div>
      </div>

      {/* Roll info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 grid grid-cols-2 gap-x-8 gap-y-4">
        <div>
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{roll.product?.name} ({roll.product?.productCode})</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Color</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{roll.color?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Design</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{roll.design?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{roll.batch?.batchNumber ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{roll.location ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{new Date(roll.createdAt).toLocaleString()}</dd>
        </div>
        {purchaseRef && (
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Purchase Order</dt>
            <dd className="mt-0.5 text-sm">
              <button
                className="text-primary-600 hover:underline font-mono"
                onClick={() => navigate(`/purchases/${purchaseRef.purchaseOrder.id}`)}
              >
                {purchaseRef.purchaseOrder.poNumber}
              </button>
            </dd>
          </div>
        )}
      </div>

      {/* Barcode */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Barcode className="w-5 h-5" /> Barcode
        </h2>
        {roll.barcode ? (
          <div className="flex items-center gap-4">
            <div className="px-6 py-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="font-mono text-2xl font-bold text-gray-900 tracking-widest">{roll.barcode}</p>
            </div>
            <button
              onClick={copyBarcode}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Copy className="w-4 h-4" /> Copy
            </button>
            <div className="text-sm text-gray-400 italic">Barcode printing coming soon</div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No barcode assigned.</p>
        )}
      </div>

      {/* Reconciliation history */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Reconciliation History
          </h2>
          {reconMeta && <span className="text-xs text-gray-400">{reconMeta.total} records</span>}
        </div>
        {reconLoading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Loading…</div>
        ) : reconciliations.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">No reconciliations recorded</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3 text-right">Diff</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">By</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reconciliations.map((r: any) => {
                  const rb = RECON_BADGE[r.reconciliationResult] ?? { label: r.reconciliationResult, variant: 'gray' as const };
                  const diff = parseFloat(r.discrepancy);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge variant={rb.variant}>{rb.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{parseFloat(r.expectedLength).toFixed(2)} yd</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{parseFloat(r.actualLength).toFixed(2)} yd</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)} yd
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{r.reason}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{r.user?.username}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {reconMeta && reconMeta.totalPages > 1 && (
              <div className="px-4 border-t border-gray-200">
                <Pagination page={reconPage} totalPages={reconMeta.totalPages} total={reconMeta.total} limit={reconMeta.limit} onPageChange={setReconPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Inventory movements */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Inventory Movements</h2>
          {movMeta && <span className="text-xs text-gray-400">{movMeta.total} total</span>}
        </div>
        {movLoading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Loading…</div>
        ) : movements.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">No movements recorded</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{m.movementType}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.direction === 'IN' ? 'green' : 'red'}>
                        {m.direction}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {parseFloat(m.quantity).toFixed(2)} {m.unit?.abbreviation ?? ''}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {m.referenceType}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movMeta && movMeta.totalPages > 1 && (
              <div className="px-4 border-t border-gray-200">
                <Pagination page={movPage} totalPages={movMeta.totalPages} total={movMeta.total} limit={movMeta.limit} onPageChange={setMovPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
