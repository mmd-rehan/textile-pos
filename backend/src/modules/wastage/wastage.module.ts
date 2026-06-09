import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { WastageController } from './wastage.controller';
import { WastageService } from './wastage.service';

@Module({
  imports: [SettingsModule],
  controllers: [WastageController],
  providers: [WastageService],
  exports: [WastageService],
})
export class WastageModule {}
