import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PurchaseAttachmentsController } from './purchase-attachments.controller';
import { PurchaseAttachmentsService } from './purchase-attachments.service';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [AuditModule],
  controllers: [PurchasesController, PurchaseAttachmentsController],
  providers: [PurchasesService, PurchaseAttachmentsService],
  exports: [PurchasesService, PurchaseAttachmentsService],
})
export class PurchasesModule {}
