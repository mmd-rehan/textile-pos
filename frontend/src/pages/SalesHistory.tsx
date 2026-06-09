import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  Eye,
  Printer,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesApi } from '../api/sales';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { formatAmount } from '../constants/currencies';
import { useBaseCurrency } from '../hooks/useBaseCurrency';
import type { SaleInvoice, SaleInvoiceItem } from '../types';

interface Filters {
  search: string;
  saleType: string;
  paymentStatus: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = {
  search: '',
  saleType: '',
  paymentStatus: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

// ── Badge helpers ─────────────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: string }) {
  if (status === 'PAID') return <Badge variant="green">Paid</Badge>;
  if (status === 'PARTIALLY_PAID') return <Badge variant="yellow">Partial</Badge>;
  if (status === 'PENDING') return <Badge variant="red">Unpaid</Badge>;
  return <Badge variant="gray">{status}</Badge>;
}

function InvoiceBadge({ status }: { status: string }) {
  if (status === 'PAID') return <Badge variant="green">Paid</Badge>;
  if (status === 'PARTIALLY_PAID') return <Badge variant="yellow">Partial</Badge>;
  if (status === 'UNPAID') return <Badge variant="red">Unpaid</Badge>;
  if (status === 'CANCELLED') return <Badge variant="red">Cancelled</Badge>;
  return <Badge variant="gray">{status}</Badge>;
}

function SaleTypeBadge({ type }: { type: string }) {
  if (type === 'WHOLESALE') return <Badge variant="blue">Wholesale</Badge>;
  return <Badge variant="gray">Retail</Badge>;
}

// ── Sale Detail Modal ─────────────────────────────────────────────────────────

function SaleDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { code: baseCurrencyCode } = useBaseCurrency();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesApi.getOne(id),
    select: (r) => r.data,
  });

  const { data: receiptData } = useQuery({
    queryKey: ['sale-receipt', id],
    queryFn: () => salesApi.getReceipt(id),
    select: (r) => r.data,
    enabled: !!invoice,
  });

  if (isLoading || !invoice) {
    return (
      <Modal open onClose={onClose} title="Sale Details" size="lg">
        <div className="flex items-center justify-center py-12">
          <span className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </Modal>
    );
  }

  const currency = invoice.currencyCode ?? baseCurrencyCode;

  function handlePrint() {
    window.print();
  }

  return (
    <Modal open onClose={onClose} title={`Invoice ${invoice.invoiceNumber}`} size="lg">
      <style>{`
        @media print {
          body > *:not(#print-sale-detail) { display: none !important; }
          #print-sale-detail { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div id="print-sale-detail" className="space-y-5 text-sm">
        {/* Header */}
        {receiptData && (
          <div className="text-center border-b border-gray-200 pb-4 print:block hidden">
            <h2 className="text-lg font-bold">{receiptData.company.name}</h2>
            {receiptData.company.address && <p className="text-xs text-gray-500">{receiptData.company.address}</p>}
            {receiptData.company.phone && <p className="text-xs text-gray-500">{receiptData.company.phone}</p>}
          </div>
        )}

        {/* Invoice meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Invoice Number</p>
            <p className="font-mono font-bold text-gray-900">{invoice.invoiceNumber}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-gray-500">Date</p>
            <p className="text-gray-900">{new Date(invoice.createdAt).toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Customer</p>
            {invoice.customer ? (
              <Link
                to={`/customers/${invoice.customer.id}`}
                className="font-medium text-primary-600 hover:underline print:text-gray-900 print:no-underline"
              >
                {invoice.customer.name}
              </Link>
            ) : (
              <p className="text-gray-500 italic">Walk-in Customer</p>
            )}
            {invoice.customer?.phone && (
              <p className="text-xs text-gray-400">{invoice.customer.phone}</p>
            )}
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-gray-500">Cashier</p>
            <p className="text-gray-900">{invoice.cashier?.username ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Sale Type</p>
            <SaleTypeBadge type={invoice.saleType} />
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-gray-500">Currency</p>
            <p className="font-mono text-gray-900">{currency}</p>
          </div>
        </div>

        {/* Line items */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Billed Qty</th>
                <th className="px-3 py-2 text-right">Actual Cut</th>
                <th className="px-3 py-2 text-right">Wastage</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(invoice.saleInvoiceItems ?? []).map((item: SaleInvoiceItem) => {
                const isRoll = !!item.roll;
                const unit = item.unit?.abbreviation ?? (isRoll ? 'yd' : 'pc');
                const wastage = item.actualCutQuantity && item.roll
                  ? Math.max(0, parseFloat(item.actualCutQuantity) - parseFloat(item.billedQuantity))
                  : null;
                return (
                  <tr key={item.id} className={isRoll ? 'bg-blue-50/30' : ''}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{item.product?.name}</p>
                      {isRoll && item.roll && (
                        <p className="font-mono text-gray-500 text-[11px]">{item.roll.rollNumber}</p>
                      )}
                      {item.color && (
                        <p className="text-gray-400 text-[11px]">
                          {item.color.name}{item.design ? ` · ${item.design.name}` : ''}
                        </p>
                      )}
                      {!isRoll && item.productStockItem?.color && !item.color && (
                        <p className="text-gray-400 text-[11px]">
                          {item.productStockItem.color.name}
                          {item.productStockItem.design ? ` · ${item.productStockItem.design.name}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700">
                      {parseFloat(item.billedQuantity).toFixed(isRoll ? 2 : 0)} {unit}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700">
                      {isRoll && item.actualCutQuantity
                        ? `${parseFloat(item.actualCutQuantity).toFixed(2)} ${unit}`
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {wastage != null && wastage > 0 ? (
                        <span className="text-amber-600">{wastage.toFixed(4)} yd</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700">
                      {formatAmount(item.unitPrice, currency)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium text-gray-900">
                      {formatAmount(item.subTotal, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-1 text-sm">
            {parseFloat(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Subtotal</span>
                <span className="font-mono">{formatAmount(invoice.totalAmount, currency)}</span>
              </div>
            )}
            {parseFloat(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span className="font-mono">- {formatAmount(invoice.discountAmount, currency)}</span>
              </div>
            )}
            {invoice.taxEnabled && (
              <div className="flex justify-between text-gray-600">
                <span>
                  {invoice.taxLabel || 'Tax'}
                  {parseFloat(invoice.taxRatePercent) > 0 && (
                    <span className="text-gray-400 ml-1 text-xs">({parseFloat(invoice.taxRatePercent).toFixed(2)}%)</span>
                  )}
                </span>
                <span className="font-mono">{formatAmount(invoice.taxAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 border-t pt-1">
              <span>Grand Total</span>
              <span className="font-mono">{formatAmount(invoice.netAmount, currency)}</span>
            </div>
            {(invoice.salePayments ?? []).map((p) => (
              <div key={p.id} className="flex justify-between text-gray-600 text-xs">
                <span>{p.paymentMethod.replace(/_/g, ' ')}</span>
                <span className="font-mono text-green-600">{formatAmount(p.amount, currency)}</span>
              </div>
            ))}
            {parseFloat(invoice.dueAmount) > 0 && (
              <div className="flex justify-between font-semibold text-red-600 border-t pt-1">
                <span>Due</span>
                <span className="font-mono">{formatAmount(invoice.dueAmount, currency)}</span>
              </div>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-medium">Notes: </span>{invoice.notes}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-5 print:hidden border-t pt-4">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SalesHistory() {
  const { code: baseCurrencyCode } = useBaseCurrency();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sales', page, applied],
    queryFn: () =>
      salesApi.getAll({
        page,
        limit: 20,
        search: applied.search || undefined,
        saleType: applied.saleType || undefined,
        paymentStatus: applied.paymentStatus || undefined,
        status: applied.status || undefined,
        dateFrom: applied.dateFrom || undefined,
        dateTo: applied.dateTo || undefined,
      }),
  });

  const sales: SaleInvoice[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  function applyFilters() {
    setPage(1);
    setApplied({ ...filters });
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  const hasActiveFilters = Object.values(applied).some(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and audit completed transactions</p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="Search invoice #, customer name or phone…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Sale type */}
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={filters.saleType}
              onChange={(e) => setFilters((p) => ({ ...p, saleType: e.target.value }))}
              className="w-full appearance-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-8"
            >
              <option value="">All Types</option>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
            </select>
          </div>

          {/* Payment status */}
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters((p) => ({ ...p, paymentStatus: e.target.value }))}
              className="w-full appearance-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-8"
            >
              <option value="">All Payment Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partial</option>
              <option value="PENDING">Unpaid</option>
            </select>
          </div>

          {/* Date from */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="From date"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="To date"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={applyFilters}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
          >
            <Search className="w-4 h-4" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <p className="text-sm text-red-600">Failed to load sales history.</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-primary-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
            <p className="text-sm">No sales found{hasActiveFilters ? ' matching the current filters' : ''}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Cashier</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((sale) => {
                  const currency = sale.currencyCode ?? baseCurrencyCode;
                  const isWalkIn = !sale.customer;
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono font-medium text-gray-900 text-xs">{sale.invoiceNumber}</p>
                        <p className="text-[10px] text-gray-400">
                          {(sale._count?.saleInvoiceItems ?? 0)} item(s)
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        <p>{new Date(sale.createdAt).toLocaleDateString()}</p>
                        <p className="text-gray-400">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-4 py-3">
                        {sale.customer ? (
                          <Link
                            to={`/customers/${sale.customer.id}`}
                            className="text-primary-600 hover:underline font-medium"
                          >
                            {sale.customer.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Walk-in</span>
                        )}
                        {sale.customer?.phone && (
                          <p className="text-xs text-gray-400">{sale.customer.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <SaleTypeBadge type={sale.saleType} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 whitespace-nowrap">
                        {formatAmount(sale.netAmount, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-green-700 whitespace-nowrap">
                        {formatAmount(sale.paidAmount, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                        {parseFloat(sale.dueAmount) > 0 ? (
                          <span className="text-red-600">{formatAmount(sale.dueAmount, currency)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge status={sale.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {sale.cashier?.username ?? '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedId(sale.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                            title="View invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="border-t border-gray-200 px-4">
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Sale detail modal */}
      {selectedId && (
        <SaleDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
