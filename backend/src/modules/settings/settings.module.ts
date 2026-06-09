import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FeatureFlagsService } from './feature-flags.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SettingsController],
  providers: [SettingsService, FeatureFlagsService],
  exports: [SettingsService, FeatureFlagsService],
})
export class SettingsModule {}
