import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useBrands, useCreateBrand, useDeleteBrand, useUpdateBrand } from '../../hooks/useBrands';
import type { Brand, CreateBrandForm } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

export default function BrandsPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);

  const { data: brands = [], isLoading } = useBrands(search || undefined);
  const create = useCreateBrand();
  const update = useUpdateBrand();
  const del = useDeleteBrand();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    setEditing(null);
    reset({ name: '', description: '' });
    setModalOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    reset({ name: brand.name, description: brand.description ?? '' });
    setModalOpen(true);
  }

  async function onSubmit(data: FormData) {
    const payload: CreateBrandForm = {
      name: data.name,
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

  async function onDelete(brand: Brand) {
    if (!confirm(`Delete brand "${brand.name}"?`)) return;
    del.mutate(brand.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-1">Manage product brands and manufacturers</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Brand
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : brands.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No brands yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Brand</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Products</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{brand.name}</td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{brand.description ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{brand._count?.products ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={brand.isActive ? 'green' : 'gray'}>
                      {brand.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(brand)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(brand)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Brand' : 'New Brand'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" required error={errors.name?.message} {...register('name')} />
          <Input label="Description" {...register('description')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Save Changes' : 'Create Brand'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
