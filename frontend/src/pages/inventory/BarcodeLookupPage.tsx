import { AlertTriangle, Ban, Barcode, CheckCircle, Package, Search, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../../api/inventory';
import Badge from '../../components/ui/Badge';
import { formatAmount } from '../../constants/currencies';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import type { BarcodeLookupResult, RollStatus } from '../../types';

const STATUS_BADGE: Record<RollStatus, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }> = {
  IN_STOCK: { label: 'In Stock', variant: 'green' },
  ALLOCATED: { label: 'Allocated', variant: 'blue' },
  SOLD: { label: 'Sold', variant: 'gray' },
  WASTED: { label: 'Wasted', variant: 'yellow' },
  DAMAGED: { label: 'Damaged', variant: 'red' },
  FINISHED: { label: 'Finished', variant: 'purple' },
};

export default function BarcodeLookupPage() {
  const { code: baseCurrencyCode } = useBaseCurrency();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState<BarcodeLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doLookup = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await inventoryApi.lookupBarcode(trimmed);
      setResult(res.data);
    } catch (err: any) {
      const code = err?.response?.data?.error?.code ?? err?.response?.data?.code;
      if (code === 'BARCODE_NOT_FOUND') {
        setError('No roll or product found for this barcode.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLookup(barcode);
  };

  const handleClear = () => {
    setBarcode('');
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Barcode Lookup</h1>
        <p className="text-sm text-gray-500 mt-1">Scan or enter a barcode to find a roll or product</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              autoFocus
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or type barcode…"
              className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
            {barcode && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!barcode.trim() || loading}
            className="px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Looking up…' : 'Lookup'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Barcode scanners auto-submit — focus this field and scan.
        </p>
      </form>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <Ban className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Not Found</p>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Roll result */}
      {result?.type === 'ROLL' && result.roll && (
        <RollResult result={result} onNavigate={() => navigate(`/inventory/rolls/${result.roll!.id}`)} />
      )}

      {/* Product result */}
      {result?.type === 'PRODUCT' && result.product && (
        <ProductResult result={result} onNavigate={(rollId) => navigate(`/inventory/rolls/${rollId}`)} />
      )}

      {/* Stock item result */}
      {result?.type === 'STOCK_ITEM' && result.stockItem && (
        <StockItemResult result={result} onNavigate={() => navigate(`/catalog/products/${result.stockItem!.productId}`)} />
      )}
    </div>
  );
}

