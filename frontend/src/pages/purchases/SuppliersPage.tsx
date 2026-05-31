import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { suppliersApi } from '../../api/suppliers';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { useAppStore } from '../../store/useAppStore';
import type { Supplier } from '../../types';

interface SupplierForm {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
}

export default function SuppliersPage() {
  const { showNotification } = useAppStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { page, search }],
    queryFn: () => suppliersApi.getAll({ page, limit: 20, search: search || undefined }),
  });

  const suppliers = data?.data ?? [];
  const meta = data?.meta;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierForm>();

  const saveMutation = useMutation({
    mutationFn: (form: SupplierForm) => {
      const payload = {
        name: form.name,
        contactName: form.contactName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
      };
      return editing
        ? suppliersApi.update(editing.id, payload)
        : suppliersApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      showNotification(editing ? 'Supplier updated.' : 'Supplier created.', 'success');
      closeModal();
    },
    onError: (err: any) => {
      showNotification(err?.message ?? 'Failed to save supplier.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      showNotification('Supplier deleted.', 'success');
    },
    onError: (err: any) => {
      showNotification(err?.message ?? 'Failed to delete supplier.', 'error');
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', contactName: '', email: '', phone: '', address: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    reset({
      name: s.name,
      contactName: s.contactName ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      address: s.address ?? '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    reset();
  };

  const handleDelete = (s: Supplier) => {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    deleteMutation.mutate(s.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fabric suppliers</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Supplier
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, contact, phone…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No suppliers yet</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.contactName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.email ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {parseFloat(s.currentBalance).toLocaleString('en-PK', {
                        style: 'currency',
                        currency: 'PKR',
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {s._count?.purchaseOrders ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && meta.totalPages > 1 && (
              <div className="px-4 border-t border-gray-200">
                <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Supplier' : 'New Supplier'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Supplier name"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                {...register('contactName')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Contact name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                {...register('phone')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="03xx-xxxxxxx"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="supplier@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              {...register('address')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Address"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
