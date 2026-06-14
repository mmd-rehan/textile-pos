// ── Auth ─────────────────────────────────────────────────────────────────────

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  roles: Array<{ id: string; name: string }>;
  permissions: string[];
}

export interface LoginForm {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

// ── Shared ──────────────────────────────────────────────────────────────────

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: PaginatedMeta & Record<string, unknown>;
}

// ── Catalog ──────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; name: string } | null;
  subcategories?: { id: string; name: string; isActive: boolean }[];
  _count?: { products: number; subcategories?: number };
}

export interface Brand {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface Color {
  id: string;
  name: string;
  colorCode?: string | null;
  hexCode?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Design {
  id: string;
  name: string;
  designCode?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateColorForm {
  name: string;
  colorCode?: string;
  hexCode?: string;
}

export interface CreateDesignForm {
  name: string;
  designCode?: string;
  description?: string;
}

export interface SupplierPayment {
  id: string;
  purchaseOrderId: string;
  supplierId: string;
  amountOriginalCurrency: string;
  amountBaseCurrency: string;
  currencyCode: string;
  exchangeRateToBaseCurrency: string;
  paymentMethod: string;
  paymentDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  currencyCode: string;
  debitOriginalCurrency: string;
  creditOriginalCurrency: string;
  exchangeRateToBaseCurrency: string;
  debitBaseCurrency: string;
  creditBaseCurrency: string;
  balanceAfterBase: string;
  referenceType: string;
  referenceId: string;
  remarks?: string | null;
  createdAt: string;
}

export interface PurchaseAttachment {
  id: string;
  purchaseOrderId: string;
  supplierId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByUserId: string;
  uploadedBy?: { id: string; username: string } | null;
  supplier?: { id: string; name: string } | null;
  purchaseOrder?: { id: string; poNumber: string } | null;
  status: 'ACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface SupplierStatementEntry {
  id: string;
  date: string;
  referenceNumber: string;
  referenceType: string;
  referenceId: string;
  description: string;
  currencyCode: string;
  baseCurrencyCodeAtTime: string;
  exchangeRateToBaseCurrency: string;
  debitOriginalCurrency: string;
  creditOriginalCurrency: string;
  debitBaseCurrency: string;
  creditBaseCurrency: string;
  balanceAfterBase: string;
  remarks?: string | null;
}

export interface SupplierStatement {
  supplier: {
    id: string;
    name: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    currentBalance: string;
  };
  baseCurrencyCode: string;
  fromDate: string | null;
  toDate: string | null;
  openingBalanceBase: string;
  closingBalanceBase: string;
  totalDebitBase: string;
  totalCreditBase: string;
  entries: SupplierStatementEntry[];
  generatedAt: string;
}

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnitConversion {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  factor: string;
  fromUnit: { id: string; name: string; abbreviation: string };
  toUnit: { id: string; name: string; abbreviation: string };
}

export type ProductType = 'FABRIC_ROLL' | 'CUT_PIECE' | 'FIXED_PRODUCT';
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

export interface Product {
  id: string;
  productCode: string;
  name: string;
  barcode?: string | null;
  description?: string | null;
  productType: ProductType;
  categoryId: string;
  brandId?: string | null;
  colorId?: string | null;
  designId?: string | null;
  defaultUnitId: string;
  retailPrice: string;
  wholesalePrice: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string };
  brand?: { id: string; name: string } | null;
  color?: { id: string; name: string; colorCode?: string | null } | null;
  design?: { id: string; name: string; designCode?: string | null } | null;
  defaultUnit?: { id: string; name: string; abbreviation: string };
  productColors?: Array<{ id: string; color: Color }>;
  productDesigns?: Array<{ id: string; design: Design }>;
}

export interface Batch {
  id: string;
  batchNumber: string;
  supplierId?: string | null;
  notes?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; name: string } | null;
  _count?: { rolls: number };
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  currentBalance: string;
  createdAt: string;
  updatedAt: string;
  _count?: { purchaseOrders: number };
}

export type RollStatus = 'IN_STOCK' | 'ALLOCATED' | 'SOLD' | 'WASTED' | 'DAMAGED' | 'FINISHED';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'CANCELLED';

export interface Roll {
  id: string;
  rollNumber: string;
  barcode?: string | null;
  productId: string;
  colorId?: string | null;
  designId?: string | null;
  batchId?: string | null;
  originalLengthYard: string;
  remainingLengthYard: string;
  purchasePricePerYardOriginalCurrency?: string | null;
  purchasePricePerYardBaseCurrency?: string | null;
  salePricePerYard?: string | null;
  status: RollStatus;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; productCode: string };
  color?: { id: string; name: string; colorCode?: string | null } | null;
  design?: { id: string; name: string; designCode?: string | null } | null;
  batch?: { id: string; batchNumber: string } | null;
  purchaseRolls?: Array<{
    id: string;
    purchasePricePerUnitOriginalCurrency: string;
    purchasePricePerUnitBaseCurrency: string;
    purchaseOrder: {
      id: string;
      poNumber: string;
      orderDate: string;
      purchaseCurrencyCode: string;
      exchangeRateToBaseCurrency: string;
    };
  }>;
  inventoryMovements?: Array<{
    id: string;
    movementType: string;
    direction: string;
    quantity: string;
    createdAt: string;
    unit: { id: string; abbreviation: string };
  }>;
}

