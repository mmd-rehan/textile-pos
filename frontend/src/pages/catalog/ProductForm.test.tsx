import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productsApi } from '../../api/products';
import { renderWithProviders, signIn } from '../../test/render';
import ProductForm from './ProductForm';

vi.mock('../../api/categories', () => ({
  categoriesApi: { getAll: vi.fn().mockResolvedValue({ data: [{ id: 'cat-1', name: 'Lawn' }] }) },
}));
vi.mock('../../api/brands', () => ({ brandsApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('../../api/units', () => ({
  unitsApi: { getAll: vi.fn().mockResolvedValue({ data: [{ id: 'yd', name: 'Yard', abbreviation: 'yd' }] }) },
}));
vi.mock('../../api/products', () => ({
  productsApi: { getOne: vi.fn(), create: vi.fn(), update: vi.fn() },
  colorsApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
  designsApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
}));

async function fillValidForm(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.type(screen.getByLabelText(/Product Code/), 'LAWN-001');
  await user.type(screen.getByLabelText(/Product Name/), 'Summer Lawn');
  await user.selectOptions(screen.getByLabelText(/Product Type/), 'FABRIC_ROLL');
  await user.selectOptions(await screen.findByLabelText(/Category/), await screen.findByRole('option', { name: 'Lawn' }));
  await user.selectOptions(screen.getByLabelText(/Default Unit/), await screen.findByRole('option', { name: 'Yard (yd)' }));
  await user.type(screen.getByLabelText(/Retail Price/), '12.50');
  await user.type(screen.getByLabelText(/Wholesale Price/), '10');
}

const submit = () => screen.getByRole('button', { name: /create product/i });
// Submits past the browser's built-in required/step checks so the form's own
// validation (what users get if those are bypassed) is exercised.
const forceSubmit = () => fireEvent.submit(submit().closest('form')!);

describe('Product form', () => {
  beforeEach(() => signIn(['read:products', 'write:products']));

  it('shows required-field errors and does not submit an empty form', async () => {
    renderWithProviders(<ProductForm />);
    forceSubmit();

    expect(await screen.findByText('Product code is required')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(screen.getByText('Unit is required')).toBeInTheDocument();
    expect(productsApi.create).not.toHaveBeenCalled();
  });

  it('rejects zero, negative and over-precise prices', async () => {
    const { user } = renderWithProviders(<ProductForm />);
    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/Retail Price/));
    await user.type(screen.getByLabelText(/Retail Price/), '12.345');
    await user.clear(screen.getByLabelText(/Wholesale Price/));
    await user.type(screen.getByLabelText(/Wholesale Price/), '0');
    forceSubmit();

    expect(await screen.findByText('Use at most 2 decimal places')).toBeInTheDocument();
    expect(screen.getByText('Must be greater than 0')).toBeInTheDocument();
    expect(productsApi.create).not.toHaveBeenCalled();
  });

  it('creates the product with the entered values and returns to the list', async () => {
    vi.mocked(productsApi.create).mockResolvedValue({ data: { id: 'new' } } as any);
    const { user } = renderWithProviders(<ProductForm />);
    await fillValidForm(user);
    await user.click(submit());

    await waitFor(() =>
      expect(productsApi.create).toHaveBeenCalledWith({
        productCode: 'LAWN-001',
        name: 'Summer Lawn',
        barcode: undefined,
        description: undefined,
        productType: 'FABRIC_ROLL',
        categoryId: 'cat-1',
        brandId: undefined,
        colorId: undefined,
        designId: undefined,
        defaultUnitId: 'yd',
        retailPrice: 12.5,
        wholesalePrice: 10,
      }),
    );
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/catalog/products'));
  });

  it('shows a duplicate product code from the server on the field and stays on the form', async () => {
    vi.mocked(productsApi.create).mockRejectedValue({ code: 'PRODUCT_CODE_EXISTS', message: 'Product code already exists' });
    const { user } = renderWithProviders(<ProductForm />, { route: '/catalog/products/new' });
    await fillValidForm(user);
    await user.click(submit());

    expect(await screen.findByText('Product code already exists')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/catalog/products/new');
  });

  it('shows other server errors above the buttons', async () => {
    vi.mocked(productsApi.create).mockRejectedValue({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
    const { user } = renderWithProviders(<ProductForm />);
    await fillValidForm(user);
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
  });
});
