import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CreditCard,
  Package,
  Scissors,
  ShoppingCart,
  TrendingUp,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../api/reports';
import { formatAmount, GLOBAL_SALE_CURRENCY } from '../constants/currencies';

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
  linkTo,
  loading,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  linkTo?: string;
  loading?: boolean;
}) {
  const body = (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start justify-between group ${linkTo ? 'hover:border-primary-300 cursor-pointer transition-colors' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        {loading ? (
          <div className="mt-2 h-8 w-28 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        )}
        {sub && !loading && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-lg shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
  return linkTo ? <Link to={linkTo}>{body}</Link> : body;
}

export default function Dashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => reportsApi.getDashboard(),
    select: (r) => r.data,
    staleTime: 60_000,
  });

  const s = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live overview of your textile shop</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isError && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Could not load dashboard data. Check backend connectivity.
        </div>
      )}

      {/* Today's metrics */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Today</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Today's Sales"
            value={s ? formatAmount(s.today.netAmount, GLOBAL_SALE_CURRENCY) : '—'}
            sub={`${s?.today.invoiceCount ?? 0} invoice${s?.today.invoiceCount !== 1 ? 's' : ''}`}
            icon={ShoppingCart}
            color="bg-primary-50 text-primary-600"
            linkTo="/reports/sales"
            loading={isLoading}
          />
          <StatCard
            title="Collected Today"
            value={s ? formatAmount(s.today.paidAmount, GLOBAL_SALE_CURRENCY) : '—'}
            sub="cash + non-cash"
            icon={CreditCard}
            color="bg-green-50 text-green-600"
            loading={isLoading}
          />
          <StatCard
            title="Outstanding Credit"
            value={s ? formatAmount(s.totalOutstandingCredit.amount, GLOBAL_SALE_CURRENCY) : '—'}
            sub={`${s?.totalOutstandingCredit.customerCount ?? 0} customer${s?.totalOutstandingCredit.customerCount !== 1 ? 's' : ''}`}
            icon={CreditCard}
            color="bg-amber-50 text-amber-600"
            linkTo="/reports/customers"
            loading={isLoading}
          />
          <StatCard
            title="Wastage This Month"
            value={s ? `${parseFloat(s.wastageThisMonth.quantityYard).toFixed(2)} yd` : '—'}
            sub={`${s?.wastageThisMonth.entryCount ?? 0} entries`}
            icon={Trash2}
            color="bg-red-50 text-red-500"
            linkTo="/reports/wastage"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Inventory health */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Inventory</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            title="Low Stock Rolls"
            value={isLoading ? '—' : String(s?.lowStockRollsCount ?? 0)}
            sub="< 10 yd remaining"
            icon={AlertTriangle}
            color={`${(s?.lowStockRollsCount ?? 0) > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}
            linkTo="/reports/inventory"
            loading={isLoading}
          />
          <StatCard
            title="Remnants Available"
            value={isLoading ? '—' : String(s?.remnantsAvailableCount ?? 0)}
            sub="ready to sell"
            icon={Scissors}
            color="bg-purple-50 text-purple-600"
            linkTo="/inventory/remnants"
            loading={isLoading}
          />
          <StatCard
            title="Reports"
            value="View all →"
            sub="sales · inventory · purchases"
            icon={BarChart2}
            color="bg-blue-50 text-blue-600"
            linkTo="/reports/sales"
          />
        </div>
      </div>

      {/* Fast-moving products + quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fast-moving products */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Top Products This Month</h3>
            <Link to="/reports/sales" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Full report <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : s?.fastMovingProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No sales data for this month yet.</p>
          ) : (
            <div className="space-y-2">
              {s?.fastMovingProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.productCode}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 shrink-0">
                    {formatAmount(p.totalRevenue, GLOBAL_SALE_CURRENCY)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Quick Links</h3>
          <div className="space-y-1">
            {[
              { label: 'New Retail Sale', href: '/pos/retail', icon: ShoppingCart, color: 'text-primary-600' },
              { label: 'New Wholesale Sale', href: '/pos/wholesale', icon: Package, color: 'text-blue-600' },
              { label: 'Sales Report', href: '/reports/sales', icon: BarChart2, color: 'text-green-600' },
              { label: 'Inventory Report', href: '/reports/inventory', icon: Package, color: 'text-amber-600' },
              { label: 'Customer Outstanding', href: '/reports/customers', icon: CreditCard, color: 'text-red-500' },
              { label: 'Purchase Report', href: '/reports/purchases', icon: TrendingUp, color: 'text-purple-600' },
            ].map(({ label, href, icon: Icon, color }) => (
              <Link
                key={href}
                to={href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors group"
              >
                <Icon className={`w-4 h-4 ${color}`} />
                {label}
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
