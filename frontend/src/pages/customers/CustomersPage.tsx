import { useQuery } from '@tanstack/react-query';
import { CreditCard, Plus, Search, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { customersApi } from '../../api/customers';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { formatAmount, GLOBAL_SALE_CURRENCY } from '../../constants/currencies';
import type { Customer, CustomerStatus, CustomerType } from '../../types';

const TYPE_LABELS: Record<CustomerType, string> = {
  RETAIL: 'Retail',
  WHOLESALE: 'Wholesale',
  CREDIT: 'Credit',
};

const TYPE_COLORS: Record<CustomerType, string> = {
  RETAIL: 'bg-blue-100 text-blue-700',
  WHOLESALE: 'bg-purple-100 text-purple-700',
  CREDIT: 'bg-amber-100 text-amber-700',
};

const STATUS_COLORS: Record<CustomerStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
};

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { page, search, typeFilter, statusFilter }],
    queryFn: () =>
      customersApi.getAll({
        page,
        limit: 20,
        search: search || undefined,
        type: (typeFilter as CustomerType) || undefined,
        status: (statusFilter as CustomerStatus) || undefined,
      }),
  });

  const customers: Customer[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer accounts and credit</p>
        </div>
        <Link to="/customers/new">
          <Button>
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, phone, email…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="CREDIT">Credit</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No customers found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-right">Credit Limit</th>
                  <th className="px-4 py-3 text-right">Invoices</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => {
                  const balance = parseFloat(c.currentBalance);
                  const limit = c.creditLimit ? parseFloat(c.creditLimit) : null;
                  const overLimit = limit !== null && balance > limit;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type]}`}>
                          {TYPE_LABELS[c.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${balance > 0 ? (overLimit ? 'text-red-600 font-semibold' : 'text-amber-700') : 'text-gray-500'}`}>
                        {formatAmount(c.currentBalance, GLOBAL_SALE_CURRENCY)}
                        {overLimit && <CreditCard className="inline w-3.5 h-3.5 ml-1 text-red-500" />}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">
                        {c.creditLimit ? formatAmount(c.creditLimit, GLOBAL_SALE_CURRENCY) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {c._count?.saleInvoices ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/customers/${c.id}`}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
