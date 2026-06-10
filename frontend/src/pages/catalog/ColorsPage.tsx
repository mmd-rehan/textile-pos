import { zodResolver } from '@hookform/resolvers/zod';
import { Palette, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useColors, useCreateColor, useDeleteColor, useUpdateColor } from '../../hooks/useColors';
import type { Color, CreateColorForm } from '../../types';

function normalizeHexColor(value: string): string {
  return value.toUpperCase();
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9A-F]{6}$/.test(value);
}

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  colorCode: z.string().max(20).optional(),
  hexCode: z
    .string()
    .regex(/^#[0-9A-F]{6}$/, 'Must be a valid hex color (e.g. #FF5733)')
    .optional()
    .or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export default function ColorsPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Color | null>(null);

  const { data: colors = [], isLoading } = useColors(search || undefined);
  const create = useCreateColor();
  const update = useUpdateColor();
  const del = useDeleteColor();

  const lastPickerHex = useRef('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const hexCode = watch('hexCode') ?? '';

  function openCreate() {
    setEditing(null);
    lastPickerHex.current = '';
    reset({ name: '', colorCode: '', hexCode: '' });
    setModalOpen(true);
  }

  function openEdit(color: Color) {
    setEditing(color);
    lastPickerHex.current = color.hexCode ?? '';
    reset({ name: color.name, colorCode: color.colorCode ?? '', hexCode: color.hexCode ?? '' });
    setModalOpen(true);
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newHex = normalizeHexColor(e.target.value);
    const currentCode = getValues('colorCode') ?? '';
    if (!currentCode || currentCode === lastPickerHex.current) {
      setValue('colorCode', newHex, { shouldValidate: false, shouldDirty: true });
    }
    lastPickerHex.current = newHex;
    setValue('hexCode', newHex, { shouldValidate: true, shouldDirty: true });
  }

  async function onSubmit(data: FormData) {
    const payload: CreateColorForm = {
      name: data.name,
      colorCode: data.colorCode || undefined,
      hexCode: data.hexCode || undefined,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    setModalOpen(false);
    reset();
  }

  async function onDelete(color: Color) {
    if (!confirm(`Delete color "${color.name}"? This cannot be undone.`)) return;
    del.mutate(color.id);
  }

  async function toggleActive(color: Color) {
    await update.mutateAsync({ id: color.id, data: { isActive: !color.isActive } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colors</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fabric color catalog</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Color
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search colors…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
        ) : colors.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No colors found.{' '}
            <button onClick={openCreate} className="text-primary-600 hover:underline">
              Add the first one.
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Color</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Hex</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {colors.map((color) => (
                <tr key={color.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                    {color.hexCode ? (
                      <span
                        className="w-5 h-5 rounded-full border border-gray-200 shrink-0"
                        style={{ backgroundColor: color.hexCode }}
                      />
                    ) : (
                      <Palette className="w-5 h-5 text-gray-300 shrink-0" />
                    )}
                    {color.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{color.colorCode ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{color.hexCode ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(color)}>
                      <Badge variant={color.isActive ? 'green' : 'gray'}>
                        {color.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(color)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(color)}
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
        title={editing ? 'Edit Color' : 'New Color'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input {...register('name')} placeholder="e.g. Royal Blue" error={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color Code</label>
              <Controller
                name="colorCode"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="e.g. RB-001"
                    error={errors.colorCode?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hex Code</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={isValidHexColor(hexCode) ? hexCode.toLowerCase() : '#000000'}
                  onChange={handlePickerChange}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded border border-gray-300 p-0.5"
                  title="Pick a color"
                />
                <span
                  className="h-8 w-8 shrink-0 rounded border border-gray-200"
                  style={{ backgroundColor: isValidHexColor(hexCode) ? hexCode : 'transparent' }}
                />
                <Controller
                  name="hexCode"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(normalizeHexColor(e.target.value))}
                      placeholder="#4169E1"
                      className={`min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.hexCode ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
                      }`}
                    />
                  )}
                />
              </div>
              {errors.hexCode && (
                <p className="mt-1 text-xs text-red-500">{errors.hexCode.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Save Changes' : 'Create Color'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
