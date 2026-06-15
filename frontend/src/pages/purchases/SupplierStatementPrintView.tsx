import { useQuery } from '@tanstack/react-query';
import { Printer, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { settingsApi } from '../../api/settings';
import { suppliersApi } from '../../api/suppliers';
import { formatAmount } from '../../constants/currencies';
import { useAuthStore } from '../../store/useAuthStore';

// Scoped print CSS for this page only. Living next to the component keeps it
// from leaking into other routes — and keeps everything print-related in one place.
const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  @media print {
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print { display: none !important; }
    .print-root {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: 0;
      color: #111;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .print-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 10px;
    }
    .print-table thead {
      display: table-header-group;
    }
    .print-table tfoot { display: table-row-group; }
    .print-table th, .print-table td {
      padding: 5px 6px;
      border: 0.5px solid #cbd5e1;
      word-break: break-word;
      overflow-wrap: anywhere;
      vertical-align: top;
    }
    .print-table th {
      background: #f1f5f9 !important;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.03em;
    }
    .print-table tr {
      page-break-inside: avoid;
    }
    .print-summary-card {
      border: 0.5px solid #cbd5e1 !important;
      background: #fff !important;
      box-shadow: none !important;
    }
    .print-page-break-before {
      page-break-before: always;
    }
  }
`;

interface CompanyInfo {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export default function SupplierStatementPrintView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const printedRef = useRef(false);

  const fromDate = searchParams.get('fromDate') || undefined;
  const toDate = searchParams.get('toDate') || undefined;

  const { data: stmtRes, isLoading, error } = useQuery({
    queryKey: ['supplier-statement-print', id, fromDate, toDate],
    queryFn: () => suppliersApi.getStatement(id!, { fromDate, toDate }),
    enabled: !!id,
  });

  const { data: companyRes } = useQuery({
    queryKey: ['settings-company-print'],
    queryFn: () => settingsApi.getCompany(),
  });

  const stmt = stmtRes?.data;
  const companyMap = companyRes?.data ?? {};
  const company: CompanyInfo = {
    name: companyMap.company_name ?? 'TextilePOS',
    phone: companyMap.company_phone,
    email: companyMap.company_email,
    address: companyMap.company_address,
  };

  // Auto-trigger the browser print dialog once the data is loaded.
  useEffect(() => {
    if (!stmt || printedRef.current) return;
    printedRef.current = true;
    // Give the layout a moment to paint before opening print dialog.
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [stmt]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Preparing statement for print…
      </div>
    );
  }

  if (error || !stmt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-gray-700">Could not load supplier statement.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-primary-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const periodFrom = stmt.fromDate ? new Date(stmt.fromDate).toLocaleDateString() : 'Beginning';
  const periodTo = stmt.toDate ? new Date(stmt.toDate).toLocaleDateString() : 'Today';

  return (
    <>
      <style>{PRINT_STYLES}</style>

      {/* Floating action bar — hidden when printing. */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Print preview · supplier statement</h2>
          <p className="text-xs text-gray-400">
            For best results, disable "Headers and footers" in the browser's print dialog.
          </p>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              <Printer className="w-4 h-4" /> Print again
            </button>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>
      </div>

      <div className="print-root max-w-5xl mx-auto px-8 py-24 print:p-0 print:mx-0 print:max-w-none bg-white text-gray-900">
        {/* Company / shop header */}
        <header className="flex items-start justify-between pb-4 border-b-2 border-gray-800">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <div className="mt-1 text-xs text-gray-600 leading-relaxed">
              {company.address && <p>{company.address}</p>}
              <p>
                {[company.phone, company.email].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold uppercase tracking-wide text-gray-700">
              Supplier Statement
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Printed {new Date().toLocaleString()}
            </p>
            {user && (
              <p className="text-xs text-gray-400 mt-0.5">
                Generated by {user.username}
              </p>
            )}
          </div>
        </header>

        {/* Supplier + period meta */}
        <section className="grid grid-cols-2 gap-6 mt-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Supplier
            </p>
            <p className="text-base font-semibold text-gray-900">{stmt.supplier.name}</p>
            <div className="mt-1 text-xs text-gray-600 leading-relaxed space-y-0.5">
              {stmt.supplier.contactName && <p>{stmt.supplier.contactName}</p>}
              {stmt.supplier.phone && <p>{stmt.supplier.phone}</p>}
              {stmt.supplier.email && <p>{stmt.supplier.email}</p>}
              {stmt.supplier.address && <p className="max-w-xs">{stmt.supplier.address}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Statement Period
            </p>
            <p className="text-sm font-medium text-gray-800 font-mono">
              {periodFrom} → {periodTo}
            </p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Base Currency
            </p>
            <p className="text-sm font-mono font-semibold text-gray-800">
              {stmt.baseCurrencyCode}
            </p>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid grid-cols-4 gap-3 mt-5">
          <div className="print-summary-card border border-gray-300 rounded p-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Opening Balance</p>
            <p className="text-base font-bold font-mono text-gray-800 mt-1">
              {formatAmount(stmt.openingBalanceBase, stmt.baseCurrencyCode)}
            </p>
          </div>
          <div className="print-summary-card border border-gray-300 rounded p-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Purchases (Credit)</p>
            <p className="text-base font-bold font-mono text-gray-800 mt-1">
              {formatAmount(stmt.totalCreditBase, stmt.baseCurrencyCode)}
            </p>
          </div>
          <div className="print-summary-card border border-gray-300 rounded p-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Payments (Debit)</p>
            <p className="text-base font-bold font-mono text-gray-800 mt-1">
              {formatAmount(stmt.totalDebitBase, stmt.baseCurrencyCode)}
            </p>
          </div>
          <div className="print-summary-card border border-gray-300 rounded p-3 bg-gray-50">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Closing Balance</p>
            <p
              className={`text-base font-bold font-mono mt-1 ${parseFloat(stmt.closingBalanceBase) > 0 ? 'text-red-700' : 'text-gray-800'}`}
            >
              {formatAmount(stmt.closingBalanceBase, stmt.baseCurrencyCode)}
            </p>
          </div>
        </section>

        {/* Entries table */}
        <section className="mt-5">
          <table className="print-table w-full border border-gray-300">
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Credit</th>
                <th style={{ textAlign: 'center' }}>Ccy</th>
                <th style={{ textAlign: 'right' }}>Balance ({stmt.baseCurrencyCode})</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f8fafc' }}>
                <td colSpan={7} style={{ fontSize: '10px', color: '#475569' }}>
                  Opening Balance
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
                  {formatAmount(stmt.openingBalanceBase, stmt.baseCurrencyCode)}
                </td>
              </tr>
              {stmt.entries.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    No entries in the selected period.
                  </td>
                </tr>
              ) : (
                stmt.entries.map((e) => {
                  const isPurchase = e.referenceType === 'PURCHASE_ORDER';
                  const isPayment = e.referenceType === 'SUPPLIER_PAYMENT';
                  const typeLabel = isPurchase ? 'Purchase' : isPayment ? 'Payment' : e.referenceType;
                  return (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td style={{ fontFamily: 'ui-monospace, monospace' }}>{e.referenceNumber}</td>
                      <td>{typeLabel}</td>
                      <td>{e.description}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                        {parseFloat(e.debitOriginalCurrency) > 0
                          ? formatAmount(e.debitOriginalCurrency, e.currencyCode)
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                        {parseFloat(e.creditOriginalCurrency) > 0
                          ? formatAmount(e.creditOriginalCurrency, e.currencyCode)
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: '9px' }}>
                        {e.currencyCode}
                        {e.currencyCode !== stmt.baseCurrencyCode && (
                          <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: 2 }}>
                            @ {parseFloat(e.exchangeRateToBaseCurrency).toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'ui-monospace, monospace',
                          fontWeight: 600,
                          color: parseFloat(e.balanceAfterBase) > 0 ? '#b91c1c' : '#334155',
                        }}
                      >
                        {formatAmount(e.balanceAfterBase, stmt.baseCurrencyCode)}
                      </td>
                    </tr>
                  );
                })
              )}
              <tr style={{ background: '#e2e8f0', borderTop: '2px solid #475569' }}>
                <td colSpan={4} style={{ fontWeight: 700 }}>Closing Balance</td>
                <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
                  {formatAmount(stmt.totalDebitBase, stmt.baseCurrencyCode)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
                  {formatAmount(stmt.totalCreditBase, stmt.baseCurrencyCode)}
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: '9px' }}>
                  {stmt.baseCurrencyCode}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 800,
                    color: parseFloat(stmt.closingBalanceBase) > 0 ? '#b91c1c' : '#0f172a',
                  }}
                >
                  {formatAmount(stmt.closingBalanceBase, stmt.baseCurrencyCode)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <footer className="mt-6 pt-3 border-t border-gray-300 text-[10px] text-gray-500 flex justify-between">
          <span>
            Statement generated {new Date(stmt.generatedAt).toLocaleString()}
          </span>
          <span>This is a computer-generated document and does not require a signature.</span>
        </footer>
      </div>
    </>
  );
}
