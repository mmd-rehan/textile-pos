import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rollsApi } from '../../api/rolls';
import { settingsApi } from '../../api/settings';
import { useAppStore } from '../../store/useAppStore';
import { renderWithProviders, signIn } from '../../test/render';
import ReconcilePage from './ReconcilePage';

vi.mock('../../api/rolls', () => ({ rollsApi: { getOne: vi.fn(), reconcile: vi.fn() } }));
vi.mock('../../api/settings', () => ({ settingsApi: { getFlags: vi.fn() } }));

const ROLL = {
  id: 'roll-1',
  rollNumber: 'R-0001',
  status: 'IN_STOCK',
  originalLengthYard: '100.0000',
  remainingLengthYard: '50.0000',
  product: { id: 'p1', name: 'Cotton Voile' },
};

function renderPage() {
  return renderWithProviders(<ReconcilePage />, {
    route: '/inventory/rolls/roll-1/reconcile',
    path: '/inventory/rolls/:id/reconcile',
  });
}

describe('Roll reconciliation form', () => {
  beforeEach(() => {
    signIn(['read:inventory', 'write:inventory']);
    useAppStore.setState({ notification: null });
    vi.mocked(rollsApi.getOne).mockResolvedValue({ data: ROLL } as any);
    vi.mocked(settingsApi.getFlags).mockResolvedValue({ data: { remnantManagement: true } } as any);
  });

  it('shows a loss and requires a reason before saving', async () => {
    const { user } = renderPage();
    await user.type(await screen.findByLabelText(/Physical Remaining Length/), '47.5');

    expect(screen.getByText(/2\.50 yd missing/)).toBeInTheDocument();
    expect(screen.getByText('Reason is required when there is a discrepancy.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save reconciliation/i }));
    expect(rollsApi.reconcile).not.toHaveBeenCalled();
  });

  it('sends the counted length as a 4-place decimal with the reason', async () => {
    vi.mocked(rollsApi.reconcile).mockResolvedValue({ data: { reconciliation: { reconciliationResult: 'LOSS' } } });
    const { user } = renderPage();
    await user.type(await screen.findByLabelText(/Physical Remaining Length/), '47.5');
    await user.type(screen.getByLabelText(/Reason/), 'Recount short');
    await user.click(screen.getByRole('button', { name: /save reconciliation/i }));

    await waitFor(() =>
      expect(rollsApi.reconcile).toHaveBeenCalledWith(
        'roll-1',
        expect.objectContaining({ physicalLengthYard: '47.5000', reason: 'Recount short', createRemnant: false }),
      ),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/inventory/rolls/roll-1');
  });

  it('does not ask for a reason when the count matches', async () => {
    vi.mocked(rollsApi.reconcile).mockResolvedValue({ data: { reconciliation: { reconciliationResult: 'MATCHED' } } });
    const { user } = renderPage();
    await user.type(await screen.findByLabelText(/Physical Remaining Length/), '50');

    expect(screen.getByText(/Measurements match/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save reconciliation/i }));
    await waitFor(() =>
      expect(rollsApi.reconcile).toHaveBeenCalledWith('roll-1', expect.objectContaining({ reason: 'No discrepancy' })),
    );
  });

  it('rejects more than 4 decimal places', async () => {
    const { user } = renderPage();
    await user.type(await screen.findByLabelText(/Physical Remaining Length/), '47.12345');

    expect(screen.getByText(/at most 4 decimal places/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save reconciliation/i })).toBeDisabled();
  });

  it('shows the server reason when saving fails', async () => {
    vi.mocked(rollsApi.reconcile).mockRejectedValue({
      code: 'INVALID_ROLL_STATUS',
      message: 'Cannot reconcile a roll with status SOLD',
    });
    const { user } = renderPage();
    await user.type(await screen.findByLabelText(/Physical Remaining Length/), '50');
    await user.click(screen.getByRole('button', { name: /save reconciliation/i }));

    await waitFor(() =>
      expect(useAppStore.getState().notification).toEqual({
        message: 'Cannot reconcile a roll with status SOLD',
        type: 'error',
      }),
    );
  });
});
