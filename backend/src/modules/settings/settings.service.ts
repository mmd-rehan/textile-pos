import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../database/prisma.service';
import {
  CANONICAL_FLAG_KEYS,
  DEFAULT_FLAG_ENABLED,
  FEATURE_FLAG_DEFINITIONS,
} from './feature-flags.service';

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

  async getTaxSettings(): Promise<{ taxEnabled: boolean; taxRatePercent: string; taxLabel: string }> {
    const rows = await this.prisma.companySetting.findMany({
      where: { key: { in: ['company_tax_enabled', 'company_tax_rate', 'company_tax_label'] } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      taxEnabled: map.get('company_tax_enabled') === 'true',
      taxRatePercent: map.get('company_tax_rate') ?? '0',
      taxLabel: map.get('company_tax_label') ?? 'Tax',
    };
  }

  /**
   * Returns exactly the five canonical feature flags. Legacy/duplicate rows are
   * ignored, and any canonical flag missing from the DB defaults to the v1
   * default (enabled). Run the seed/repair to fold legacy rows into these keys.
   */
  async getFeatureFlags(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.featureFlag.findMany();
    const byName = new Map(rows.map((r) => [r.name, r.isEnabled]));
    return Object.fromEntries(
      CANONICAL_FLAG_KEYS.map((key) => [key, byName.get(key) ?? DEFAULT_FLAG_ENABLED]),
    );
  }

  /** Canonical flag definitions (key + label + description) for the UI. */
  getFeatureFlagDefinitions(): ReadonlyArray<{ key: string; label: string; description: string }> {
    return FEATURE_FLAG_DEFINITIONS;
  }

  async updateFeatureFlag(name: string, isEnabled: boolean, userId: string): Promise<Record<string, boolean>> {
    if (!CANONICAL_FLAG_KEYS.includes(name)) {
      throw AppError.badRequest(
        `Unknown feature flag "${name}". Allowed: ${CANONICAL_FLAG_KEYS.join(', ')}.`,
        'UNKNOWN_FEATURE_FLAG',
      );
    }

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