export interface PurchaseRollItem {
  id: string;
  purchaseOrderId: string;
  rollId: string;
  purchasePricePerUnitOriginalCurrency: string;
  purchasePricePerUnitBaseCurrency: string;
  roll?: Roll;
}

export interface PurchaseItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  orderedQuantity: string;
  receivedQuantity: string;
  unitId: string;
  unitCostOriginalCurrency: string;
  lineTotalOriginalCurrency: string;
  unitCostBaseCurrency: string;
  lineTotalBaseCurrency: string;
  product?: { id: string; name: string; productCode: string };
  unit?: { id: string; name: string; abbreviation: string };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  purchaseCurrencyCode: string;
  baseCurrencyCodeAtTime: string;
  exchangeRateToBaseCurrency: string;
  subtotalOriginalCurrency: string;
  discountOriginalCurrency: string;
  taxOriginalCurrency: string;
  totalOriginalCurrency: string;
  subtotalBaseCurrency: string;
  discountBaseCurrency: string;
  taxBaseCurrency: string;
  totalBaseCurrency: string;
  paidAmountOriginalCurrency: string;
  dueAmountOriginalCurrency: string;
  status: InvoiceStatus;
  orderDate: string;
  deliveryDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; name: string; contactName?: string | null };
  purchaseItems?: PurchaseItem[];
  purchaseRolls?: PurchaseRollItem[];
  _count?: { purchaseRolls: number };
}

// ── Form types ───────────────────────────────────────────────────────────────

export interface CreateCategoryForm {
  name: string;
  description?: string;
  parentId?: string;
}

export interface CreateBrandForm {
  name: string;
  description?: string;
}

export interface CreateProductForm {
  productCode: string;
  name: string;
  barcode?: string;
  description?: string;
  productType: ProductType;
  categoryId: string;
  brandId?: string;
  colorId?: string;
  designId?: string;
  defaultUnitId: string;
  retailPrice: number;
  wholesalePrice: number;
}

export interface CreateBatchForm {
  batchNumber: string;
  supplierId?: string;
  notes?: string;
  receivedAt?: string;
}

// ── Inventory (Milestone 6) ───────────────────────────────────────────────────

export type MovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'WASTAGE'
  | 'RECONCILIATION'
  | 'RETURN'
  | 'REMNANT_CREATED'
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN_IN'
  | 'RETURN_OUT'
  | 'OPENING_STOCK';

export type MovementDirection = 'IN' | 'OUT';

export interface InventoryMovement {
  id: string;
  productId: string;
  rollId?: string | null;
  movementType: MovementType;
  direction: MovementDirection;
  quantity: string;
  unitId: string;
  beforeQuantity?: string | null;
  afterQuantity?: string | null;
  referenceType: string;
  referenceId?: string | null;
  remarks?: string | null;
  userId: string;
  createdAt: string;
  product?: { id: string; name: string; productCode: string };
  roll?: { id: string; rollNumber: string; barcode?: string | null } | null;
  unit?: { id: string; name: string; abbreviation: string };
  user?: { id: string; username: string };
}

export interface RollSummaryItem {
  id: string;
  rollNumber: string;
  barcode?: string | null;
  status: RollStatus;
  remainingLengthYard: string;
  salePricePerYard?: string | null;
  location?: string | null;
}

export interface ProductStockItem {
  id: string;
  productId: string;
  colorId?: string | null;
  designId?: string | null;
  barcodeValue?: string | null;
  quantityOnHand: string;
  unitId: string;
  purchasePricePerUnitBaseCurrency?: string | null;
  salePricePerUnit?: string | null;
  location?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; productCode: string; productType: ProductType };
  color?: { id: string; name: string } | null;
  design?: { id: string; name: string } | null;
  unit?: { id: string; name: string; abbreviation: string };
}

export interface StockItemSummary {
  id: string;
  quantityOnHand: string;
  barcodeValue?: string | null;
  salePricePerUnit?: string | null;
  location?: string | null;
  color?: { id: string; name: string } | null;
  design?: { id: string; name: string } | null;
  unit?: { id: string; name: string; abbreviation: string };
}

export type BarcodeLookupType = 'ROLL' | 'PRODUCT' | 'STOCK_ITEM';

