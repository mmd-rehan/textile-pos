import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('read:sales')
  async getDashboard() {
    const data = await this.reportsService.getDashboardSummary();
    return { data };
  }

  @Get('sales')
  @RequirePermissions('read:sales')
  async getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('saleType') saleType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getSalesReport({
      startDate,
      endDate,
      saleType,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('sales/monthly')
  @RequirePermissions('read:sales')
  async getMonthlySales(
    @Query('year') year?: string,
    @Query('saleType') saleType?: string,
  ) {
    const data = await this.reportsService.getMonthlySalesSummary({
      year: year ? Number(year) : undefined,
      saleType,
    });
    return { data };
  }

  @Get('sales/products')
  @RequirePermissions('read:sales')
  async getProductSalesSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('saleType') saleType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getProductSalesSummary({
      startDate,
      endDate,
      saleType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('inventory/stock')
  @RequirePermissions('read:inventory')
  async getStockReport(
    @Query('productType') productType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getStockReport({
      productType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('inventory/low-stock')
  @RequirePermissions('read:inventory')
  async getLowStockRolls(
    @Query('threshold') threshold?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getLowStockRolls({
      threshold: threshold ? Number(threshold) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('inventory/movements')
  @RequirePermissions('read:inventory')
  async getRollMovements(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('movementType') movementType?: string,
    @Query('productId') productId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getRollMovementsReport({
      startDate,
      endDate,
      movementType,
      productId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('customers/outstanding')
  @RequirePermissions('read:sales')
  async getCustomerOutstanding(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getCustomerOutstandingReport({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('wastage')
  @RequirePermissions('read:inventory')
  async getWastageReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getWastageReport({
      startDate,
      endDate,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('purchases')
  @RequirePermissions('read:purchases')
  async getPurchaseReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getPurchaseReport({
      startDate,
      endDate,
      supplierId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
