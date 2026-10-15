import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customersApi } from '../../api/customers';
import { inventoryApi } from '../../api/inventory';
import { salesApi } from '../../api/sales';
import { settingsApi } from '../../api/settings';
import { CASHIER_PERMISSIONS, renderWithProviders, settleBarcodeRefocus, signIn } from '../../test/render';
import WholesalePOSPage from './WholesalePOSPage';

vi.mock('../../api/inventory', () => ({ inventoryApi: { lookupBarcode: vi.fn(), posSearch: vi.fn() } }));
vi.mock('../../api/sales', () => ({ salesApi: { createWholesaleSale: vi.fn(), getReceipt: vi.fn() } }));
vi.mock('../../api/settings', () => ({ settingsApi: { getTax: vi.fn(), getFlags: vi.fn(), getCompany: vi.fn() } }));
vi.mock('../../api/units', () => ({
  unitsApi: {
    getConversions: vi.fn().mockResolvedValue({
      data: [{ id: 'c1', factor: '1.09361', fromUnit: { abbreviation: 'm' }, toUnit: { abbreviation: 'yd' } }],
    }),
  },
}));
vi.mock('../../api/customers', () => ({
  customersApi: { getAll: vi.fn(), getOne: vi.fn(), getOutstanding: vi.fn(), create: vi.fn() },
}));

const ROLL = {
  type: 'ROLL',
  blocked: false,
  roll: {
    id: 'roll-1',
    rollNumber: 'R-0001',
    remainingLengthYard: '90',
    salePricePerYard: '5',
    product: { id: 'prod-1', name: 'Cotton Voile', productCode: 'FAB-002', wholesalePrice: '4' },
    color: null,
    design: null,
  },
};

describe('Wholesale POS', () => {
  beforeEach(() => {
    signIn(CASHIER_PERMISSIONS, 'cashier');
    vi.mocked(settingsApi.getTax).mockResolvedValue({ data: { taxEnabled: false, taxRatePercent: '0', taxLabel: '' } } as any);
    vi.mocked(settingsApi.getFlags).mockResolvedValue({ data: { creditSales: true, wholesalePos: true } } as any);
    vi.mocked(settingsApi.getCompany).mockResolvedValue({ data: { company_currency: 'USD' } });
    vi.mocked(inventoryApi.lookupBarcode).mockResolvedValue({ data: ROLL } as any);
    vi.mocked(customersApi.getAll).mockResolvedValue({
      data: [{ id: 'cust-1', name: 'City Garments', phone: '0300', type: 'WHOLESALE' }],
      meta: {},
    } as any);
    vi.mocked(customersApi.getOne).mockResolvedValue({
      data: { id: 'cust-1', name: 'City Garments', phone: '0300', type: 'WHOLESALE', status: 'ACTIVE', currentBalance: '0.00' },
    } as any);
    vi.mocked(customersApi.getOutstanding).mockResolvedValue({
      data: { customerId: 'cust-1', currentBalance: '0.00', creditLimit: null, availableCredit: null, unpaidInvoicesCount: 0, totalOutstandingAmount: '0.00' },
    } as any);
    vi.mocked(salesApi.getReceipt).mockRejectedValue(new Error('not needed'));
  });

  it('sends a metre line as metres so the server deducts the converted length', async () => {
    vi.mocked(salesApi.createWholesaleSale).mockResolvedValue({
      data: { id: 'inv-1', invoiceNumber: 'WHL-1', createdAt: new Date().toISOString(), saleInvoiceItems: [], salePayments: [] },
    } as any);
    const { user } = renderWithProviders(<WholesalePOSPage />);

    await user.click(screen.getByLabelText('Customer'));
    await user.click(await screen.findByRole('button', { name: /City Garments/ }));
    await user.type(screen.getByLabelText('Barcode'), '0828156987886{Enter}');
    await screen.findByLabelText('Unit for R-0001');
    await settleBarcodeRefocus();

    await user.selectOptions(screen.getByLabelText('Unit for R-0001'), 'METER');
    await user.clear(screen.getByLabelText('Quantity for R-0001'));
    await user.type(screen.getByLabelText('Quantity for R-0001'), '10');
    await user.type(screen.getByLabelText('Payment 1 amount'), '1000');
    await user.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => expect(salesApi.createWholesaleSale).toHaveBeenCalledTimes(1));
    const dto = vi.mocked(salesApi.createWholesaleSale).mock.calls[0][0];
    expect(dto.customerId).toBe('cust-1');
    expect(dto.lines?.[0]).toMatchObject({ rollId: 'roll-1', billedQuantity: 10, unit: 'METER', isFullRoll: false });
  });
});
