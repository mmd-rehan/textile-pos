import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { RemnantsController } from './remnants.controller';
import { RemnantsService } from './remnants.service';

@Module({
  imports: [SettingsModule],
  controllers: [RemnantsController],
  providers: [RemnantsService],
  exports: [RemnantsService],
})
export class RemnantsModule { }
