import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../../api/customers';
import Button from '../../components/ui/Button';
import { useAppStore } from '../../store/useAppStore';

interface FormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  type: 'RETAIL' | 'WHOLESALE' | 'CREDIT';
  status: 'ACTIVE' | 'INACTIVE';
  creditLimit: string;
}

export default function CustomerForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showNotification } = useAppStore();

  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id!),
    enabled: isEdit,
    select: (r) => r.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      type: 'RETAIL',
      status: 'ACTIVE',
      creditLimit: '',
    },
  });

  useEffect(() => {
    if (customerData) {
      reset({
        name: customerData.name,
        phone: customerData.phone ?? '',
        email: customerData.email ?? '',
        address: customerData.address ?? '',
        type: customerData.type,
        status: customerData.status,
        creditLimit: customerData.creditLimit ?? '',
      });
    }
  }, [customerData, reset]);

  const customerType = watch('type');

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        type: values.type,
        status: values.status,
        creditLimit: values.creditLimit ? parseFloat(values.creditLimit) : null,
      };
      return isEdit
        ? customersApi.update(id!, payload)
        : customersApi.create(payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', id] });
      showNotification(isEdit ? 'Customer updated.' : 'Customer created.', 'success');
      navigate(`/customers/${res.data.id}`);
    },
    onError: (err: any) => {
      showNotification(err?.message ?? 'Failed to save customer.', 'error');
    },
  });

  if (isEdit && customerLoading) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">Loading customer…</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={isEdit ? `/customers/${id}` : '/customers'}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Customer' : 'New Customer'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit ? 'Update customer details' : 'Add a new customer account'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Basic Information
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Customer name"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                {...register('phone')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="03xx-xxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="customer@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              {...register('address')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Street address, city…"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Account Settings
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credit Limit
              {customerType !== 'CREDIT' && (
                <span className="ml-1 text-xs text-gray-400">(optional — required for Credit type)</span>
              )}
              {customerType === 'CREDIT' && (
                <span className="ml-1 text-xs text-amber-600">*</span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-mono">
                PKR
              </span>
              <input
                {...register('creditLimit', {
                  validate: (v) => {
                    if (!v) return true;
                    const n = parseFloat(v);
                    if (isNaN(n) || n < 0) return 'Must be a positive number';
                    return true;
                  },
                })}
                type="number"
                min="0"
                step="0.01"
                className="w-full pl-12 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                placeholder="0.00"
              />
            </div>
            {errors.creditLimit && (
              <p className="mt-1 text-xs text-red-600">{errors.creditLimit.message}</p>
            )}
            {customerType === 'CREDIT' && (
              <p className="mt-1 text-xs text-amber-600">
                Credit sales will be blocked if this limit is reached.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link to={isEdit ? `/customers/${id}` : '/customers'}>
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={saveMutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
