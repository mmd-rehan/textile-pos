import { Controller, Get, Body, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    const settings = await this.settingsService.getSettings();
    return {
      data: settings,
    };
  }

  @Put()
  async updateSettings(@Body() newSettings: Record<string, any>) {
    const updated = await this.settingsService.updateSettings(newSettings);
    return {
      data: updated,
    };
  }
}
