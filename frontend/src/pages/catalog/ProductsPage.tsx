import { Eye, Pencil, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { useCategories } from '../../hooks/useCategories';
import { useProducts } from '../../hooks/useProducts';
import type { Product, ProductStatus, ProductType } from '../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DISCONTINUED', label: 'Discontinued' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'FABRIC_ROLL', label: 'Fabric Roll' },
  { value: 'CUT_PIECE', label: 'Cut Piece' },
  { value: 'FIXED_PRODUCT', label: 'Fixed Product' },
];

const STATUS_BADGE: Record<ProductStatus, 'green' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  DISCONTINUED: 'red',
};

const TYPE_LABELS: Record<ProductType, string> = {
  FABRIC_ROLL: 'Fabric Roll',
  CUT_PIECE: 'Cut Piece',
  FIXED_PRODUCT: 'Fixed Product',
};

const TYPE_BADGE: Record<ProductType, 'blue' | 'purple' | 'yellow'> = {
  FABRIC_ROLL: 'blue',
  CUT_PIECE: 'purple',
  FIXED_PRODUCT: 'yellow',
};

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: categoriesData } = useCategories();
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...(categoriesData ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  const { data, isLoading } = useProducts({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
    productType: typeFilter || undefined,
    categoryId: categoryFilter || undefined,
  });

  const products: Product[] = data?.data ?? [];
  const meta = data?.meta;

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleFilter(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} product${meta.total !== 1 ? 's' : ''}` : 'Product catalog'}
          </p>
        </div>
        <Link to="/catalog/products/new">
          <Button>
            <Plus className="w-4 h-4" /> New Product
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, code, barcode…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={handleFilter(setStatusFilter)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={handleFilter(setTypeFilter)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={categoryFilter}
            onChange={handleFilter(setCategoryFilter)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No products found</p>
            <Link to="/catalog/products/new" className="text-primary-600 text-sm hover:underline mt-2 inline-block">
              Create your first product
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Retail</th>
                  <th className="px-4 py-3 text-right">Wholesale</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      {product.brand && (
                        <div className="text-xs text-gray-500">{product.brand.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{product.productCode}</td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_BADGE[product.productType]}>
                        {TYPE_LABELS[product.productType]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{product.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {parseFloat(product.retailPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {parseFloat(product.wholesalePrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[product.status]}>
                        {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/catalog/products/${product.id}`}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/catalog/products/${product.id}/edit`}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        )}
      </div>
    </div>
  );
}
