import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Scissors, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { remnantsApi } from '../../api/remnants';
import { rollsApi } from '../../api/rolls';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { useAppStore } from '../../store/useAppStore';

type RemnantStatus = 'AVAILABLE' | 'SOLD' | 'DISCARDED';

const STATUS_BADGE: Record<RemnantStatus, { label: string; variant: 'green' | 'gray' | 'red' }> = {
  AVAILABLE: { label: 'Available', variant: 'green' },
  SOLD: { label: 'Sold', variant: 'gray' },
  DISCARDED: { label: 'Discarded', variant: 'red' },
};

interface RollOption {
  id: string;
  rollNumber: string;
  barcode: string | null;
  remainingLengthYard: string;
  status: string;
  product?: { name: string };
}

function RollPicker({
  value,
  onChange,
}: {
  value: RollOption | null;
  onChange: (roll: RollOption | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['roll-search', search],
    queryFn: () => rollsApi.getAll({ search: search || undefined, limit: 8 }),
    enabled: open,
    placeholderData: (prev) => prev,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rolls: RollOption[] = (data?.data ?? []).map((r: any) => ({
    id: r.id,
    rollNumber: r.rollNumber,
    barcode: r.barcode ?? null,
    remainingLengthYard: r.remainingLengthYard,
    status: r.status,
    product: r.product,
  }));

  const handleSelect = (roll: RollOption) => {
    onChange(roll);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearch('');
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-primary-300 bg-primary-50 rounded-lg">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 font-mono truncate">{value.rollNumber}</p>
          <p className="text-xs text-gray-500 truncate">
            {value.product?.name} · {parseFloat(value.remainingLengthYard).toFixed(2)} yd remaining
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="p-1 hover:bg-primary-100 rounded text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Search by roll number, barcode, or product…"
          autoComplete="off"
        />
        <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {isFetching && rolls.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          ) : rolls.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">No rolls found</div>
          ) : (
            <ul className="max-h-52 overflow-y-auto divide-y divide-gray-100">
              {rolls.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 font-mono">{r.rollNumber}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {r.product?.name}{r.barcode ? ` · ${r.barcode}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono text-gray-700">
                        {parseFloat(r.remainingLengthYard).toFixed(2)} yd
                      </p>
                      <p className={`text-xs ${r.status === 'IN_STOCK' ? 'text-green-600' : 'text-gray-400'}`}>
                        {r.status}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CreateRemnantModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showNotification } = useAppStore();

  const [selectedRoll, setSelectedRoll] = useState<RollOption | null>(null);
  const [form, setForm] = useState({
    lengthYard: '',
    reason: '',
    barcode: '',
    salePrice: '',
  });

  const { mutate, isPending } = useMutation({
    mutationFn: remnantsApi.create,
    onSuccess: () => {
      showNotification('Remnant created', 'success');
      queryClient.invalidateQueries({ queryKey: ['remnants'] });
      queryClient.invalidateQueries({ queryKey: ['rolls'] });
      if (selectedRoll) {
        queryClient.invalidateQueries({ queryKey: ['roll', selectedRoll.id] });
        queryClient.invalidateQueries({ queryKey: ['roll-movements', selectedRoll.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (err: any) => {
      showNotification(err?.response?.data?.message ?? 'Failed to create remnant', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoll) {
      showNotification('Please select a roll', 'error');
      return;
    }
    const len = parseFloat(form.lengthYard);
    const maxLen = parseFloat(selectedRoll.remainingLengthYard);
    if (isNaN(len) || len <= 0) {
      showNotification('Remnant length must be greater than zero', 'error');
      return;
    }
    if (len > maxLen) {
      showNotification(`Length cannot exceed roll remaining (${maxLen.toFixed(2)} yd)`, 'error');
      return;
    }
    mutate({
      rollId: selectedRoll.id,
      lengthYard: len.toFixed(4),
      reason: form.reason,
      barcode: form.barcode || undefined,
      salePrice: form.salePrice || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Create Remnant</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Roll <span className="text-red-500">*</span>
            </label>
            <RollPicker value={selectedRoll} onChange={setSelectedRoll} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Length (yards) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={selectedRoll ? parseFloat(selectedRoll.remainingLengthYard) : undefined}
              value={form.lengthYard}
              onChange={(e) => setForm({ ...form, lengthYard: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              placeholder="e.g. 2.50"
            />
            {selectedRoll && (
              <p className="mt-1 text-xs text-gray-500">
                Max: <span className="font-mono">{parseFloat(selectedRoll.remainingLengthYard).toFixed(2)} yd</span> remaining on this roll
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              required
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Why is this being added as a remnant?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Barcode</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sale Price / yd</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Create Remnant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RemnantsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['remnants', page, search, statusFilter],
    queryFn: () =>
      remnantsApi.getAll({
        page,
        limit: 30,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const remnants = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {showCreate && <CreateRemnantModal onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remnants</h1>
          <p className="text-sm text-gray-500 mt-0.5">Small leftover fabric pieces traceable to original rolls</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" /> Add Remnant
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by barcode, product, or roll number…"
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="SOLD">Sold</option>
          <option value="DISCARDED">Discarded</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : remnants.length === 0 ? (
          <div className="p-12 text-center">
            <Scissors className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No remnants found.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm text-primary-600 hover:underline"
            >
              Add the first remnant
            </button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Source Roll</th>
                  <th className="px-4 py-3 text-left">Batch</th>
                  <th className="px-4 py-3 text-right">Length</th>
                  <th className="px-4 py-3 text-right">Sale Price</th>
                  <th className="px-4 py-3 text-left">Barcode</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {remnants.map((r: any) => {
                  const badge = STATUS_BADGE[r.status as RemnantStatus] ?? { label: r.status, variant: 'gray' };
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-gray-900 font-medium">{r.product?.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{r.product?.productCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="text-primary-600 hover:underline font-mono text-xs"
                          onClick={() => navigate(`/inventory/rolls/${r.originalRoll?.id}`)}
                        >
                          {r.originalRoll?.rollNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.batch?.batchNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {parseFloat(r.lengthYard).toFixed(2)} yd
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {r.salePrice ? parseFloat(r.salePrice).toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.barcode ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
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
    </div>
  );
}