function RollResult({
  result,
  onNavigate,
}: {
  result: BarcodeLookupResult;
  onNavigate: () => void;
}) {
  const { code: baseCurrencyCode } = useBaseCurrency();
  const roll = result.roll!;
  const status = STATUS_BADGE[roll.status];

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${result.blocked ? 'border-red-300' : result.warning ? 'border-yellow-300' : 'border-gray-200'}`}>
      {/* Status banner */}
      {result.statusMessage && (
        <div className={`px-5 py-3 flex items-center gap-2 text-sm font-medium ${result.blocked ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {result.statusMessage}
        </div>
      )}
      {!result.statusMessage && (
        <div className="px-5 py-3 bg-green-50 flex items-center gap-2 text-sm font-medium text-green-800">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Roll found
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-lg font-bold text-gray-900">{roll.rollNumber}</p>
            <p className="text-sm text-gray-500">{roll.product?.name ?? '—'} ({roll.product?.productCode})</p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Remaining</p>
            <p className="text-base font-bold text-primary-600 mt-0.5 font-mono">
              {parseFloat(roll.remainingLengthYard).toFixed(2)} yd
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Original</p>
            <p className="text-base font-bold text-gray-900 mt-0.5 font-mono">
              {parseFloat(roll.originalLengthYard).toFixed(2)} yd
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale / yd</p>
            <p className="text-base font-bold text-gray-900 mt-0.5 font-mono">
              {roll.salePricePerYard
                ? formatAmount(roll.salePricePerYard, baseCurrencyCode)
                : '—'}
            </p>
          </div>
        </div>

        {/* Details */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {roll.color && (
            <>
              <dt className="text-gray-500">Color</dt>
              <dd className="text-gray-900">{roll.color.name}</dd>
            </>
          )}
          {roll.design && (
            <>
              <dt className="text-gray-500">Design</dt>
              <dd className="text-gray-900">{roll.design.name}</dd>
            </>
          )}
          {roll.batch && (
            <>
              <dt className="text-gray-500">Batch</dt>
              <dd className="text-gray-900 font-mono">{roll.batch.batchNumber}</dd>
            </>
          )}
          {roll.location && (
            <>
              <dt className="text-gray-500">Location</dt>
              <dd className="text-gray-900">{roll.location}</dd>
            </>
          )}
        </dl>

        <button
          onClick={onNavigate}
          className="w-full py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
        >
          View Roll Details →
        </button>
      </div>
    </div>
  );
}

function ProductResult({
  result,
  onNavigate,
}: {
  result: BarcodeLookupResult;
  onNavigate: (rollId: string) => void;
}) {
  const { code: baseCurrencyCode } = useBaseCurrency();
  const product = result.product!;
  const isRoll = product.productType === 'FABRIC_ROLL';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-blue-50 flex items-center gap-2 text-sm font-medium text-blue-800">
        <Package className="w-4 h-4 shrink-0" />
        Product barcode — {isRoll ? 'showing available rolls' : 'showing stock items'}
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-lg font-bold text-gray-900">{product.name}</p>
          <p className="text-sm text-gray-500 font-mono">{product.productCode} · {product.productType}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Retail Price</p>
            <p className="text-base font-bold text-gray-900 mt-0.5 font-mono">
              {formatAmount(product.retailPrice, baseCurrencyCode)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wholesale Price</p>
            <p className="text-base font-bold text-gray-900 mt-0.5 font-mono">
              {formatAmount(product.wholesalePrice, baseCurrencyCode)}
            </p>
          </div>
        </div>

        {isRoll ? (
          (product.availableRolls ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 italic">No rolls currently in stock.</p>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Available Rolls ({product.availableRolls!.length})
              </p>
              <div className="space-y-2">
                {product.availableRolls!.map((roll) => {
                  const s = STATUS_BADGE[roll.status];
                  return (
                    <button
                      key={roll.id}
                      onClick={() => onNavigate(roll.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={s.variant}>{s.label}</Badge>
                        <span className="font-mono font-medium text-gray-900">{roll.rollNumber}</span>
                        {roll.location && <span className="text-gray-400 text-xs">{roll.location}</span>}
                      </div>
                      <span className="font-mono text-gray-700">
                        {parseFloat(roll.remainingLengthYard).toFixed(2)} yd
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          (product.stockItems ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 italic">No stock items available.</p>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Stock Items ({product.stockItems!.length})
              </p>
              <div className="space-y-2">
                {product.stockItems!.map((item) => {
                  const qty = parseFloat(item.quantityOnHand);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div>
                        {item.color ? (
                          <p className="font-medium text-gray-900">{item.color.name}{item.design ? ` · ${item.design.name}` : ''}</p>
                        ) : (
                          <p className="text-gray-400 italic">Default</p>
                        )}
                        {item.barcodeValue && <p className="text-xs font-mono text-gray-400">{item.barcodeValue}</p>}
                        {item.location && <p className="text-xs text-gray-400">{item.location}</p>}
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-semibold ${qty > 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {qty.toFixed(0)} {item.unit?.abbreviation ?? 'pc'}
                        </p>
                        {item.salePricePerUnit && (
                          <p className="text-xs text-gray-500">{formatAmount(item.salePricePerUnit, baseCurrencyCode)}/pc</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function StockItemResult({
  result,
  onNavigate,
}: {
  result: BarcodeLookupResult;
  onNavigate: () => void;
}) {
  const { code: baseCurrencyCode } = useBaseCurrency();
  const si = result.stockItem!;
  const qty = parseFloat(si.quantityOnHand);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-amber-50 flex items-center gap-2 text-sm font-medium text-amber-800">
        <Package className="w-4 h-4 shrink-0" />
        Stock item barcode
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-lg font-bold text-gray-900">{si.product.name}</p>
          <p className="text-sm text-gray-500 font-mono">{si.product.productCode} · {si.product.productType}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">On Hand</p>
            <p className={`text-base font-bold mt-0.5 font-mono ${qty > 0 ? 'text-green-700' : 'text-red-600'}`}>
              {qty.toFixed(0)} {si.unit?.abbreviation ?? 'pc'}
            </p>
          </div>
          {si.salePricePerUnit && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale Price</p>
              <p className="text-base font-bold text-gray-900 mt-0.5 font-mono">
                {formatAmount(si.salePricePerUnit, baseCurrencyCode)}
              </p>
            </div>
          )}
          {si.location && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{si.location}</p>
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {si.color && (
            <>
              <dt className="text-gray-500">Color</dt>
              <dd className="text-gray-900">{si.color.name}</dd>
            </>
          )}
          {si.design && (
            <>
              <dt className="text-gray-500">Design</dt>
              <dd className="text-gray-900">{si.design.name}</dd>
            </>
          )}
        </dl>
        <button
          onClick={onNavigate}
          className="w-full py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
        >
          View Product →
        </button>
      </div>
    </div>
  );
}
