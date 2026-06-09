import apiClient from './client';

export interface DashboardSummary {
  today: { invoiceCount: number; netAmount: string; paidAmount: string };
  totalOutstandingCredit: { amount: string; customerCount: number };
  lowStockRollsCount: number;
  remnantsAvailableCount: number;
  wastageThisMonth: { quantityYard: string; entryCount: number };
  fastMovingProducts: Array<{
    productId: string;
    name: string;
    productCode: string;
    totalRevenue: string;
  }>;
}

export interface SalesReportTotals {
  invoiceCount: number;
  grandTotal: string;
  netAmount?: string;
  paidAmount: string;
  dueAmount: string;
  discountAmount: string;
  taxTotal: string;
}

export interface MonthlySummaryRow {
  month: string;
  invoiceCount: number;
  netAmount: string;
  paidAmount: string;
  dueAmount: string;
}

export interface ProductSalesSummaryRow {
  productId: string;
  productName: string;
  productCode: string;
  productType: string;
  lineCount: number;
  totalQty: string;
  totalRevenue: string;
}

export const reportsApi = {
  getDashboard: (): Promise<{ data: DashboardSummary }> =>
    apiClient.get('/reports/dashboard'),

  getSalesReport: (params: {
    startDate?: string;
    endDate?: string;
    saleType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: any; totals: SalesReportTotals }> =>
    apiClient.get('/reports/sales', { params }),

  getMonthlySales: (params: {
    year?: number;
    saleType?: string;
  }): Promise<{ data: { year: number; saleType: string; months: MonthlySummaryRow[] } }> =>
    apiClient.get('/reports/sales/monthly', { params }),

  getProductSalesSummary: (params: {
    startDate?: string;
    endDate?: string;
    saleType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ProductSalesSummaryRow[]; meta: any }> =>
    apiClient.get('/reports/sales/products', { params }),

  getStockReport: (params: {
    productType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: any }> =>
    apiClient.get('/reports/inventory/stock', { params }),

  getLowStockRolls: (params: {
    threshold?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: any; threshold: string }> =>
    apiClient.get('/reports/inventory/low-stock', { params }),

  getRollMovements: (params: {
    startDate?: string;
    endDate?: string;
    movementType?: string;
    productId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: any }> =>
    apiClient.get('/reports/inventory/movements', { params }),

  getCustomerOutstanding: (params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: any; totalOutstanding: string }> =>
    apiClient.get('/reports/customers/outstanding', { params }),

  getWastageReport: (params: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: any; totalQuantityYard: string; totalEntries: number }> =>
    apiClient.get('/reports/wastage', { params }),

  getPurchaseReport: (params: {
    startDate?: string;
    endDate?: string;
    supplierId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: any; totals: { orderCount: number; totalBaseCurrency: string } }> =>
    apiClient.get('/reports/purchases', { params }),
};
