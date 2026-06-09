import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { WastageModule } from '../wastage/wastage.module';
import { RollsController } from './rolls.controller';
import { RollsService } from './rolls.service';

@Module({
  imports: [WastageModule, SettingsModule],
  controllers: [RollsController],
  providers: [RollsService],
  exports: [RollsService],
})
export class RollsModule {}
