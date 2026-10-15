import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SupplierStatementExportService } from './supplier-statement-export.service';
import { SuppliersService } from './suppliers.service';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SupplierStatementExportService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
