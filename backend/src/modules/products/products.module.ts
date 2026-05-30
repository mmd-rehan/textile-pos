import { Module } from '@nestjs/common';
import { ProductsController, ColorsController, DesignsController } from './products.controller';
import { ProductsService } from './products.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController, ColorsController, DesignsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
