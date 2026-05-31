import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Barcode, Copy } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { inventoryApi } from '../../api/inventory';
import { rollsApi } from '../../api/rolls';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { formatAmount, GLOBAL_SALE_CURRENCY } from '../../constants/currencies';
import { useAppStore } from '../../store/useAppStore';
import type { RollStatus } from '../../types';

const STATUS_BADGE: Record<RollStatus, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }> = {
  IN_STOCK: { label: 'In Stock', variant: 'green' },
  ALLOCATED: { label: 'Allocated', variant: 'blue' },
  SOLD: { label: 'Sold', variant: 'gray' },
  WASTED: { label: 'Wasted', variant: 'yellow' },
  DAMAGED: { label: 'Damaged', variant: 'red' },
};

function fmt(n: string | number, currency = GLOBAL_SALE_CURRENCY) {
  return formatAmount(n, currency);
}

export default function RollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useAppStore();
  const [movPage, setMovPage] = useState(1);

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

  const roll = data?.data;
  const movements = movData?.data ?? [];
  const movMeta = movData?.meta;

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

  const status = STATUS_BADGE[roll.status];
  const purchaseRef = roll.purchaseRolls?.[0];
  const buyCurrency = purchaseRef?.purchaseOrder.purchaseCurrencyCode ?? GLOBAL_SALE_CURRENCY;
  const isForeignBuy = buyCurrency !== GLOBAL_SALE_CURRENCY;

  return (
    <div className="space-y-6 max-w-4xl">
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
              ≈ {fmt(roll.purchasePricePerYardBaseCurrency, GLOBAL_SALE_CURRENCY)} {GLOBAL_SALE_CURRENCY}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale Price / yd ({GLOBAL_SALE_CURRENCY})</p>
          <p className="text-xl font-bold text-gray-900 mt-1 font-mono">
            {roll.salePricePerYard ? fmt(roll.salePricePerYard, GLOBAL_SALE_CURRENCY) : '—'}
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
                {movements.map((m) => (
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
