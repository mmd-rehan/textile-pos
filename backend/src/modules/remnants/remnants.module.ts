import { Module } from '@nestjs/common';
import { RemnantsController } from './remnants.controller';
import { RemnantsService } from './remnants.service';

@Module({
  controllers: [RemnantsController],
  providers: [RemnantsService],
  exports: [RemnantsService],
})
export class RemnantsModule {}
