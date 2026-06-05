import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rollsApi } from '../../api/rolls';
import Badge from '../../components/ui/Badge';
import { useAppStore } from '../../store/useAppStore';

function DiffPreview({ expected, physical }: { expected: number; physical: number | null }) {
  if (physical === null) return null;
  const diff = physical - expected;
  const absDiff = Math.abs(diff);

  if (Math.abs(diff) <= 0.001) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span>Measurements match — no discrepancy.</span>
      </div>
    );
  }

  if (diff < 0) {
    return (
      <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
        <TrendingDown className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>Shrinkage / Loss:</strong> {absDiff.toFixed(2)} yd missing (system says{' '}
          {expected.toFixed(2)} yd, physical shows {physical.toFixed(2)} yd).
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm">
      <TrendingUp className="w-4 h-4 flex-shrink-0" />
      <span>
        <strong>Excess:</strong> {absDiff.toFixed(2)} yd more than system (system says{' '}
        {expected.toFixed(2)} yd, physical shows {physical.toFixed(2)} yd).
      </span>
    </div>
  );
}

export default function ReconcilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showNotification } = useAppStore();

  const [physicalLength, setPhysicalLength] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [createRemnant, setCreateRemnant] = useState(false);
  const [remnantSalePrice, setRemnantSalePrice] = useState('');
  const [remnantBarcode, setRemnantBarcode] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['roll', id],
    queryFn: () => rollsApi.getOne(id!),
    enabled: !!id,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: Parameters<typeof rollsApi.reconcile>[1]) =>
      rollsApi.reconcile(id!, payload),
    onSuccess: (res) => {
      const result = res.data?.reconciliation?.reconciliationResult ?? 'MATCHED';
      showNotification(`Reconciliation recorded: ${result}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['roll', id] });
      queryClient.invalidateQueries({ queryKey: ['roll-reconciliations', id] });
      navigate(`/inventory/rolls/${id}`);
    },
    onError: (err: any) => {
      showNotification(err?.response?.data?.message ?? 'Reconciliation failed', 'error');
    },
  });

  const roll = data?.data;
  const systemRemaining = roll ? parseFloat(roll.remainingLengthYard) : 0;
  const physicalNum = physicalLength ? parseFloat(physicalLength) : null;
  const hasDiff = physicalNum !== null && Math.abs(physicalNum - systemRemaining) > 0.001;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalLength || isNaN(parseFloat(physicalLength))) {
      showNotification('Enter a valid physical length', 'error');
      return;
    }
    if (hasDiff && !reason.trim()) {
      showNotification('Reason is required when there is a discrepancy', 'error');
      return;
    }
    mutate({
      physicalLengthYard: parseFloat(physicalLength).toFixed(4),
      reason: reason.trim() || 'No discrepancy',
      remarks: remarks.trim() || undefined,
      createRemnant,
      remnantSalePrice: createRemnant && remnantSalePrice ? remnantSalePrice : undefined,
      remnantBarcode: createRemnant && remnantBarcode ? remnantBarcode : undefined,
    });
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>;
  if (!roll) return <div className="p-8 text-center text-gray-500 text-sm">Roll not found.</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/inventory/rolls/${id}`)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reconcile Roll</h1>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{roll.rollNumber}</p>
        </div>
      </div>

      {/* Current state */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</p>
          <p className="text-sm text-gray-900 mt-0.5">{roll.product?.name}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p>
          <div className="mt-0.5">
            <Badge variant={roll.status === 'IN_STOCK' ? 'green' : 'yellow'}>{roll.status}</Badge>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">System Remaining</p>
          <p className="text-xl font-bold text-primary-600 font-mono mt-0.5">{systemRemaining.toFixed(2)} yd</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Original Length</p>
          <p className="text-sm text-gray-700 font-mono mt-0.5">{parseFloat(roll.originalLengthYard).toFixed(2)} yd</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Physical length */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Physical Remaining Length (yards) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={physicalLength}
            onChange={(e) => setPhysicalLength(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            placeholder={`System says: ${systemRemaining.toFixed(2)} yd`}
          />
          <p className="mt-1 text-xs text-gray-500">Measure the roll physically and enter the result.</p>
        </div>

        {/* Difference preview */}
        {physicalLength && (
          <DiffPreview expected={systemRemaining} physical={physicalNum} />
        )}

        {/* Reason — always visible but required only on mismatch */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Reason {hasDiff && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder={hasDiff ? 'Explain the discrepancy…' : 'Optional notes about this reconciliation…'}
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remarks (optional)</label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Additional notes…"
          />
        </div>

        {/* Create remnant toggle */}
        {physicalNum !== null && physicalNum > 0 && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createRemnant}
                onChange={(e) => setCreateRemnant(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-primary-600 border-gray-300 rounded"
              />
              <div>
                <p className="text-sm font-semibold text-gray-800">Convert remaining to Remnant</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  The {physicalNum.toFixed(2)} yd left will be moved to remnant inventory and the roll will be marked Finished.
                </p>
              </div>
            </label>

            {createRemnant && (
              <div className="pl-7 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Remnant Sale Price / yd (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={remnantSalePrice}
                    onChange={(e) => setRemnantSalePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    placeholder="e.g. 350.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Remnant Barcode (optional)</label>
                  <input
                    type="text"
                    value={remnantBarcode}
                    onChange={(e) => setRemnantBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    placeholder="Scan or enter barcode"
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Roll status will be changed to <strong>FINISHED</strong> and remaining length set to 0.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {hasDiff && !reason.trim() && (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Reason is required when there is a discrepancy.</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/inventory/rolls/${id}`)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !physicalLength}
            className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save Reconciliation'}
          </button>
        </div>
      </form>
    </div>
  );
}