export interface BarcodeLookupResult {
  type: BarcodeLookupType;
  blocked: boolean;
  warning: boolean;
  statusMessage: string | null;
  roll?: {
    id: string;
    rollNumber: string;
    barcode?: string | null;
    status: RollStatus;
    originalLengthYard: string;
    remainingLengthYard: string;
    salePricePerYard?: string | null;
    location?: string | null;
    product?: { id: string; name: string; productCode: string };
    color?: { id: string; name: string; colorCode?: string | null } | null;
    design?: { id: string; name: string; designCode?: string | null } | null;
    batch?: { id: string; batchNumber: string } | null;
  };
  product?: {
    id: string;
    productCode: string;
    name: string;
    productType: ProductType;
    retailPrice: string;
    wholesalePrice: string;
    status: ProductStatus;
    category?: { id: string; name: string };
    color?: { id: string; name: string; colorCode?: string | null } | null;
    design?: { id: string; name: string; designCode?: string | null } | null;
    defaultUnit?: { id: string; name: string; abbreviation: string };
    availableRolls?: RollSummaryItem[];
    stockItems?: StockItemSummary[];
  };
  stockItem?: {
    id: string;
    productId: string;
    barcodeValue?: string | null;
    quantityOnHand: string;
    salePricePerUnit?: string | null;
    location?: string | null;
    isActive: boolean;
    product: { id: string; name: string; productCode: string; productType: ProductType };
    color?: { id: string; name: string } | null;
    design?: { id: string; name: string } | null;
    unit?: { id: string; name: string; abbreviation: string };
  };
}

export interface POSSearchResult {
  id: string;
  productCode: string;
  name: string;
  barcode?: string | null;
  productType: ProductType;
  retailPrice: string;
  wholesalePrice: string;
  color?: { id: string; name: string } | null;
  design?: { id: string; name: string } | null;
  defaultUnit?: { id: string; name: string; abbreviation: string };
  availableRolls: RollSummaryItem[];
  stockItems: StockItemSummary[];
}

export interface StockSummaryItem {
  productId: string;
  productCode: string;
  name: string;
  productType: ProductType;
  retailPrice: string;
  wholesalePrice: string;
  totalRolls: number;
  rollCounts: Record<RollStatus, number>;
  totalOriginalYard: string;
  totalRemainingYard: string;
}

// ── Customers ──────────────────────────────────────────────────────────────────

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'CREDIT';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  type: CustomerType;
  status: CustomerStatus;
  creditLimit?: string | null;
  currentBalance: string;
  createdAt: string;
  updatedAt: string;
  _count?: { saleInvoices: number };
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  debit: string;
  credit: string;
  balanceAfter: string;
  referenceType: string;
  referenceId: string;
  remarks?: string | null;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  amount: string;
  paymentMethod: string;
  idempotencyKey?: string | null;
  notes?: string | null;
  receivedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOutstanding {
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  currentBalance: string;
  creditLimit: string | null;
  availableCredit: string | null;
  unpaidInvoicesCount: number;
  totalOutstandingAmount: string;
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'REFUNDED' | 'FAILED';
export type SaleType = 'RETAIL' | 'WHOLESALE';

export interface SaleInvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  rollId?: string | null;
  productStockItemId?: string | null;
  colorId?: string | null;
  designId?: string | null;
  billedQuantity: string;
  actualCutQuantity?: string | null;
  unitId: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  subTotal: string;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; productCode: string; productType?: string };
  roll?: { id: string; rollNumber: string; barcode?: string | null } | null;
  productStockItem?: {
    id: string;
    quantityOnHand: string;
    barcodeValue?: string | null;
    color?: { id: string; name: string } | null;
    design?: { id: string; name: string } | null;
    unit?: { id: string; name: string; abbreviation: string };
  } | null;
  color?: { id: string; name: string } | null;
  design?: { id: string; name: string } | null;
  unit?: { id: string; name: string; abbreviation: string };
}

export interface SalePaymentRecord {
  id: string;
  invoiceId: string;
  paymentMethod: string;
  amount: string;
  transactionNumber?: string | null;
  paymentDate: string;
  status: PaymentStatus;
  receivedById: string;
  createdAt: string;
  updatedAt: string;
  receivedBy?: { id: string; username: string };
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  customerId?: string | null;
  currencyCode: string;
  totalAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxEnabled: boolean;
  taxRatePercent: string;
  taxLabel?: string | null;
  taxAmount: string;
  netAmount: string;
  paidAmount: string;
  dueAmount: string;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  saleType: SaleType;
  cashierId: string;
  notes?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; phone?: string | null; email?: string | null } | null;
  cashier?: { id: string; username: string };
  saleInvoiceItems?: SaleInvoiceItem[];
  salePayments?: SalePaymentRecord[];
  _count?: { saleInvoiceItems: number };
}

export interface ReceiptData {
  invoice: SaleInvoice;
  company: { name: string; address: string; phone: string; invoiceFooter?: string };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  roles: Array<{ id: string; name: string; description: string | null }>;
}

export interface CompanySettings {
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_currency?: string;
  company_timezone?: string;
  company_tax_enabled?: string;
  company_tax_rate?: string;
  company_tax_label?: string;
}

export interface InvoiceSettings {
  invoice_prefix?: string;
  invoice_footer?: string;
  invoice_show_tax?: string;
}

export interface MeasurementSettings {
  default_length_unit?: string;
  default_weight_unit?: string;
}

export interface BarcodeSettings {
  barcode_prefix_roll?: string;
  barcode_prefix_product?: string;
  barcode_format?: string;
}
