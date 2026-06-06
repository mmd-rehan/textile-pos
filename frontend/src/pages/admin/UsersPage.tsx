import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  Edit2,
  Key,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserX,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { rolesApi } from '../../api/roles';
import { usersApi } from '../../api/users';
import Modal from '../../components/ui/Modal';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { AdminRole, AdminUser } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-red-100 text-red-700',
};

// ── Create / edit modal ──────────────────────────────────────────────────────

interface UserFormProps {
  user?: AdminUser;
  roles: AdminRole[];
  onClose: () => void;
}

function UserFormModal({ user, roles, onClose }: UserFormProps) {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const isEdit = !!user;

  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
    user?.roles.map((r) => r.id) ?? [],
  );
  const [errors, setErrors] = useState<string[]>([]);

  const createMut = useMutation({
    mutationFn: () =>
      usersApi.create({ username, email, password, roleIds: selectedRoleIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      showNotification('User created.', 'success');
      onClose();
    },
    onError: (e: any) => setErrors([e?.message ?? 'Failed to create user']),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      await usersApi.update(user!.id, { email });
      await usersApi.assignRoles(user!.id, selectedRoleIds);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      showNotification('User updated.', 'success');
      onClose();
    },
    onError: (e: any) => setErrors([e?.message ?? 'Failed to update user']),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  function validate() {
    const errs: string[] = [];
    if (!isEdit && !username.trim()) errs.push('Username is required.');
    if (!email.trim()) errs.push('Email is required.');
    if (!isEdit && password.length < 8) errs.push('Password must be at least 8 characters.');
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    if (isEdit) updateMut.mutate();
    else createMut.mutate();
  }

  function toggleRole(id: string) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {e}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3">
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. john_doe"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="user@example.com"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Min. 8 characters"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <ShieldCheck className="inline w-4 h-4 mr-1 text-gray-400" />
          Roles
        </label>
        <div className="grid grid-cols-2 gap-2">
          {roles.map((role) => {
            const active = selectedRoleIds.includes(role.id);
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.id)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {active ? (
                    <CheckCircle className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                  <span className="font-medium">{role.name}</span>
                </div>
                {role.description && (
                  <p className="text-xs text-gray-400 mt-0.5 ml-5 line-clamp-1">{role.description}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </div>
  );
}

// ── Password change modal ────────────────────────────────────────────────────

function ChangePasswordModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => usersApi.changePassword(user.id, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      showNotification('Password changed.', 'success');
      onClose();
    },
    onError: (e: any) => setError(e?.message ?? 'Failed to change password'),
  });

  function handleSubmit() {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    mut.mutate();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      <p className="text-sm text-gray-600">
        Setting a new password for <strong>{user.username}</strong>.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Min. 8 characters"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Repeat password"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={mut.isPending}
          className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60"
        >
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Change Password
        </button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const qc = useQueryClient();
  const { showNotification } = useAppStore();
  const { user: currentUser } = useAuthStore();

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.getAll(),
    select: (r) => r.data,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => rolesApi.getAll(),
    select: (r) => r.data,
  });

  const toggleStatus = useMutation({
    mutationFn: (u: AdminUser) =>
      usersApi.update(u.id, { status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      showNotification('User status updated.', 'success');
    },
    onError: () => showNotification('Failed to update status.', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      showNotification('User deleted.', 'success');
      setConfirmDelete(null);
    },
    onError: (e: any) => {
      showNotification(e?.message ?? 'Failed to delete user.', 'error');
      setConfirmDelete(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage system users and role assignments</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          New User
        </button>
      </div>

      {/* Roles summary */}
      {roles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Roles in system</p>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <div key={r.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
                <span className="text-sm font-medium text-gray-800">{r.name}</span>
                <span className="text-xs text-gray-400">({r.userCount} users)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
            <UserX className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No users found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Roles</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900">{u.username}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-gray-400">No role</span>
                        ) : (
                          u.roles.map((r) => (
                            <span key={r.id} className="text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded">
                              {r.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${STATUS_COLORS[u.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditUser(u)}
                          title="Edit user"
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPwUser(u)}
                          title="Change password"
                          className="p-1.5 text-gray-400 hover:text-amber-600 rounded"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        {!isSelf && (
                          <>
                            <button
                              onClick={() => toggleStatus.mutate(u)}
                              title={u.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}
                              className="p-1.5 text-gray-400 hover:text-orange-600 rounded"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(u)}
                              title="Delete user"
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create User">
        <UserFormModal roles={roles} onClose={() => setShowCreate(false)} />
      </Modal>

      {/* Edit modal */}
      {editUser && (
        <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit — ${editUser.username}`}>
          <UserFormModal user={editUser} roles={roles} onClose={() => setEditUser(null)} />
        </Modal>
      )}

      {/* Change password modal */}
      {pwUser && (
        <Modal open={!!pwUser} onClose={() => setPwUser(null)} title="Change Password">
          <ChangePasswordModal user={pwUser} onClose={() => setPwUser(null)} />
        </Modal>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete User">
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Delete {confirmDelete.username}?</p>
                <p className="text-xs text-red-600 mt-0.5">
                  This action cannot be undone. The user will lose all access immediately.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                disabled={deleteMut.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <X className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
