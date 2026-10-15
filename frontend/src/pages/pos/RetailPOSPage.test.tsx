import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inventoryApi } from '../../api/inventory';
import { salesApi } from '../../api/sales';
import { settingsApi } from '../../api/settings';
import { CASHIER_PERMISSIONS, renderWithProviders, settleBarcodeRefocus, signIn } from '../../test/render';
import RetailPOSPage from './RetailPOSPage';

vi.mock('../../api/inventory', () => ({ inventoryApi: { lookupBarcode: vi.fn(), posSearch: vi.fn() } }));
vi.mock('../../api/sales', () => ({ salesApi: { createRetailSale: vi.fn(), getReceipt: vi.fn() } }));
vi.mock('../../api/settings', () => ({ settingsApi: { getTax: vi.fn(), getFlags: vi.fn(), getCompany: vi.fn() } }));
vi.mock('../../api/units', () => ({
  unitsApi: {
    getConversions: vi.fn().mockResolvedValue({
      data: [{ id: 'c1', factor: '1.09361', fromUnit: { abbreviation: 'm' }, toUnit: { abbreviation: 'yd' } }],
    }),
  },
}));
vi.mock('../../api/customers', () => ({
  customersApi: {
    getAll: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    getOne: vi.fn(),
    getOutstanding: vi.fn(),
    create: vi.fn(),
  },
}));

const ROLL = {
  type: 'ROLL',
  blocked: false,
  warning: false,
  statusMessage: null,
  roll: {
    id: 'roll-1',
    rollNumber: 'R-0001',
    barcode: '0828156987886',
    status: 'IN_STOCK',
    originalLengthYard: '100',
    remainingLengthYard: '90',
    salePricePerYard: '5',
    product: { id: 'prod-1', name: 'Cotton Voile', productCode: 'FAB-002' },
    color: null,
    design: null,
  },
};

const invoice = (over: Record<string, unknown> = {}) => ({
  id: 'inv-1',
  invoiceNumber: 'INV-20261015-0007',
  createdAt: '2026-10-15T10:00:00.000Z',
  currencyCode: 'USD',
  totalAmount: '15.00',
  discountAmount: '0.00',
  taxAmount: '0.00',
  netAmount: '15.00',
  paidAmount: '15.00',
  changeAmount: '5.00',
  dueAmount: '0.00',
  saleInvoiceItems: [],
  salePayments: [{ id: 'p1', paymentMethod: 'CASH', amount: '20.00' }],
  ...over,
});

async function scan(user: ReturnType<typeof renderWithProviders>['user'], code = '0828156987886') {
  await user.type(screen.getByLabelText('Barcode'), `${code}{Enter}`);
  await screen.findByText('R-0001');
  await settleBarcodeRefocus();
}

const completeButton = () => screen.getByRole('button', { name: /complete sale/i });

