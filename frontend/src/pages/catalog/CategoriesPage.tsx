import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../../hooks/useCategories';
import type { Category, CreateCategoryForm } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useCategories(search || undefined);
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const topLevel = categories.filter((c) => !c.parentId);
  const parentOptions = categories
    .filter((c) => !editing || c.id !== editing.id)
    .map((c) => ({ value: c.id, label: c.name }));

  function openCreate() {
    setEditing(null);
    reset({ name: '', description: '', parentId: '' });
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    reset({ name: cat.name, description: cat.description ?? '', parentId: cat.parentId ?? '' });
    setModalOpen(true);
  }

  async function onSubmit(data: FormData) {
    const payload: CreateCategoryForm = {
      name: data.name,
      description: data.description || undefined,
      parentId: data.parentId || undefined,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    setModalOpen(false);
    reset();
  }

  async function onDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    del.mutate(cat.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Organise products into categories</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Category
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No categories yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Parent</th>
                <th className="px-4 py-3 text-left">Products</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {cat.parentId && <ChevronRight className="inline w-3.5 h-3.5 text-gray-400 mr-1" />}
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{cat.parent?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{cat._count?.products ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={cat.isActive ? 'green' : 'gray'}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(cat)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'New Category'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" required error={errors.name?.message} {...register('name')} />
          <Input label="Description" {...register('description')} />
          <Select
            label="Parent Category"
            placeholder="None (top-level)"
            options={parentOptions}
            {...register('parentId')}
          />
          {editing && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register('isActive' as any)} className="rounded" />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
