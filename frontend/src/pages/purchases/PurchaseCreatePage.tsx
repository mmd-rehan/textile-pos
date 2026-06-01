import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { batchesApi } from '../../api/batches';
import { colorsApi, designsApi, productsApi } from '../../api/products';
import { purchasesApi } from '../../api/purchases';
import { suppliersApi } from '../../api/suppliers';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { CURRENCIES, GLOBAL_SALE_CURRENCY, formatAmount, getCurrency } from '../../constants/currencies';
import { COLORS_KEY } from '../../hooks/useColors';
import { DESIGNS_KEY } from '../../hooks/useDesigns';
import { useAppStore } from '../../store/useAppStore';
import type { Color, Design } from '../../types';

interface RollRow {
  productId: string;
  colorId: string;
  designId: string;
  originalLengthYard: string;
  purchasePricePerYard: string;
  salePricePerYard: string;
  location: string;
}

interface PurchaseForm {
  supplierId: string;
  currency: string;
  exchangeRate: string;
  batchMode: 'none' | 'existing' | 'new';
  batchId: string;
  batchNumber: string;
  batchNotes: string;
  paidAmount: string;
  paymentMethod: string;
  orderDate: string;
  deliveryDate: string;
  notes: string;
  rolls: RollRow[];
}

const saleCurrency = getCurrency(GLOBAL_SALE_CURRENCY);

