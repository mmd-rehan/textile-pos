import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useBrands } from '../../hooks/useBrands';
import { useCategories } from '../../hooks/useCategories';
import { useColors, useCreateProduct, useDesigns, useProduct, useUpdateProduct } from '../../hooks/useProducts';
import { useUnits } from '../../hooks/useUnits';
import type { CreateProductForm, ProductType } from '../../types';

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'FABRIC_ROLL', label: 'Fabric Roll' },
  { value: 'CUT_PIECE', label: 'Cut Piece' },
  { value: 'FIXED_PRODUCT', label: 'Fixed Product' },
];

const schema = z.object({
  productCode: z.string().min(1, 'Product code is required').max(50),
  name: z.string().min(1, 'Name is required').max(200),
  barcode: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  productType: z.enum(['FABRIC_ROLL', 'CUT_PIECE', 'FIXED_PRODUCT']).refine(
    (v) => v !== undefined,
    { message: 'Product type is required' },
  ),
  categoryId: z.string().min(1, 'Category is required'),
  brandId: z.string().optional(),
  colorId: z.string().optional(),
  designId: z.string().optional(),
  defaultUnitId: z.string().min(1, 'Unit is required'),
  retailPrice: z.number({ message: 'Must be a number' }).positive('Must be greater than 0'),
  wholesalePrice: z.number({ message: 'Must be a number' }).positive('Must be greater than 0'),
});

type FormData = z.infer<typeof schema>;

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: product } = useProduct(id ?? '');
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: units = [] } = useUnits();
  const { data: colors = [] } = useColors();
  const { data: designs = [] } = useDesigns();

  const create = useCreateProduct();
  const update = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (product) {
      reset({
        productCode: product.productCode,
        name: product.name,
        barcode: product.barcode ?? '',
        description: product.description ?? '',
        productType: product.productType,
        categoryId: product.categoryId,
        brandId: product.brandId ?? '',
        colorId: product.colorId ?? '',
        designId: product.designId ?? '',
        defaultUnitId: product.defaultUnitId,
        retailPrice: parseFloat(product.retailPrice),
        wholesalePrice: parseFloat(product.wholesalePrice),
      });
    }
  }, [product, reset]);

  async function onSubmit(data: FormData) {
    const payload: CreateProductForm = {
      productCode: data.productCode,
      name: data.name,
      barcode: data.barcode || undefined,
      description: data.description || undefined,
      productType: data.productType,
      categoryId: data.categoryId,
      brandId: data.brandId || undefined,
      colorId: data.colorId || undefined,
      designId: data.designId || undefined,
      defaultUnitId: data.defaultUnitId,
      retailPrice: data.retailPrice,
      wholesalePrice: data.wholesalePrice,
    };

    if (isEdit && id) {
      await update.mutateAsync({ id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    navigate('/catalog/products');
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Product' : 'New Product'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isEdit ? 'Update product information' : 'Add a new product to your catalog'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Product Code"
              required
              placeholder="e.g. COT-001"
              error={errors.productCode?.message}
              {...register('productCode')}
            />
            <Input
              label="Barcode"
              placeholder="Optional"
              error={errors.barcode?.message}
              {...register('barcode')}
            />
          </div>
          <Input
            label="Product Name"
            required
            placeholder="e.g. Cotton Fabric 60"
            error={errors.name?.message}
            {...register('name')}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Optional product description"
              {...register('description')}
            />
          </div>
        </div>

        {/* Classification */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Classification</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Product Type"
              required
              placeholder="Select type"
              options={PRODUCT_TYPES}
              error={errors.productType?.message}
              {...register('productType')}
            />
            <Select
              label="Category"
              required
              placeholder="Select category"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.categoryId?.message}
              {...register('categoryId')}
            />
            <Select
              label="Brand"
              placeholder="None"
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
              {...register('brandId')}
            />
            <Select
              label="Default Unit"
              required
              placeholder="Select unit"
              options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` }))}
              error={errors.defaultUnitId?.message}
              {...register('defaultUnitId')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Default Color"
              placeholder="None"
              options={colors.map((c) => ({ value: c.id, label: c.name }))}
              {...register('colorId')}
            />
            <Select
              label="Default Design"
              placeholder="None"
              options={designs.map((d) => ({ value: d.id, label: d.name }))}
              {...register('designId')}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Retail Price"
              required
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.retailPrice?.message}
              {...register('retailPrice', { setValueAs: (v) => (v === '' ? undefined : parseFloat(v)) })}
            />
            <Input
              label="Wholesale Price"
              required
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.wholesalePrice?.message}
              {...register('wholesalePrice', { setValueAs: (v) => (v === '' ? undefined : parseFloat(v)) })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/catalog/products')}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting || create.isPending || update.isPending}>
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
