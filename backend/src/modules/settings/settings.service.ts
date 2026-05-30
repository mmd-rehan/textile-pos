import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCompanySettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.companySetting.findMany({ orderBy: { key: 'asc' } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async updateCompanySettings(patch: Record<string, string>): Promise<Record<string, string>> {
    await Promise.all(
      Object.entries(patch).map(([key, value]) =>
        this.prisma.companySetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
    return this.getCompanySettings();
  }

  async getAppSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async updateAppSettings(patch: Record<string, string>): Promise<Record<string, string>> {
    await Promise.all(
      Object.entries(patch).map(([key, value]) =>
        this.prisma.appSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
    return this.getAppSettings();
  }
}
