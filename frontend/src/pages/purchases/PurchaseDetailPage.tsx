import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Barcode, Package } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchasesApi } from '../../api/purchases';
import Badge from '../../components/ui/Badge';
import { formatAmount, GLOBAL_SALE_CURRENCY, getCurrency } from '../../constants/currencies';
import type { InvoiceStatus } from '../../types';

const STATUS_BADGE: Record<InvoiceStatus, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }> = {
  PAID: { label: 'Paid', variant: 'green' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'yellow' },
  UNPAID: { label: 'Unpaid', variant: 'red' },
  DRAFT: { label: 'Draft', variant: 'gray' },
  SENT: { label: 'Received', variant: 'blue' },
  CANCELLED: { label: 'Cancelled', variant: 'red' },
};

const ROLL_STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }> = {
  IN_STOCK: { label: 'In Stock', variant: 'green' },
  ALLOCATED: { label: 'Allocated', variant: 'blue' },
  SOLD: { label: 'Sold', variant: 'gray' },
  WASTED: { label: 'Wasted', variant: 'red' },
  DAMAGED: { label: 'Damaged', variant: 'red' },
};

function fmtQty(n: string | number) {
  return parseFloat(String(n)).toFixed(2);
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => purchasesApi.getOne(id!),
    enabled: !!id,
  });

  const po = data?.data;

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>;
  }

  if (!po) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Purchase not found.</p>
        <button onClick={() => navigate('/purchases')} className="mt-2 text-sm text-primary-600 hover:underline">
          Back to purchases
        </button>
      </div>
    );
  }

  const status = STATUS_BADGE[po.status] ?? STATUS_BADGE.DRAFT;
  const isForeign = po.purchaseCurrencyCode !== GLOBAL_SALE_CURRENCY;
  const buyCcy = getCurrency(po.purchaseCurrencyCode);
  const baseCcy = getCurrency(GLOBAL_SALE_CURRENCY);
  const rate = parseFloat(po.exchangeRateToBaseCurrency);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchases')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{po.poNumber}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
            {isForeign && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {po.purchaseCurrencyCode}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {po.supplier?.name} · {new Date(po.orderDate).toLocaleDateString()}
            {isForeign && (
              <span className="ml-2 text-xs text-gray-400">
                1 {buyCcy.code} = {rate.toFixed(4)} {baseCcy.code}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            Total ({po.purchaseCurrencyCode})
            {isForeign && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{po.purchaseCurrencyCode}</span>
            )}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
            {formatAmount(po.totalOriginalCurrency, po.purchaseCurrencyCode)}
          </p>
          {isForeign && (
            <p className="mt-0.5 text-xs text-gray-500 font-mono">
              ≈ {formatAmount(po.totalBaseCurrency, GLOBAL_SALE_CURRENCY)} {baseCcy.code}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rolls Created</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{po.purchaseRolls?.length ?? po._count?.purchaseRolls ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Products</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{po.purchaseItems?.length ?? 0}</p>
        </div>
      </div>

      {/* Rolls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-800">Rolls</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Roll #</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Color / Design</th>
                <th className="px-4 py-3 text-right">Length</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-right">Buy/yd ({po.purchaseCurrencyCode})</th>
                {isForeign && <th className="px-4 py-3 text-right">Buy/yd ({GLOBAL_SALE_CURRENCY})</th>}
                <th className="px-4 py-3 text-right">Sale/yd ({GLOBAL_SALE_CURRENCY})</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Barcode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {po.purchaseRolls?.map((pr) => {
                const roll = pr.roll;
                if (!roll) return null;
                const rs = ROLL_STATUS_BADGE[roll.status] ?? ROLL_STATUS_BADGE.IN_STOCK;
                return (
                  <tr
                    key={pr.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/inventory/rolls/${roll.id}`)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 text-xs">{roll.rollNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{roll.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {roll.color?.name ?? '—'}{roll.design ? ` / ${roll.design.name}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtQty(roll.originalLengthYard)} yd</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtQty(roll.remainingLengthYard)} yd</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">
                      {roll.purchasePricePerYardOriginalCurrency
                        ? formatAmount(roll.purchasePricePerYardOriginalCurrency, po.purchaseCurrencyCode)
                        : '—'}
                    </td>
                    {isForeign && (
                      <td className="px-4 py-3 text-right font-mono text-gray-400 text-xs">
                        {roll.purchasePricePerYardBaseCurrency
                          ? formatAmount(roll.purchasePricePerYardBaseCurrency, GLOBAL_SALE_CURRENCY)
                          : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-mono text-gray-500">
                      {roll.salePricePerYard ? formatAmount(roll.salePricePerYard, GLOBAL_SALE_CURRENCY) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={rs.variant}>{rs.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs font-mono text-gray-500">
                        <Barcode className="w-3 h-3" />
                        {roll.barcode ?? '—'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products summary */}
      {po.purchaseItems && po.purchaseItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Products Summary</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Cost ({po.purchaseCurrencyCode})</th>
                <th className="px-4 py-3 text-right">Subtotal ({po.purchaseCurrencyCode})</th>
                {isForeign && <th className="px-4 py-3 text-right">Subtotal ({GLOBAL_SALE_CURRENCY})</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {po.purchaseItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{item.product?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    {fmtQty(item.orderedQuantity)} {item.unit?.abbreviation ?? 'yd'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">
                    {formatAmount(item.unitCostOriginalCurrency, po.purchaseCurrencyCode)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                    {formatAmount(item.lineTotalOriginalCurrency, po.purchaseCurrencyCode)}
                  </td>
                  {isForeign && (
                    <td className="px-4 py-3 text-right font-mono text-gray-400 text-xs">
                      {formatAmount(item.lineTotalBaseCurrency, GLOBAL_SALE_CURRENCY)}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={isForeign ? 3 : 3} className="px-4 py-3 text-right font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                  {formatAmount(po.totalOriginalCurrency, po.purchaseCurrencyCode)}
                </td>
                {isForeign && (
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-500 text-xs">
                    {formatAmount(po.totalBaseCurrency, GLOBAL_SALE_CURRENCY)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {po.notes && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-2">Notes</h2>
          <p className="text-sm text-gray-600">{po.notes}</p>
        </div>
      )}
    </div>
  );
}
