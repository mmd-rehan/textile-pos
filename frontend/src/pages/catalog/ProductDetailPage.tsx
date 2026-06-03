import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, Tag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { productsApi } from '../../api/products';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: productData, isLoading: productLoading, error: productError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
    select: (r) => r.data,
  });

  const { data: stockItemsData, isLoading: stockItemsLoading } = useQuery({
    queryKey: ['product-stock-items', id],
    queryFn: () => productsApi.getStockItems(id!),
    enabled: !!id && !!productData && productData.productType !== 'FABRIC_ROLL',
    select: (r) => r.data,
  });

  if (productLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (productError || !productData) {
    return (
      <div className="text-center py-20 text-red-500">
        Product not found or failed to load.
        <div className="mt-4">
          <Link to="/catalog/products" className="text-primary-600 hover:underline text-sm">
            ← Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const product = productData;
  const isRoll = product.productType === 'FABRIC_ROLL';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/catalog/products"
          className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wide ${isRoll ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              {product.productType === 'FABRIC_ROLL' ? 'Fabric Roll' : product.productType === 'CUT_PIECE' ? 'Cut Piece' : 'Fixed Product'}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${product.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {product.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{product.productCode}</p>
        </div>
        <Link
          to={`/catalog/products/${product.id}/edit`}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
        >
          Edit
        </Link>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Details
          </h2>
          <dl className="space-y-2 text-sm">
            {product.category && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium text-gray-900">{product.category.name}</dd>
              </div>
            )}
            {product.brand && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Brand</dt>
                <dd className="font-medium text-gray-900">{product.brand.name}</dd>
              </div>
            )}
            {product.defaultUnit && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Default Unit</dt>
                <dd className="font-medium text-gray-900">{product.defaultUnit.name} ({product.defaultUnit.abbreviation})</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Retail Price</dt>
              <dd className="font-mono font-medium text-gray-900">{product.retailPrice}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Wholesale Price</dt>
              <dd className="font-mono font-medium text-gray-900">{product.wholesalePrice}</dd>
            </div>
          </dl>
        </div>

        {product.description && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{product.description}</p>
          </div>
        )}
      </div>

      {/* Inventory section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">
            {isRoll ? 'Roll Inventory' : 'Stock Items'}
          </h2>
        </div>

        {isRoll ? (
          // FABRIC_ROLL: show rolls
          <RollInventory productId={product.id} />
        ) : (
          // FIXED_PRODUCT / CUT_PIECE: show stock items
          stockItemsLoading ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !stockItemsData || stockItemsData.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No stock items. Purchase this product to add stock.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Variant</th>
                    <th className="px-4 py-3 text-left">Barcode</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-right">On Hand</th>
                    <th className="px-4 py-3 text-right">Sale Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockItemsData.map((item) => {
                    const qty = parseFloat(item.quantityOnHand);
                    return (
                      <tr key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
                        <td className="px-4 py-3">
                          {item.color ? (
                            <p className="font-medium text-gray-900">
                              {item.color.name}{item.design ? ` · ${item.design.name}` : ''}
                            </p>
                          ) : (
                            <p className="text-gray-400 italic">Default</p>
                          )}
                          {!item.isActive && <span className="text-xs text-red-500 ml-1">(inactive)</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {item.barcodeValue ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.location ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-semibold ${qty > 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {qty.toFixed(0)}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">{item.unit?.abbreviation ?? 'pc'}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">
                          {item.salePricePerUnit ? item.salePricePerUnit : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function RollInventory({ productId: _productId }: { productId: string }) {
  return (
    <div className="px-4 py-6 text-center text-sm text-gray-400">
      View roll-level stock in the{' '}
      <Link to="/inventory/stock" className="text-primary-600 hover:underline">
        Inventory → Stock Summary
      </Link>{' '}
      page.
    </div>
  );
}
