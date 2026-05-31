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
  createdAt: string;
  updatedAt: string;
}

export interface Design {
  id: string;
  name: string;
  designCode?: string | null;
  createdAt: string;
  updatedAt: string;
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

export type RollStatus = 'IN_STOCK' | 'ALLOCATED' | 'SOLD' | 'WASTED' | 'DAMAGED';
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
  exchangeRateToBaseCurrency: string;
  subtotalOriginalCurrency: string;
  discountOriginalCurrency: string;
  taxOriginalCurrency: string;
  totalOriginalCurrency: string;
  subtotalBaseCurrency: string;
  discountBaseCurrency: string;
  taxBaseCurrency: string;
  totalBaseCurrency: string;
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