describe('Retail POS', () => {
  beforeEach(() => {
    signIn(CASHIER_PERMISSIONS, 'cashier');
    vi.mocked(settingsApi.getTax).mockResolvedValue({ data: { taxEnabled: false, taxRatePercent: '0', taxLabel: '' } } as any);
    vi.mocked(settingsApi.getFlags).mockResolvedValue({ data: { creditSales: true, wastageTracking: true } } as any);
    vi.mocked(settingsApi.getCompany).mockResolvedValue({ data: { company_currency: 'USD' } });
    vi.mocked(inventoryApi.lookupBarcode).mockResolvedValue({ data: ROLL } as any);
    vi.mocked(salesApi.getReceipt).mockResolvedValue({
      data: { invoice: invoice(), company: { name: 'Test Fabrics', address: '', phone: '' } },
    } as any);
  });

  it('adds a scanned roll to the cart at its sale price', async () => {
    const { user } = renderWithProviders(<RetailPOSPage />);
    await scan(user);

    expect(inventoryApi.lookupBarcode).toHaveBeenCalledWith('0828156987886');
    expect(screen.getByLabelText('Unit price for R-0001')).toHaveValue(5);
    expect(screen.getByText('Cotton Voile')).toBeInTheDocument();
  });

  it('shows why a blocked roll cannot be sold', async () => {
    vi.mocked(inventoryApi.lookupBarcode).mockResolvedValue({
      data: { ...ROLL, blocked: true, statusMessage: 'Roll is sold and cannot be sold' },
    } as any);
    const { user } = renderWithProviders(<RetailPOSPage />);
    await user.type(screen.getByLabelText('Barcode'), '0828156987886{Enter}');

    expect(await screen.findByText('Roll is sold and cannot be sold')).toBeInTheDocument();
    expect(screen.queryByText('R-0001')).not.toBeInTheDocument();
  });

  it('previews remaining length and wastage when the actual cut is longer than billed', async () => {
    const { user } = renderWithProviders(<RetailPOSPage />);
    await scan(user);
    await user.type(screen.getByLabelText('Quantity for R-0001'), '3');
    await user.type(screen.getByLabelText('Actual cut for R-0001'), '3.25');

    expect(screen.getByText('Wastage: 0.2500 yd')).toBeInTheDocument();
    expect(screen.getByText('86.75 yd')).toBeInTheDocument();
  });

  it('converts metres with the configured factor and converts the price', async () => {
    const { user } = renderWithProviders(<RetailPOSPage />);
    await scan(user);
    await user.selectOptions(screen.getByLabelText('Unit for R-0001'), 'METER');
    await user.type(screen.getByLabelText('Quantity for R-0001'), '10');

    expect(screen.getByLabelText('Unit price for R-0001')).toHaveValue(4.57); // 5 / yd × 0.9144
    expect(await screen.findByText('≈ 10.94 yd')).toBeInTheDocument();
    expect(screen.getByText('79.06 yd')).toBeInTheDocument(); // 90 − 10.9361
  });

  it('blocks the sale and explains when the cut is longer than the roll', async () => {
    const { user } = renderWithProviders(<RetailPOSPage />);
    await scan(user);
    await user.type(screen.getByLabelText('Quantity for R-0001'), '95');

    expect(screen.getByRole('alert')).toHaveTextContent('Roll R-0001: cut is longer than the 90.00 yd left');
    expect(completeButton()).toBeDisabled();
  });

  it('blocks a discount larger than the line amount', async () => {
    const { user } = renderWithProviders(<RetailPOSPage />);
    await scan(user);
    await user.type(screen.getByLabelText('Quantity for R-0001'), '1');
    await user.clear(screen.getByLabelText('Discount for R-0001'));
    await user.type(screen.getByLabelText('Discount for R-0001'), '6');

    expect(screen.getByRole('alert')).toHaveTextContent('discount is larger than the line amount');
    expect(completeButton()).toBeDisabled();
  });

  it('requires a customer before leaving a balance due', async () => {
    const { user } = renderWithProviders(<RetailPOSPage />);
    await scan(user);
    await user.type(screen.getByLabelText('Quantity for R-0001'), '3');
    await user.type(screen.getByLabelText('Payment 1 amount'), '10');
    await user.click(completeButton());

    expect(await screen.findByText(/Select a customer to leave a balance due/)).toBeInTheDocument();
    expect(salesApi.createRetailSale).not.toHaveBeenCalled();
  });

  it('submits the sale and shows the receipt with change', async () => {
    vi.mocked(salesApi.createRetailSale).mockResolvedValue({ data: invoice() } as any);
    const { user } = renderWithProviders(<RetailPOSPage />);
    await scan(user);
    await user.type(screen.getByLabelText('Quantity for R-0001'), '3');
    await user.type(screen.getByLabelText('Actual cut for R-0001'), '3.25');
    await user.type(screen.getByLabelText('Payment 1 amount'), '20');

    expect(screen.getByText('Change')).toBeInTheDocument();
    await user.click(completeButton());

    await waitFor(() => expect(salesApi.createRetailSale).toHaveBeenCalledTimes(1));
    const [dto, key] = vi.mocked(salesApi.createRetailSale).mock.calls[0];
    expect(dto).toMatchObject({
      lines: [{ productId: 'prod-1', rollId: 'roll-1', billedQuantity: 3, actualCutQuantity: 3.25, unit: 'YARD', unitPrice: 5 }],
      payments: [{ method: 'CASH', amount: 20 }],
    });
    expect(key).toEqual(expect.any(String));

    const scope = within(await screen.findByRole('dialog', { name: /sale receipt/i }));
    expect(scope.getByText('INV-20261015-0007')).toBeInTheDocument();
    expect(scope.getAllByText('Change').length).toBeGreaterThan(0);
    expect(scope.getByText('Test Fabrics')).toBeInTheDocument();
  });

  it('retries a failed sale with the same idempotency key', async () => {
    vi.mocked(salesApi.createRetailSale)
      .mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'Network Error' })
      .mockResolvedValueOnce({ data: invoice() } as any);
    const { user } = renderWithProviders(<RetailPOSPage />);
    await scan(user);
    await user.type(screen.getByLabelText('Quantity for R-0001'), '3');
    await user.type(screen.getByLabelText('Payment 1 amount'), '15');

    await user.click(completeButton());
    expect(await screen.findByText('[NETWORK_ERROR] Network Error')).toBeInTheDocument();
    await user.click(completeButton());

    await waitFor(() => expect(salesApi.createRetailSale).toHaveBeenCalledTimes(2));
    const keys = vi.mocked(salesApi.createRetailSale).mock.calls.map((c) => c[1]);
    expect(keys[0]).toBe(keys[1]);
  });
});
