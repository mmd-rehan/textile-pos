import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Barcode as BarcodeIcon, Building2, Check, DollarSign, Edit2, FileText, Gauge, Loader2, Save, ToggleLeft, X } from 'lucide-react';
import { useState } from 'react';
import { currenciesApi } from '../../api/currencies';
import { settingsApi } from '../../api/settings';
import { CURRENCIES, getCurrency } from '../../constants/currencies';
import { useAppStore } from '../../store/useAppStore';

const TABS = [
  { id: 'company', label: 'Company Profile', icon: Building2 },
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'measurement', label: 'Measurement', icon: Gauge },
  { id: 'barcode', label: 'Barcode', icon: BarcodeIcon },
  { id: 'currencies', label: 'Currencies', icon: DollarSign },
  { id: 'flags', label: 'Feature Flags', icon: ToggleLeft },
] as const;

type Tab = (typeof TABS)[number]['id'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

const inputCls =
  'w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500';

// ── Company tab ──────────────────────────────────────────────────────────────

function CompanyTab({ initial }: { initial: Record<string, string> }) {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const [form, setForm] = useState({
    company_name: initial.company_name ?? '',
    company_address: initial.company_address ?? '',
    company_phone: initial.company_phone ?? '',
    company_email: initial.company_email ?? '',
    company_currency: initial.company_currency ?? 'PKR',
    company_timezone: initial.company_timezone ?? 'Asia/Karachi',
    company_tax_enabled: initial.company_tax_enabled ?? 'false',
    company_tax_rate: initial.company_tax_rate ?? '0',
    company_tax_label: initial.company_tax_label ?? 'Tax',
  });

  const mut = useMutation({
    mutationFn: () => {
      const taxEnabled = form.company_tax_enabled === 'true';
      const rate = parseFloat(form.company_tax_rate);
      if (taxEnabled && (isNaN(rate) || rate < 0 || rate > 100)) {
        throw new Error('Tax rate must be between 0 and 100');
      }
      if (taxEnabled && !form.company_tax_label.trim()) {
        throw new Error('Tax label is required when tax is enabled');
      }
      return settingsApi.updateCompany(form);
    },
    onSuccess: () => {
      // Invalidate everything that shows currency/tax labels or base currency amounts
      qc.invalidateQueries({ queryKey: ['settings-company'] });
      qc.invalidateQueries({ queryKey: ['settings-tax'] });
      qc.invalidateQueries({ queryKey: ['currencies-all'] });
      qc.invalidateQueries({ queryKey: ['currencies-exchange-rates'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['report-sales'] });
      qc.invalidateQueries({ queryKey: ['report-purchases'] });
      qc.invalidateQueries({ queryKey: ['report-sales-monthly'] });
      qc.invalidateQueries({ queryKey: ['report-sales-products'] });
      showNotification('Company settings saved.', 'success');
    },
    onError: (err: any) => showNotification(err?.message ?? 'Failed to save settings.', 'error'),
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <Section title="Company Details">
        <Field label="Company Name" hint="Appears on all invoices and receipts">
          <input className={inputCls} value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
        </Field>
        <Field label="Address" hint="Full address for invoices">
          <textarea
            className={inputCls}
            rows={2}
            value={form.company_address}
            onChange={(e) => set('company_address', e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.company_phone} onChange={(e) => set('company_phone', e.target.value)} />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={form.company_email} onChange={(e) => set('company_email', e.target.value)} />
        </Field>
      </Section>

      <Section title="Currency & Region">
        <Field label="Base Currency" hint="Used for all sales and internal accounting. Changing this affects new transactions only.">
          <select className={inputCls} value={form.company_currency} onChange={(e) => set('company_currency', e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
            ))}
          </select>
        </Field>
        <Field label="Timezone">
          <input className={inputCls} value={form.company_timezone} onChange={(e) => set('company_timezone', e.target.value)} placeholder="Asia/Karachi" />
        </Field>
      </Section>

      <Section title="Tax">
        <Field label="Tax Enabled" hint="When enabled, tax is calculated on every new invoice">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('company_tax_enabled', form.company_tax_enabled === 'true' ? 'false' : 'true')}
              className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none ${
                form.company_tax_enabled === 'true' ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                  form.company_tax_enabled === 'true' ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">
              {form.company_tax_enabled === 'true' ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </Field>
        <Field label="Tax Label" hint='Label shown on invoices (e.g. "GST", "VAT")'>
          <input
            className={inputCls}
            value={form.company_tax_label}
            onChange={(e) => set('company_tax_label', e.target.value)}
            placeholder="e.g. VAT, GST, Tax"
          />
        </Field>
        <Field label="Tax Rate (%)" hint="Applied to every new invoice. 0–100. Historical invoices keep their saved rate.">
          <input
            className={inputCls}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.company_tax_rate}
            onChange={(e) => set('company_tax_rate', e.target.value)}
            disabled={form.company_tax_enabled !== 'true'}
          />
        </Field>
        {form.company_tax_enabled === 'true' && (
          <div className="mt-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            Tax is <strong>exclusive</strong> — {form.company_tax_label || 'Tax'} ({form.company_tax_rate}%) will be
            added on top of the invoice subtotal. Existing invoices are not affected.
          </div>
        )}
      </Section>

      <div className="flex justify-end">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60"
        >
          {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ── Invoice tab ──────────────────────────────────────────────────────────────

function InvoiceTab({ initial }: { initial: Record<string, string> }) {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const [form, setForm] = useState({
    invoice_prefix: initial.invoice_prefix ?? 'INV',
    invoice_footer: initial.invoice_footer ?? 'Thank you for your business!',
    invoice_show_tax: initial.invoice_show_tax ?? 'false',
  });

  const mut = useMutation({
    mutationFn: () => settingsApi.updateApp(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-app'] });
      showNotification('Invoice settings saved.', 'success');
    },
    onError: () => showNotification('Failed to save settings.', 'error'),
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <Section title="Invoice Settings">
        <Field label="Invoice Prefix" hint='Prefix for retail invoices (e.g. "INV")'>
          <input className={inputCls} value={form.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} />
        </Field>
        <Field label="Invoice Footer" hint="Shown at the bottom of every printed invoice">
          <textarea
            className={inputCls}
            rows={3}
            value={form.invoice_footer}
            onChange={(e) => set('invoice_footer', e.target.value)}
          />
        </Field>
        <Field label="Show Tax on Invoice">
          <select className={inputCls} value={form.invoice_show_tax} onChange={(e) => set('invoice_show_tax', e.target.value)}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </Field>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60"
        >
          {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ── Measurement tab ──────────────────────────────────────────────────────────

function MeasurementTab({ initial }: { initial: Record<string, string> }) {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const [form, setForm] = useState({
    default_length_unit: initial.default_length_unit ?? 'yd',
    default_weight_unit: initial.default_weight_unit ?? 'kg',
  });

  const mut = useMutation({
    mutationFn: () => settingsApi.updateApp(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-app'] });
      showNotification('Measurement settings saved.', 'success');
    },
    onError: () => showNotification('Failed to save settings.', 'error'),
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        Changing measurement defaults does not retroactively alter historical stock records. All existing movements and rolls
        retain their original units.
      </div>

      <Section title="Default Units">
        <Field label="Default Length Unit" hint="Used when purchasing rolls and selling fabric">
          <select className={inputCls} value={form.default_length_unit} onChange={(e) => set('default_length_unit', e.target.value)}>
            <option value="yd">Yard (yd)</option>
            <option value="m">Meter (m)</option>
          </select>
        </Field>
        <Field label="Default Weight Unit" hint="Used for product weight if tracked">
          <select className={inputCls} value={form.default_weight_unit} onChange={(e) => set('default_weight_unit', e.target.value)}>
            <option value="kg">Kilogram (kg)</option>
            <option value="g">Gram (g)</option>
            <option value="lb">Pound (lb)</option>
          </select>
        </Field>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60"
        >
          {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ── Barcode tab ──────────────────────────────────────────────────────────────

function BarcodeTab({ initial }: { initial: Record<string, string> }) {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const [form, setForm] = useState({
    barcode_prefix_roll: initial.barcode_prefix_roll ?? 'ROLL-',
    barcode_prefix_product: initial.barcode_prefix_product ?? 'PROD-',
    barcode_format: initial.barcode_format ?? 'CODE128',
  });

  const mut = useMutation({
    mutationFn: () => settingsApi.updateApp(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-app'] });
      showNotification('Barcode settings saved.', 'success');
    },
    onError: () => showNotification('Failed to save settings.', 'error'),
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <Section title="Barcode Configuration">
        <Field label="Roll Barcode Prefix" hint='Prepended to roll number when generating barcodes (e.g. "ROLL-")'>
          <input className={inputCls} value={form.barcode_prefix_roll} onChange={(e) => set('barcode_prefix_roll', e.target.value)} />
        </Field>
        <Field label="Product Barcode Prefix" hint='Prepended to product code when generating barcodes (e.g. "PROD-")'>
          <input className={inputCls} value={form.barcode_prefix_product} onChange={(e) => set('barcode_prefix_product', e.target.value)} />
        </Field>
        <Field label="Barcode Format" hint="Symbology used for generated barcodes">
          <select className={inputCls} value={form.barcode_format} onChange={(e) => set('barcode_format', e.target.value)}>
            <option value="CODE128">Code 128 (recommended)</option>
            <option value="CODE39">Code 39</option>
            <option value="EAN13">EAN-13</option>
          </select>
        </Field>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60"
        >
          {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ── Currencies tab ────────────────────────────────────────────────────────────

function CurrenciesTab({ baseCurrencyCode }: { baseCurrencyCode: string }) {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();

  const baseCurrency = getCurrency(baseCurrencyCode);

  const { data: allCurrencies = [], isLoading: currLoading } = useQuery({
    queryKey: ['currencies-all'],
    queryFn: () => currenciesApi.getAll(),
    select: (r) => r.data,
  });

  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['currencies-exchange-rates', baseCurrencyCode],
    queryFn: () => currenciesApi.getExchangeRates(baseCurrencyCode),
    select: (r) => r.data,
  });

  const [editingRate, setEditingRate] = useState<{ fromCode: string; value: string; notes: string } | null>(null);

  const toggleMut = useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) =>
      currenciesApi.toggleStatus(code, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currencies-all'] });
      showNotification('Currency status updated.', 'success');
    },
    onError: () => showNotification('Failed to update currency.', 'error'),
  });

  const rateMut = useMutation({
    mutationFn: () =>
      currenciesApi.upsertExchangeRate({
        fromCurrencyCode: editingRate!.fromCode,
        toCurrencyCode: baseCurrencyCode,
        rate: editingRate!.value,
        notes: editingRate!.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currencies-exchange-rates'] });
      showNotification('Exchange rate saved.', 'success');
      setEditingRate(null);
    },
    onError: () => showNotification('Failed to save exchange rate.', 'error'),
  });

  const rateMap = new Map(rates.map((r) => [r.fromCurrencyCode, r]));
  const nonBase = allCurrencies.filter((c) => c.code !== baseCurrencyCode);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Base currency: {baseCurrencyCode}</strong> ({baseCurrency.name} {baseCurrency.symbol}) — set in Company Profile tab.
        Editing exchange rates here only affects <em>future</em> purchases. Existing purchase records retain their original rate snapshot.
      </div>

      <Section title="Exchange Rates">
        {currLoading || ratesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Currency</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Rate to {baseCurrencyCode}</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Updated</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {nonBase.map((c) => {
                const rate = rateMap.get(c.code);
                const isEditing = editingRate?.fromCode === c.code;
                return (
                  <tr key={c.code} className="hover:bg-gray-50">
                    <td className="py-3">
                      <p className="font-medium text-gray-900">{c.code}</p>
                      <p className="text-xs text-gray-400">{c.name} ({c.symbol})</p>
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">1 {c.code} =</span>
                          <input
                            type="number"
                            min="0.000001"
                            step="0.000001"
                            value={editingRate.value}
                            onChange={(e) => setEditingRate((prev) => prev ? { ...prev, value: e.target.value } : prev)}
                            className="w-28 text-sm border border-primary-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                          />
                          <span className="text-xs text-gray-500">{baseCurrencyCode}</span>
                        </div>
                      ) : rate ? (
                        <span className="font-mono text-gray-900">
                          1 {c.code} = {parseFloat(rate.rate).toFixed(6)} {baseCurrencyCode}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          No rate set — defaults to 1
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-gray-400">
                      {rate ? new Date(rate.updatedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => toggleMut.mutate({ code: c.code, isActive: !c.isActive })}
                        disabled={toggleMut.isPending}
                        className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${
                          c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => rateMut.mutate()}
                            disabled={rateMut.isPending || !editingRate.value}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          >
                            {rateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditingRate(null)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingRate({ fromCode: c.code, value: rate ? parseFloat(rate.rate).toFixed(6) : '1.000000', notes: rate?.notes ?? '' })}
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {nonBase.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                    All currencies have the same base. Add more currencies to manage rates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {editingRate && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-400"
              value={editingRate.notes}
              onChange={(e) => setEditingRate((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
              placeholder="e.g. Bank rate as of today"
            />
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Feature flags tab ────────────────────────────────────────────────────────

const FLAG_META: Record<string, { label: string; description: string }> = {
  wholesale_enabled: { label: 'Wholesale POS', description: 'Enable the wholesale POS and bulk invoicing flow.' },
  barcode_generation: { label: 'Barcode Generation', description: 'Allow generating and printing barcodes from the system.' },
  wastage_tracking: { label: 'Wastage Tracking', description: 'Track cutting wastage automatically on fabric sales.' },
  remnant_management: { label: 'Remnant Management', description: 'Allow marking roll offcuts as remnants for later sale.' },
  credit_sales: { label: 'Credit Sales', description: 'Allow partial payment / credit balance on sales invoices.' },
};

function FlagsTab({ initial }: { initial: Record<string, boolean> }) {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const [flags, setFlags] = useState<Record<string, boolean>>(initial);

  const mut = useMutation({
    mutationFn: ({ name, isEnabled }: { name: string; isEnabled: boolean }) =>
      settingsApi.updateFlag(name, isEnabled),
    onSuccess: (res) => {
      setFlags(res.data);
      qc.invalidateQueries({ queryKey: ['settings-flags'] });
      showNotification('Feature flag updated.', 'success');
    },
    onError: () => showNotification('Failed to update flag.', 'error'),
  });

  const allFlags = new Set([...Object.keys(FLAG_META), ...Object.keys(flags)]);

  return (
    <div className="space-y-4">
      <Section title="Feature Flags">
        {[...allFlags].map((name) => {
          const meta = FLAG_META[name] ?? { label: name, description: '' };
          const enabled = flags[name] ?? false;
          return (
            <div key={name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{meta.description}</p>
              </div>
              <button
                onClick={() => mut.mutate({ name, isEnabled: !enabled })}
                disabled={mut.isPending}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none ${
                  enabled ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                    enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('company');

  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['settings-company'],
    queryFn: () => settingsApi.getCompany(),
    select: (r) => r.data,
  });

  const { data: appData, isLoading: appLoading } = useQuery({
    queryKey: ['settings-app'],
    queryFn: () => settingsApi.getApp(),
    select: (r) => r.data,
  });

  const { data: flagsData, isLoading: flagsLoading } = useQuery({
    queryKey: ['settings-flags'],
    queryFn: () => settingsApi.getFlags(),
    select: (r) => r.data,
  });

  const baseCurrencyCode = companyData?.company_currency ?? 'PKR';
  const loading = companyLoading || appLoading || flagsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage company profile, invoice defaults, and system configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {tab === 'company' && <CompanyTab initial={companyData ?? {}} />}
          {tab === 'invoice' && <InvoiceTab initial={appData ?? {}} />}
          {tab === 'measurement' && <MeasurementTab initial={appData ?? {}} />}
          {tab === 'barcode' && <BarcodeTab initial={appData ?? {}} />}
          {tab === 'currencies' && <CurrenciesTab baseCurrencyCode={baseCurrencyCode} />}
          {tab === 'flags' && <FlagsTab initial={flagsData ?? {}} />}
        </>
      )}
    </div>
  );
}
