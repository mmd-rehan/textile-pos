import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { customersApi } from '../../api/customers';
import Modal from '../../components/ui/Modal';
import { useAppStore } from '../../store/useAppStore';
import type { Customer } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

interface FormState {
  name: string;
  phone: string;
  address: string;
  type: 'RETAIL' | 'WHOLESALE' | 'CREDIT';
}

const INITIAL: FormState = { name: '', phone: '', address: '', type: 'RETAIL' };

export default function CustomerQuickCreateModal({ open, onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const mutation = useMutation({
    mutationFn: () =>
      customersApi.create({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        type: form.type,
        creditLimit: 0,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customers-search'] });
      showNotification(`Customer "${res.data.name}" created.`, 'success');
      setForm(INITIAL);
      setErrors({});
      onCreated(res.data);
    },
    onError: (err: any) => {
      const code = err?.code ?? '';
      if (code === 'PHONE_EXISTS') {
        setErrors({ phone: 'This phone number is already registered.' });
      } else if (code === 'EMAIL_EXISTS') {
        setErrors({ name: 'Email already in use.' });
      } else {
        showNotification(err?.message ?? 'Failed to create customer.', 'error');
      }
    },
  });

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  function handleClose() {
    if (mutation.isPending) return;
    setForm(INITIAL);
    setErrors({});
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Quick-Add Customer" size="sm">
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <UserPlus className="w-4 h-4 text-blue-500 shrink-0" />
          New customer will be auto-selected in the cart.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Customer name"
            disabled={mutation.isPending}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="03xx-xxxxxxx"
            disabled={mutation.isPending}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Street address (optional)"
            disabled={mutation.isPending}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as FormState['type'] }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={mutation.isPending}
          >
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="CREDIT">Credit</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Add Customer
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
