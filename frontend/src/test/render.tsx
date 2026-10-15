import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { AuthUser } from '../types';

export const CASHIER_PERMISSIONS = [
  'read:products', 'read:sales', 'write:sales', 'auth.me', 'sales.create_retail', 'sales.view',
  'customers.create_basic', 'ledger.view_customer', 'ledger.record_payment', 'barcode.lookup', 'remnants.view',
];

export function signIn(permissions: string[], username = 'tester') {
  const user: AuthUser = {
    id: 'u1',
    username,
    email: `${username}@test.local`,
    status: 'ACTIVE',
    roles: [],
    permissions,
  };
  useAuthStore.setState({ token: 'test-token', user, isAuthenticated: true });
}

export function signOut() {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
}

/** Shows the current path so tests can assert on redirects. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

interface Options {
  route?: string;
  path?: string;
  extraRoutes?: { path: string; element: ReactElement }[];
}

export function renderWithProviders(ui: ReactElement, { route = '/', path = '*', extraRoutes = [] }: Options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path={path} element={ui} />
          {extraRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), queryClient, ...result };
}

/**
 * The POS returns focus to the barcode field on a 50 ms timer after a scan so
 * the next scan works hands-free. Timers fire in order, so waiting on a longer
 * timer started afterwards guarantees those have run before the test types
 * into another field.
 */
export function settleBarcodeRefocus() {
  return new Promise((resolve) => setTimeout(resolve, 80));
}
