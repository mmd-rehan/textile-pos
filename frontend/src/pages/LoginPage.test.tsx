import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuthStore } from '../store/useAuthStore';
import { renderWithProviders, signIn, signOut } from '../test/render';
import LoginPage from './LoginPage';

vi.mock('../api/auth', () => ({ authApi: { login: vi.fn(), logout: vi.fn(), me: vi.fn() } }));

describe('Login', () => {
  beforeEach(() => signOut());

  it('signs in, stores the session and returns to the page the user came from', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'jwt-123',
      user: { id: 'u1', username: 'cashier', email: 'c@x', status: 'ACTIVE', roles: [], permissions: ['write:sales'] },
    } as any);
    const { user } = renderWithProviders(<LoginPage />, { route: '/login', path: '/login' });

    await user.type(screen.getByLabelText('Username or Email'), '  cashier ');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(authApi.login).toHaveBeenCalledWith('cashier', 'secret-pass');
    expect(useAuthStore.getState()).toMatchObject({ token: 'jwt-123', isAuthenticated: true });
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('shows the server error and stays signed out on bad credentials', async () => {
    vi.mocked(authApi.login).mockRejectedValue({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    const { user } = renderWithProviders(<LoginPage />, { route: '/login', path: '/login' });

    await user.type(screen.getByLabelText('Username or Email'), 'cashier');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});

describe('ProtectedRoute', () => {
  it('redirects to login when signed out', () => {
    signOut();
    renderWithProviders(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>,
      { route: '/purchases', path: '/purchases', extraRoutes: [{ path: '/login', element: <p>login page</p> }] },
    );
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('shows Access Denied without the required permission', () => {
    signIn(['read:sales']);
    renderWithProviders(
      <ProtectedRoute permission="write:purchases">
        <p>secret</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders the page with the permission', () => {
    signIn(['write:purchases']);
    renderWithProviders(
      <ProtectedRoute permission="write:purchases">
        <p>secret</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
