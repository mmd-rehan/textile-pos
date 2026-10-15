import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { settingsApi } from '../../api/settings';
import { CASHIER_PERMISSIONS, renderWithProviders, signIn } from '../../test/render';
import Shell from './Shell';

vi.mock('../../api/auth', () => ({ authApi: { logout: vi.fn() } }));
vi.mock('../../api/settings', () => ({ settingsApi: { getFlags: vi.fn() } }));

const ALL_FLAGS = { wholesalePos: true, barcodeGeneration: true, wastageTracking: true, remnantManagement: true, creditSales: true };

const INVENTORY_STAFF = [
  'read:products', 'write:products', 'read:inventory', 'write:inventory', 'auth.me', 'barcode.lookup', 'remnants.view',
];
const ADMIN = [
  ...CASHIER_PERMISSIONS, 'read:purchases', 'write:purchases', 'read:inventory', 'write:inventory',
  'read:settings', 'write:settings', 'read:users', 'write:users', 'write:products',
];

function renderShell() {
  renderWithProviders(<Shell />);
  return within(screen.getByRole('navigation'));
}

describe('Sidebar navigation by role', () => {
  beforeEach(() => {
    vi.mocked(settingsApi.getFlags).mockResolvedValue({ data: ALL_FLAGS });
  });

  it('shows a cashier only selling and customer screens', async () => {
    signIn(CASHIER_PERMISSIONS);
    const nav = renderShell();

    expect(nav.getByRole('link', { name: /Retail POS/ })).toBeInTheDocument();
    expect(nav.getByRole('link', { name: /Sales History/ })).toBeInTheDocument();
    expect(await nav.findByRole('link', { name: /Wholesale POS/ })).toBeInTheDocument();
    expect(nav.getByRole('button', { name: /Customers/ })).toBeInTheDocument();
    for (const hidden of [/Purchases/, /Inventory/, /Admin/]) {
      expect(nav.queryByRole('button', { name: hidden })).not.toBeInTheDocument();
    }
  });

  it('hides Wholesale POS when the feature flag is off', async () => {
    vi.mocked(settingsApi.getFlags).mockResolvedValue({ data: { ...ALL_FLAGS, wholesalePos: false } });
    signIn(CASHIER_PERMISSIONS);
    const nav = renderShell();

    await vi.waitFor(() => expect(settingsApi.getFlags).toHaveBeenCalled());
    expect(nav.queryByRole('link', { name: /Wholesale POS/ })).not.toBeInTheDocument();
  });

  it('shows inventory staff the stock screens but not selling, purchasing or admin', () => {
    signIn(INVENTORY_STAFF);
    const nav = renderShell();

    expect(nav.getByRole('button', { name: /Inventory/ })).toBeInTheDocument();
    expect(nav.getByRole('button', { name: /Catalog/ })).toBeInTheDocument();
    expect(nav.queryByRole('link', { name: /Retail POS/ })).not.toBeInTheDocument();
    expect(nav.queryByRole('button', { name: /Purchases/ })).not.toBeInTheDocument();
    expect(nav.queryByRole('button', { name: /Admin/ })).not.toBeInTheDocument();
  });

  it('shows an admin every section', () => {
    signIn(ADMIN);
    const nav = renderShell();
    for (const section of [/Customers/, /Purchases/, /Inventory/, /Catalog/, /Reports/, /Admin/]) {
      expect(nav.getByRole('button', { name: section })).toBeInTheDocument();
    }
  });
});