export default function PurchaseCreatePage() {
  const navigate = useNavigate();
  const { showNotification } = useAppStore();
  const qc = useQueryClient();

  // Quick-create modals
  const [quickColorOpen, setQuickColorOpen] = useState(false);
  const [quickColorName, setQuickColorName] = useState('');
  const [quickDesignOpen, setQuickDesignOpen] = useState(false);
  const [quickDesignName, setQuickDesignName] = useState('');
  const [lastCreatedColorId, setLastCreatedColorId] = useState<string | null>(null);
  const [lastCreatedDesignId, setLastCreatedDesignId] = useState<string | null>(null);

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn: () => suppliersApi.getAll({ limit: 200 }),
  });
  const { data: productsData } = useQuery({
    queryKey: ['products-select'],
    queryFn: () => productsApi.getAll({ limit: 500, status: 'ACTIVE' }),
  });
  const { data: batchesData } = useQuery({
    queryKey: ['batches-select'],
    queryFn: () => batchesApi.getAll({ limit: 200 }),
  });
  const { data: colorsData } = useQuery({
    queryKey: [...COLORS_KEY, undefined, true],
    queryFn: () => colorsApi.getAll({ activeOnly: true }),
    select: (res) => res.data,
  });
  const { data: designsData } = useQuery({
    queryKey: [...DESIGNS_KEY, undefined, true],
    queryFn: () => designsApi.getAll({ activeOnly: true }),
    select: (res) => res.data,
  });

  const suppliers = suppliersData?.data ?? [];
  const products = productsData?.data ?? [];
  const batches = batchesData?.data ?? [];
  const allColors: Color[] = colorsData ?? [];
  const allDesigns: Design[] = designsData ?? [];

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<PurchaseForm>({
    defaultValues: {
      supplierId: '',
      currency: 'PKR',
      exchangeRate: '1',
      batchMode: 'none',
      batchId: '',
      batchNumber: '',
      batchNotes: '',
      paidAmount: '0',
      paymentMethod: 'Cash',
      orderDate: new Date().toISOString().slice(0, 10),
      deliveryDate: '',
      notes: '',
      rolls: [
        { productId: '', colorId: '', designId: '', originalLengthYard: '', purchasePricePerYard: '', salePricePerYard: '', location: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'rolls' });
  const watchedRolls = useWatch({ control, name: 'rolls' });
  const batchMode = useWatch({ control, name: 'batchMode' });
  const selectedCurrencyCode = useWatch({ control, name: 'currency' });
  const exchangeRateStr = useWatch({ control, name: 'exchangeRate' });
  const purchaseCurrency = getCurrency(selectedCurrencyCode || 'PKR');
  const isBaseCurrency = selectedCurrencyCode === GLOBAL_SALE_CURRENCY;
  const exchangeRate = isBaseCurrency ? 1 : (parseFloat(exchangeRateStr || '1') || 1);

  const totalCostOriginal = watchedRolls?.reduce((sum, r) => {
    const len = parseFloat(r?.originalLengthYard || '0') || 0;
    const price = parseFloat(r?.purchasePricePerYard || '0') || 0;
    return sum + len * price;
  }, 0) ?? 0;

  const totalCostBase = totalCostOriginal * exchangeRate;
  const paidVal = parseFloat(useWatch({ control, name: 'paidAmount' }) || '0') || 0;
  const payable = Math.max(0, totalCostOriginal - paidVal);

  // Quick-create color
  const quickCreateColor = useMutation({
    mutationFn: () => colorsApi.create({ name: quickColorName.trim() }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: COLORS_KEY });
      setLastCreatedColorId(res.data.id);
      // Auto-select on all roll rows that have no color yet
      fields.forEach((_, i) => {
        if (!watchedRolls?.[i]?.colorId) {
          setValue(`rolls.${i}.colorId`, res.data.id);
        }
      });
      setQuickColorOpen(false);
      setQuickColorName('');
      showNotification(`Color "${res.data.name}" created.`, 'success');
    },
    onError: (err: any) => showNotification(err?.message ?? 'Failed to create color.', 'error'),
  });

  // Quick-create design
  const quickCreateDesign = useMutation({
    mutationFn: () => designsApi.create({ name: quickDesignName.trim() }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: DESIGNS_KEY });
      setLastCreatedDesignId(res.data.id);
      fields.forEach((_, i) => {
        if (!watchedRolls?.[i]?.designId) {
          setValue(`rolls.${i}.designId`, res.data.id);
        }
      });
      setQuickDesignOpen(false);
      setQuickDesignName('');
      showNotification(`Design "${res.data.name}" created.`, 'success');
    },
    onError: (err: any) => showNotification(err?.message ?? 'Failed to create design.', 'error'),
  });

  const createMutation = useMutation({
    mutationFn: (form: PurchaseForm) => {
      const isForeign = form.currency !== GLOBAL_SALE_CURRENCY;
      const payload = {
        supplierId: form.supplierId,
        currency: form.currency || 'PKR',
        exchangeRateToBaseCurrency: isForeign ? (parseFloat(form.exchangeRate) || 1) : undefined,
        batchId: form.batchMode === 'existing' ? form.batchId || undefined : undefined,
        batchNumber: form.batchMode === 'new' ? form.batchNumber || undefined : undefined,
        batchNotes: form.batchMode === 'new' ? form.batchNotes || undefined : undefined,
        paidAmount: parseFloat(form.paidAmount) || 0,
        paymentMethod: form.paymentMethod || undefined,
        orderDate: form.orderDate || undefined,
        deliveryDate: form.deliveryDate || undefined,
        notes: form.notes || undefined,
        rolls: form.rolls.map((r) => ({
          productId: r.productId,
          colorId: r.colorId || undefined,
          designId: r.designId || undefined,
          originalLengthYard: parseFloat(r.originalLengthYard),
          purchasePricePerYard: parseFloat(r.purchasePricePerYard),
          salePricePerYard: parseFloat(r.salePricePerYard),
          location: r.location || undefined,
        })),
      };
      return purchasesApi.create(payload);
    },
    onSuccess: (res) => {
      showNotification(`Purchase ${res.data.poNumber} created successfully.`, 'success');
      navigate(`/purchases/${res.data.id}`);
    },
    onError: (err: any) => {
      showNotification(err?.message ?? 'Failed to create purchase.', 'error');
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchases')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase</h1>
          <p className="text-sm text-gray-500 mt-1">Record a fabric purchase and create rolls</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-6">
        {/* Purchase details + currency */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Purchase Details</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                {...register('supplierId', { required: 'Supplier is required' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.supplierId && <p className="mt-1 text-xs text-red-600">{errors.supplierId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Currency <span className="text-red-500">*</span>
              </label>
              <select
                {...register('currency')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <input
                type="date"
                {...register('orderDate')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {!isBaseCurrency && (
            <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Multi-currency purchase</span> — buy prices entered in{' '}
                <strong>{purchaseCurrency.code} ({purchaseCurrency.symbol})</strong>.
                Sale prices remain in <strong>{saleCurrency.code} ({saleCurrency.symbol})</strong>.
              </p>
              <div className="flex items-end gap-4">
                <div className="w-72">
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Exchange Rate <span className="text-red-500">*</span>
                    <span className="text-xs font-normal ml-1 text-blue-600">
                      (1 {purchaseCurrency.code} = ? {saleCurrency.code})
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-mono select-none">
                      1 {purchaseCurrency.code} =
                    </span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      {...register('exchangeRate', { required: !isBaseCurrency, min: 0.0001 })}
                      className="w-full pl-24 pr-12 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                      placeholder="e.g. 75.50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-mono select-none">
                      {saleCurrency.code}
                    </span>
                  </div>
                  {errors.exchangeRate && (
                    <p className="mt-1 text-xs text-red-600">Exchange rate is required for foreign currency</p>
                  )}
                </div>
                {exchangeRate > 0 && totalCostOriginal > 0 && (
                  <div className="text-sm text-blue-700">
                    Total in {saleCurrency.code}:{' '}
                    <span className="font-semibold font-mono">{formatAmount(totalCostBase, saleCurrency.code)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Optional notes…"
            />
          </div>
        </div>

        {/* Batch / Dye Lot */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Batch / Dye Lot</h2>
          <div className="flex gap-4">
            {(['none', 'existing', 'new'] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" {...register('batchMode')} value={mode} className="accent-primary-600" />
                {mode === 'none' ? 'No batch' : mode === 'existing' ? 'Link existing' : 'Create new'}
              </label>
            ))}
          </div>
          {batchMode === 'existing' && (
            <select
              {...register('batchId')}
              className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select batch…</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.batchNumber}</option>
              ))}
            </select>
          )}
          {batchMode === 'new' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                <input
                  {...register('batchNumber')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. DYE-2026-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  {...register('batchNotes')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Dye lot, colour notes…"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rolls table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Rolls</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setQuickColorName(''); setQuickColorOpen(true); }}
                className="text-xs px-2 py-1 rounded border border-dashed border-primary-400 text-primary-600 hover:bg-primary-50"
              >
                + Add Color
              </button>
              <button
                type="button"
                onClick={() => { setQuickDesignName(''); setQuickDesignOpen(true); }}
                className="text-xs px-2 py-1 rounded border border-dashed border-primary-400 text-primary-600 hover:bg-primary-50"
              >
                + Add Design
              </button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ productId: '', colorId: '', designId: '', originalLengthYard: '', purchasePricePerYard: '', salePricePerYard: '', location: '' })}
              >
                <Plus className="w-4 h-4" /> Add Roll
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left w-44">Product</th>
                  <th className="px-3 py-2 text-left w-28">Color</th>
                  <th className="px-3 py-2 text-left w-28">Design</th>
                  <th className="px-3 py-2 text-left w-28">Length (yds)</th>
                  <th className="px-3 py-2 text-left w-32">
                    Buy/yd
                    <span className="ml-1 text-primary-600 font-mono normal-case">({purchaseCurrency.code})</span>
                  </th>
                  <th className="px-3 py-2 text-left w-32">
                    Sale/yd
                    <span className="ml-1 text-gray-400 font-mono normal-case">({saleCurrency.code})</span>
                  </th>
                  <th className="px-3 py-2 text-left w-24">Location</th>
                  <th className="px-3 py-2 text-right w-24">Subtotal</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, index) => {
                  const len = parseFloat(watchedRolls?.[index]?.originalLengthYard || '0') || 0;
                  const price = parseFloat(watchedRolls?.[index]?.purchasePricePerYard || '0') || 0;
                  const sub = len * price;

                  return (
                    <tr key={field.id} className="align-top">
                      <td className="px-3 py-2">
                        <select
                          {...register(`rolls.${index}.productId`, { required: true })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">Select…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        {errors.rolls?.[index]?.productId && (
                          <p className="text-xs text-red-600 mt-0.5">Required</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          {...register(`rolls.${index}.colorId`)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">—</option>
                          {allColors.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          {...register(`rolls.${index}.designId`)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">—</option>
                          {allDesigns.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" step="0.01" min="0.01"
                          {...register(`rolls.${index}.originalLengthYard`, { required: true, min: 0.01 })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-primary-600 font-mono select-none pointer-events-none">
                            {purchaseCurrency.symbol}
                          </span>
                          <input
                            type="number" step="0.01" min="0"
                            {...register(`rolls.${index}.purchasePricePerYard`, { required: true, min: 0 })}
                            className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono select-none pointer-events-none">
                            {saleCurrency.symbol}
                          </span>
                          <input
                            type="number" step="0.01" min="0"
                            {...register(`rolls.${index}.salePricePerYard`, { required: true, min: 0 })}
                            className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          {...register(`rolls.${index}.location`)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="Shelf…"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700 whitespace-nowrap text-xs">
                        {sub > 0 ? formatAmount(sub, purchaseCurrency.code) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Payment</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded font-mono">
              Amounts in {purchaseCurrency.code} ({purchaseCurrency.name})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cost ({purchaseCurrency.code})
              </label>
              <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg font-mono font-medium text-gray-900">
                {formatAmount(totalCostOriginal, purchaseCurrency.code)}
              </div>
              {!isBaseCurrency && totalCostOriginal > 0 && (
                <p className="mt-1 text-xs text-gray-500 font-mono">
                  ≈ {formatAmount(totalCostBase, saleCurrency.code)} in {saleCurrency.code}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Paid Now <span className="text-xs text-gray-400">({purchaseCurrency.code})</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-mono">{purchaseCurrency.symbol}</span>
                <input
                  type="number" step="0.01" min="0"
                  {...register('paidAmount')}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payable (Due) <span className="text-xs text-gray-400">({purchaseCurrency.code})</span>
              </label>
              <div className={`px-3 py-2 text-sm border rounded-lg font-mono font-medium ${payable > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                {formatAmount(payable, purchaseCurrency.code)}
              </div>
              {!isBaseCurrency && payable > 0 && (
                <p className="mt-1 text-xs text-gray-500 font-mono">
                  ≈ {formatAmount(payable * exchangeRate, saleCurrency.code)} in {saleCurrency.code}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              {...register('paymentMethod')}
              className="w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
              <option>Credit</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/purchases')}>
            Cancel
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Post Purchase ({fields.length} roll{fields.length !== 1 ? 's' : ''})
          </Button>
        </div>
      </form>

      {/* Quick-create Color Modal */}
      <Modal open={quickColorOpen} onClose={() => setQuickColorOpen(false)} title="Quick Add Color">
        <form
          onSubmit={(e) => { e.preventDefault(); if (quickColorName.trim()) quickCreateColor.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={quickColorName}
              onChange={(e) => setQuickColorName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Royal Blue"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setQuickColorOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!quickColorName.trim() || quickCreateColor.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {quickCreateColor.isPending ? 'Creating…' : 'Create & Select'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick-create Design Modal */}
      <Modal open={quickDesignOpen} onClose={() => setQuickDesignOpen(false)} title="Quick Add Design">
        <form
          onSubmit={(e) => { e.preventDefault(); if (quickDesignName.trim()) quickCreateDesign.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Design Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={quickDesignName}
              onChange={(e) => setQuickDesignName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Floral Print"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setQuickDesignOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!quickDesignName.trim() || quickCreateDesign.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {quickCreateDesign.isPending ? 'Creating…' : 'Create & Select'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
