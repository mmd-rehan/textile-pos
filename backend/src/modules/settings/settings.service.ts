import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanySettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.companySetting.findMany({ orderBy: { key: 'asc' } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async updateCompanySettings(patch: Record<string, string>, userId: string): Promise<Record<string, string>> {
    const before = await this.getCompanySettings();

    await Promise.all(
      Object.entries(patch).map(([key, value]) =>
        this.prisma.companySetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );

    const after = await this.getCompanySettings();

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COMPANY_SETTINGS_UPDATED',
        tableName: 'company_settings',
        recordId: 'company',
        oldValues: JSON.stringify(before),
        newValues: JSON.stringify(after),
      },
    });

    return after;
  }

  async getAppSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async updateAppSettings(patch: Record<string, string>, userId: string): Promise<Record<string, string>> {
    const before = await this.getAppSettings();

    await Promise.all(
      Object.entries(patch).map(([key, value]) =>
        this.prisma.appSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );

    const after = await this.getAppSettings();

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'APP_SETTINGS_UPDATED',
        tableName: 'app_settings',
        recordId: 'app',
        oldValues: JSON.stringify(before),
        newValues: JSON.stringify(after),
      },
    });

    return after;
  }

  async getFeatureFlags(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.featureFlag.findMany({ orderBy: { name: 'asc' } });
    return Object.fromEntries(rows.map((r) => [r.name, r.isEnabled]));
  }

  async updateFeatureFlag(name: string, isEnabled: boolean, userId: string): Promise<Record<string, boolean>> {
    await this.prisma.featureFlag.upsert({
      where: { name },
      create: { name, isEnabled },
      update: { isEnabled },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'FEATURE_FLAG_UPDATED',
        tableName: 'feature_flags',
        recordId: name,
        newValues: JSON.stringify({ name, isEnabled }),
      },
    });

    return this.getFeatureFlags();
  }
}
