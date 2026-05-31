import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useDesigns, useCreateDesign, useDeleteDesign, useUpdateDesign } from '../../hooks/useDesigns';
import type { Design, CreateDesignForm } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  designCode: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

export default function DesignsPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Design | null>(null);

  const { data: designs = [], isLoading } = useDesigns(search || undefined);
  const create = useCreateDesign();
  const update = useUpdateDesign();
  const del = useDeleteDesign();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    setEditing(null);
    reset({ name: '', designCode: '', description: '' });
    setModalOpen(true);
  }

  function openEdit(design: Design) {
    setEditing(design);
    reset({ name: design.name, designCode: design.designCode ?? '', description: design.description ?? '' });
    setModalOpen(true);
  }

  async function onSubmit(data: FormData) {
    const payload: CreateDesignForm = {
      name: data.name,
      designCode: data.designCode || undefined,
      description: data.description || undefined,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    setModalOpen(false);
    reset();
  }

  async function onDelete(design: Design) {
    if (!confirm(`Delete design "${design.name}"? This cannot be undone.`)) return;
    del.mutate(design.id);
  }

  async function toggleActive(design: Design) {
    await update.mutateAsync({ id: design.id, data: { isActive: !design.isActive } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designs</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fabric design / pattern catalog</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Design
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search designs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
        ) : designs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No designs found.{' '}
            <button onClick={openCreate} className="text-primary-600 hover:underline">
              Add the first one.
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {designs.map((design) => (
                <tr key={design.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{design.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{design.designCode ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {design.description ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(design)}>
                      <Badge variant={design.isActive ? 'green' : 'gray'}>
                        {design.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(design)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(design)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); reset(); }}
        title={editing ? 'Edit Design' : 'New Design'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input {...register('name')} placeholder="e.g. Floral Print" error={errors.name?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Design Code</label>
            <Input {...register('designCode')} placeholder="e.g. FLR-001" error={errors.designCode?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Optional description…"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Save Changes' : 'Create Design'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
