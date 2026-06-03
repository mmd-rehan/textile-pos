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
import type { Color, Design, Product } from '../../types';

type RowType = 'ROLL' | 'ITEM';

interface PurchaseRow {
  rowType: RowType;
  productId: string;
  // Roll fields
  colorId: string;
  designId: string;
  originalLengthYard: string;
  purchasePricePerYard: string;
  salePricePerYard: string;
  location: string;
  // Item fields
  quantity: string;
  purchasePricePerUnit: string;
  salePricePerUnit: string;
  barcodeValue: string;
  description: string;
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
  rows: PurchaseRow[];
}

const defaultRow = (): PurchaseRow => ({
  rowType: 'ROLL',
  productId: '',
  colorId: '',
  designId: '',
  originalLengthYard: '',
  purchasePricePerYard: '',
  salePricePerYard: '',
  location: '',
  quantity: '',
  purchasePricePerUnit: '',
  salePricePerUnit: '',
  barcodeValue: '',
  description: '',
});

const saleCurrency = getCurrency(GLOBAL_SALE_CURRENCY);

export default function PurchaseCreatePage() {
  const navigate = useNavigate();
  const { showNotification } = useAppStore();
  const qc = useQueryClient();

  const [quickColorOpen, setQuickColorOpen] = useState(false);
  const [quickColorName, setQuickColorName] = useState('');
  const [quickDesignOpen, setQuickDesignOpen] = useState(false);
  const [quickDesignName, setQuickDesignName] = useState('');

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
  const products: Product[] = productsData?.data ?? [];
  const batches = batchesData?.data ?? [];
  const allColors: Color[] = colorsData ?? [];
  const allDesigns: Design[] = designsData ?? [];

  const productTypeMap = new Map(products.map((p) => [p.id, p.productType]));

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
      rows: [defaultRow()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'rows' });
  const watchedRows = useWatch({ control, name: 'rows' });
  const batchMode = useWatch({ control, name: 'batchMode' });
  const selectedCurrencyCode = useWatch({ control, name: 'currency' });
  const exchangeRateStr = useWatch({ control, name: 'exchangeRate' });
  const purchaseCurrency = getCurrency(selectedCurrencyCode || 'PKR');
  const isBaseCurrency = selectedCurrencyCode === GLOBAL_SALE_CURRENCY;
  const exchangeRate = isBaseCurrency ? 1 : (parseFloat(exchangeRateStr || '1') || 1);

  // Total cost calculation across both row types
  const totalCostOriginal = watchedRows?.reduce((sum, r) => {
    if (!r) return sum;
    if (r.rowType === 'ROLL') {
      const len = parseFloat(r.originalLengthYard || '0') || 0;
      const price = parseFloat(r.purchasePricePerYard || '0') || 0;
      return sum + len * price;
    } else {
      const qty = parseFloat(r.quantity || '0') || 0;
      const price = parseFloat(r.purchasePricePerUnit || '0') || 0;
      return sum + qty * price;
    }
  }, 0) ?? 0;

  const totalCostBase = totalCostOriginal * exchangeRate;
  const paidVal = parseFloat(useWatch({ control, name: 'paidAmount' }) || '0') || 0;
  const payable = Math.max(0, totalCostOriginal - paidVal);

  // Quick-create color
  const quickCreateColor = useMutation({
    mutationFn: () => colorsApi.create({ name: quickColorName.trim() }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: COLORS_KEY });
      fields.forEach((_, i) => {
        if (!watchedRows?.[i]?.colorId) {
          setValue(`rows.${i}.colorId`, res.data.id);
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
      fields.forEach((_, i) => {
        if (!watchedRows?.[i]?.designId) {
          setValue(`rows.${i}.designId`, res.data.id);
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
      const rollRows = form.rows.filter((r) => r.rowType === 'ROLL');
      const itemRows = form.rows.filter((r) => r.rowType === 'ITEM');

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
        rolls: rollRows.length > 0 ? rollRows.map((r) => ({
          productId: r.productId,
          colorId: r.colorId || undefined,
          designId: r.designId || undefined,
          originalLengthYard: parseFloat(r.originalLengthYard),
          purchasePricePerYard: parseFloat(r.purchasePricePerYard),
          salePricePerYard: parseFloat(r.salePricePerYard),
          location: r.location || undefined,
        })) : undefined,
        items: itemRows.length > 0 ? itemRows.map((r) => ({
          productId: r.productId,
          colorId: r.colorId || undefined,
          designId: r.designId || undefined,
          quantity: parseFloat(r.quantity),
          purchasePricePerUnit: parseFloat(r.purchasePricePerUnit),
          salePricePerUnit: parseFloat(r.salePricePerUnit),
          barcodeValue: r.barcodeValue || undefined,
          location: r.location || undefined,
          description: r.description || undefined,
        })) : undefined,
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

  // Determine row type from selected product
  function getRowTypeForProduct(productId: string): RowType {
    const type = productTypeMap.get(productId);
    return type === 'FABRIC_ROLL' ? 'ROLL' : 'ITEM';
  }

  function handleProductChange(index: number, productId: string) {
    setValue(`rows.${index}.productId`, productId);
    if (productId) {
      const rowType = getRowTypeForProduct(productId);
      setValue(`rows.${index}.rowType`, rowType);
    }
  }

  const rollCount = watchedRows?.filter((r) => r?.rowType === 'ROLL').length ?? 0;
  const itemCount = watchedRows?.filter((r) => r?.rowType === 'ITEM').length ?? 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchases')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase</h1>
          <p className="text-sm text-gray-500 mt-1">Record a purchase — supports rolls (fabric) and quantity items (fixed products)</p>
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
                <span className="font-semibold">Multi-currency purchase</span> — buy prices in{' '}
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

        {/* Batch / Dye Lot (only relevant for roll purchases) */}
        {rollCount > 0 && (
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
        )}

        {/* Purchase lines */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Purchase Lines</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Select a product to automatically determine row type (fabric roll vs. quantity item)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setQuickColorName(''); setQuickColorOpen(true); }}
                className="text-xs px-2 py-1 rounded border border-dashed border-primary-400 text-primary-600 hover:bg-primary-50"
              >
                + Color
              </button>
              <button
                type="button"
                onClick={() => { setQuickDesignName(''); setQuickDesignOpen(true); }}
                className="text-xs px-2 py-1 rounded border border-dashed border-primary-400 text-primary-600 hover:bg-primary-50"
              >
                + Design
              </button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append(defaultRow())}
              >
                <Plus className="w-4 h-4" /> Add Row
              </Button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {fields.map((field, index) => {
              const row = watchedRows?.[index];
              const rowType = row?.rowType ?? 'ROLL';
              const isRoll = rowType === 'ROLL';

              // Subtotal preview
              let sub = 0;
              if (isRoll) {
                const len = parseFloat(row?.originalLengthYard || '0') || 0;
                const price = parseFloat(row?.purchasePricePerYard || '0') || 0;
                sub = len * price;
              } else {
                const qty = parseFloat(row?.quantity || '0') || 0;
                const price = parseFloat(row?.purchasePricePerUnit || '0') || 0;
                sub = qty * price;
              }

              return (
                <div key={field.id} className={`p-4 ${isRoll ? 'bg-blue-50/30' : 'bg-amber-50/30'}`}>
                  {/* Row type badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isRoll
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isRoll ? 'Fabric Roll' : 'Quantity Item'}
                    </span>
                    {sub > 0 && (
                      <span className="ml-auto text-xs font-mono text-gray-700">
                        Subtotal: {formatAmount(sub, purchaseCurrency.code)}
                      </span>
                    )}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Product selection */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register(`rows.${index}.productId`, { required: true })}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.productType === 'FABRIC_ROLL' ? 'Roll' : p.productType === 'FIXED_PRODUCT' ? 'Fixed' : 'Cut'}] {p.name}
                          </option>
                        ))}
                      </select>
                      {errors.rows?.[index]?.productId && (
                        <p className="text-xs text-red-600 mt-0.5">Required</p>
                      )}
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                      <select
                        {...register(`rows.${index}.colorId`)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">—</option>
                        {allColors.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Design */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Design</label>
                      <select
                        {...register(`rows.${index}.designId`)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">—</option>
                        {allDesigns.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {isRoll ? (
                      <>
                        {/* Roll-specific fields */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Length (yds) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number" step="0.01" min="0.01"
                            {...register(`rows.${index}.originalLengthYard`, { required: rowType === 'ROLL', min: 0.01 })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Buy/yd <span className="text-primary-600 font-mono">({purchaseCurrency.code})</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-primary-600 font-mono select-none pointer-events-none">
                              {purchaseCurrency.symbol}
                            </span>
                            <input
                              type="number" step="0.01" min="0"
                              {...register(`rows.${index}.purchasePricePerYard`, { required: rowType === 'ROLL', min: 0 })}
                              className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Sale/yd <span className="text-gray-400 font-mono">({saleCurrency.code})</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono select-none pointer-events-none">
                              {saleCurrency.symbol}
                            </span>
                            <input
                              type="number" step="0.01" min="0"
                              {...register(`rows.${index}.salePricePerYard`, { required: rowType === 'ROLL', min: 0 })}
                              className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                          <input
                            {...register(`rows.${index}.location`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Shelf…"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Item-specific fields */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number" step="1" min="1"
                            {...register(`rows.${index}.quantity`, { required: rowType === 'ITEM', min: 0.0001 })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Buy/unit <span className="text-primary-600 font-mono">({purchaseCurrency.code})</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-primary-600 font-mono select-none pointer-events-none">
                              {purchaseCurrency.symbol}
                            </span>
                            <input
                              type="number" step="0.01" min="0"
                              {...register(`rows.${index}.purchasePricePerUnit`, { required: rowType === 'ITEM', min: 0 })}
                              className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Sale/unit <span className="text-gray-400 font-mono">({saleCurrency.code})</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono select-none pointer-events-none">
                              {saleCurrency.symbol}
                            </span>
                            <input
                              type="number" step="0.01" min="0"
                              {...register(`rows.${index}.salePricePerUnit`, { required: rowType === 'ITEM', min: 0 })}
                              className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Barcode (optional)</label>
                          <input
                            {...register(`rows.${index}.barcodeValue`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                            placeholder="Scan or enter…"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                          <input
                            {...register(`rows.${index}.location`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Shelf…"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                          <input
                            {...register(`rows.${index}.description`)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Notes about this item…"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50">
            <span>
              {rollCount > 0 && `${rollCount} roll row${rollCount !== 1 ? 's' : ''}`}
              {rollCount > 0 && itemCount > 0 && ' · '}
              {itemCount > 0 && `${itemCount} item row${itemCount !== 1 ? 's' : ''}`}
            </span>
            <span className="font-mono text-gray-700">
              Total: {formatAmount(totalCostOriginal, purchaseCurrency.code)}
            </span>
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
            Post Purchase ({fields.length} line{fields.length !== 1 ? 's' : ''})
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
            <button type="button" onClick={() => setQuickColorOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={!quickColorName.trim() || quickCreateColor.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
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
            <button type="button" onClick={() => setQuickDesignOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={!quickDesignName.trim() || quickCreateDesign.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {quickCreateDesign.isPending ? 'Creating…' : 'Create & Select'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
