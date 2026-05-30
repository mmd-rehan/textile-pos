import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  
  // In-memory placeholder store for system settings
  private settings: Record<string, any> = {
    companyName: 'Textile POS System',
    currency: 'USD',
    taxRate: 5.0,
    allowNegativeStock: false,
    theme: 'dark',
  };

  async getSettings(): Promise<Record<string, any>> {
    this.logger.log('Fetching application settings');
    return this.settings;
  }

  async updateSettings(newSettings: Record<string, any>): Promise<Record<string, any>> {
    this.logger.log(`Updating settings: ${JSON.stringify(newSettings)}`);
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    return this.settings;
  }
}
