import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { batchesApi } from '../../api/batches';
import { suppliersApi } from '../../api/suppliers';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { Batch, CreateBatchForm } from '../../types';

const schema = z.object({
  batchNumber: z.string().trim().min(1, 'Batch number is required').max(100),
  supplierId: z.string().optional(),
  receivedAt: z.string().optional(),
  notes: z.string().max(1000).optional(),
});
type FormData = z.infer<typeof schema>;

const BATCHES_KEY = ['batches'] as const;

export default function BatchesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const canWrite = permissions.includes('write:inventory');
  const canReadSuppliers = permissions.includes('read:purchases');

  const { data, isLoading } = useQuery({
    queryKey: [...BATCHES_KEY, { page, search }],
    queryFn: () => batchesApi.getAll({ page, limit: 20, search: search || undefined }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'batch-form'],
    queryFn: () => suppliersApi.getAll({ limit: 500 }).then((r) => r.data),
    enabled: modalOpen && canReadSuppliers,
  });

  const save = useMutation({
    mutationFn: (payload: CreateBatchForm) =>
      editing ? batchesApi.update(editing.id, payload) : batchesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BATCHES_KEY });
      showNotification(editing ? 'Batch updated' : 'Batch created', 'success');
      setModalOpen(false);
    },
    onError: (err: { message?: string }) => setFormError(err?.message ?? 'Could not save batch'),
  });

  const del = useMutation({
    mutationFn: (id: string) => batchesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BATCHES_KEY });
      showNotification('Batch deleted', 'success');
    },
    onError: (err: { message?: string }) => showNotification(err?.message ?? 'Could not delete batch', 'error'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const batches = data?.data ?? [];
  const meta = data?.meta;

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ batchNumber: '', supplierId: '', receivedAt: '', notes: '' });
    setModalOpen(true);
  }

  function openEdit(batch: Batch) {
    setEditing(batch);
    setFormError(null);
    reset({
      batchNumber: batch.batchNumber,
      supplierId: batch.supplierId ?? '',
      receivedAt: batch.receivedAt ? batch.receivedAt.slice(0, 10) : '',
      notes: batch.notes ?? '',
    });
    setModalOpen(true);
  }

  function onSubmit(form: FormData) {
    setFormError(null);
    save.mutate({
      batchNumber: form.batchNumber.trim(),
      // null clears the supplier on edit; omitted on create
      supplierId: form.supplierId || (editing ? null : undefined),
      receivedAt: form.receivedAt ? new Date(form.receivedAt).toISOString() : undefined,
      notes: form.notes?.trim() || undefined,
    });
  }

  function onDelete(batch: Batch) {
    if ((batch._count?.rolls ?? 0) > 0) {
      showNotification('This batch has rolls and cannot be deleted', 'error');
      return;
    }
    if (!confirm(`Delete batch "${batch.batchNumber}"?`)) return;
    del.mutate(batch.id);
  }

  // Keep the current supplier selectable even if the list could not be loaded.
  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }));
  if (editing?.supplier && !supplierOptions.some((o) => o.value === editing.supplier!.id)) {
    supplierOptions.unshift({ value: editing.supplier.id, label: editing.supplier.name });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-500 mt-1">Purchase batches / dye-lots for fabric rolls</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Batch
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search batch number…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No batches yet</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Batch Number</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Rolls</th>
                  <th className="px-4 py-3 text-left">Received</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                  {canWrite && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{batch.batchNumber}</td>
                    <td className="px-4 py-3 text-gray-500">{batch.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{batch._count?.rolls ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {batch.receivedAt ? new Date(batch.receivedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{batch.notes ?? '—'}</td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(batch)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(batch)}
                            disabled={(batch._count?.rolls ?? 0) > 0}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={(batch._count?.rolls ?? 0) > 0 ? 'Batch has rolls and cannot be deleted' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Batch' : 'New Batch'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Batch Number" required error={errors.batchNumber?.message} {...register('batchNumber')} />
          {(canReadSuppliers || editing?.supplier) && (
            <Select label="Supplier" placeholder="No supplier" options={supplierOptions} {...register('supplierId')} />
          )}
          <Input label="Received On" type="date" {...register('receivedAt')} />
          <Input label="Notes" error={errors.notes?.message} {...register('notes')} />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save Changes' : 'Create Batch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
