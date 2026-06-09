import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../database/prisma.service';

export const FEATURE_FLAGS = {
  WHOLESALE_POS: 'wholesale_enabled',
  BARCODE_GENERATION: 'barcode_generation',
  WASTAGE_TRACKING: 'wastage_tracking',
  REMNANT_MANAGEMENT: 'remnant_management',
  CREDIT_SALES: 'credit_sales',
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFlags(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.featureFlag.findMany();
    return Object.fromEntries(rows.map((r) => [r.name, r.isEnabled]));
  }

  async isEnabled(flag: FeatureFlagKey): Promise<boolean> {
    const row = await this.prisma.featureFlag.findUnique({
      where: { name: FEATURE_FLAGS[flag] },
    });
    return row?.isEnabled ?? false;
  }

  async assertEnabled(flag: FeatureFlagKey): Promise<void> {
    const enabled = await this.isEnabled(flag);
    if (!enabled) {
      throw AppError.forbidden(
        'This feature is disabled in system settings.',
        'FEATURE_DISABLED',
        { feature: flag },
      );
    }
  }
}
