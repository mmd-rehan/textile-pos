import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currenciesApi } from '../../api/currencies';
import { purchasesApi } from '../../api/purchases';
import { settingsApi } from '../../api/settings';
import { renderWithProviders, signIn } from '../../test/render';
import PurchaseCreatePage from './PurchaseCreatePage';

vi.mock('../../api/settings', () => ({ settingsApi: { getCompany: vi.fn() } }));
vi.mock('../../api/suppliers', () => ({
  suppliersApi: { getAll: vi.fn().mockResolvedValue({ data: [{ id: 'sup-1', name: 'Dubai Textile Traders' }], meta: {} }) },
}));
vi.mock('../../api/batches', () => ({ batchesApi: { getAll: vi.fn().mockResolvedValue({ data: [], meta: {} }) } }));
vi.mock('../../api/currencies', () => ({ currenciesApi: { getExchangeRates: vi.fn() } }));
vi.mock('../../api/purchases', () => ({ purchasesApi: { create: vi.fn(), uploadAttachment: vi.fn() } }));
vi.mock('../../api/products', () => ({
  colorsApi: { getAll: vi.fn().mockResolvedValue({ data: [] }), create: vi.fn() },
  designsApi: { getAll: vi.fn().mockResolvedValue({ data: [] }), create: vi.fn() },
}));
// The real picker searches the server; a stand-in that picks a fabric roll product.
vi.mock('../../components/purchases/PurchaseProductPicker', () => ({
  default: ({ onSelect }: { onSelect: (p: unknown) => void }) => (
    <button type="button" onClick={() => onSelect({ id: 'prod-1', name: 'Cotton Voile', productType: 'FABRIC_ROLL' })}>
      pick product
    </button>
  ),
}));

async function fillRollRow(user: ReturnType<typeof renderWithProviders>['user'], row: number, length: string, price: string) {
  await user.click(screen.getAllByRole('button', { name: 'pick product' })[row - 1]);
  await user.type(screen.getByLabelText(`Row ${row} roll length (yd)`), length);
  await user.type(screen.getByLabelText(`Row ${row} purchase price per yard`), price);
  await user.type(screen.getByLabelText(`Row ${row} sale price per yard`), '5');
}

const post = () => screen.getByRole('button', { name: /post purchase/i });

describe('New purchase — roll entry', () => {
  beforeEach(() => {
    signIn(['read:purchases', 'write:purchases']);
    vi.mocked(settingsApi.getCompany).mockResolvedValue({ data: { company_currency: 'USD' } });
    vi.mocked(currenciesApi.getExchangeRates).mockResolvedValue({ data: [] } as any);
  });

  it('posts several rolls with their own lengths and shows the total', async () => {
    vi.mocked(purchasesApi.create).mockResolvedValue({ data: { id: 'po-1', poNumber: 'PO-1' } } as any);
    const { user } = renderWithProviders(<PurchaseCreatePage />);
    await user.selectOptions(await screen.findByLabelText(/Supplier/), await screen.findByRole('option', { name: 'Dubai Textile Traders' }));

    await fillRollRow(user, 1, '45.5', '2.10');
    await user.click(screen.getByRole('button', { name: /add row/i }));
    await fillRollRow(user, 2, '60', '2');

    // 45.5 × 2.10 + 60 × 2 = 95.55 + 120
    expect(screen.getAllByText(/215\.55/).length).toBeGreaterThan(0);
    await user.click(post());

    await waitFor(() => expect(purchasesApi.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(purchasesApi.create).mock.calls[0][0]).toMatchObject({
      supplierId: 'sup-1',
      currency: 'USD',
      exchangeRateToBaseCurrency: undefined,
      rolls: [
        { productId: 'prod-1', originalLengthYard: 45.5, purchasePricePerYard: 2.1, salePricePerYard: 5 },
        { productId: 'prod-1', originalLengthYard: 60, purchasePricePerYard: 2, salePricePerYard: 5 },
      ],
    });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/purchases/po-1'));
  });

  it('requires an exchange rate for a foreign currency when none is stored, instead of using 1', async () => {
    const { user } = renderWithProviders(<PurchaseCreatePage />);
    await user.selectOptions(await screen.findByLabelText(/Supplier/), await screen.findByRole('option', { name: 'Dubai Textile Traders' }));
    await user.selectOptions(screen.getByLabelText(/Purchase Currency/), 'AED');
    await fillRollRow(user, 1, '10', '3');

    await waitFor(() => expect(screen.getByLabelText('Exchange rate AED to USD')).toHaveValue(null));
    await user.click(post());

    expect(await screen.findByText('Enter how many USD one AED is worth')).toBeInTheDocument();
    expect(purchasesApi.create).not.toHaveBeenCalled();
  });

  it('uses a stored exchange rate and sends it with the purchase', async () => {
    vi.mocked(currenciesApi.getExchangeRates).mockResolvedValue({
      data: [{ fromCurrencyCode: 'AED', toCurrencyCode: 'USD', rate: '0.2723' }],
    } as any);
    vi.mocked(purchasesApi.create).mockResolvedValue({ data: { id: 'po-2', poNumber: 'PO-2' } } as any);
    const { user } = renderWithProviders(<PurchaseCreatePage />);
    await user.selectOptions(await screen.findByLabelText(/Supplier/), await screen.findByRole('option', { name: 'Dubai Textile Traders' }));
    await user.selectOptions(screen.getByLabelText(/Purchase Currency/), 'AED');
    await fillRollRow(user, 1, '10', '3');

    await waitFor(() => expect(screen.getByLabelText('Exchange rate AED to USD')).toHaveValue(0.2723));
    await user.click(post());

    await waitFor(() =>
      expect(purchasesApi.create).toHaveBeenCalledWith(expect.objectContaining({ currency: 'AED', exchangeRateToBaseCurrency: 0.2723 })),
    );
  });

  it('does not allow paying more than the purchase total', async () => {
    const { user } = renderWithProviders(<PurchaseCreatePage />);
    await user.selectOptions(await screen.findByLabelText(/Supplier/), await screen.findByRole('option', { name: 'Dubai Textile Traders' }));
    await fillRollRow(user, 1, '10', '2'); // total 20
    await user.clear(screen.getByLabelText('Amount paid now'));
    await user.type(screen.getByLabelText('Amount paid now'), '25');
    await user.click(post());

    expect(await screen.findByText('Paid amount cannot be more than the purchase total')).toBeInTheDocument();
    expect(purchasesApi.create).not.toHaveBeenCalled();
  });
});
