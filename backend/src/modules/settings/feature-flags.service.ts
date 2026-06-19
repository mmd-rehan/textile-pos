import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../database/prisma.service';

/**
 * Canonical feature-flag definitions (application side).
 *
 * The DB stores only the camelCase `key` (FeatureFlag.name) + isEnabled. Labels
 * and descriptions are derived from this list and exposed via the definitions
 * endpoint so the UI never has to hardcode them.
 *
 * Mirror of prisma/seeds/feature-flags.constants.ts — keep the two in sync.
 */
export const FEATURE_FLAG_DEFINITIONS = [
  { key: 'wholesalePos',      label: 'Wholesale POS',      description: 'Enable the wholesale POS and bulk invoicing flow.' },
  { key: 'barcodeGeneration', label: 'Barcode Generation', description: 'Allow generating and printing barcodes from the system.' },
  { key: 'wastageTracking',   label: 'Wastage Tracking',   description: 'Track cutting wastage automatically on fabric sales.' },
  { key: 'remnantManagement', label: 'Remnant Management', description: 'Allow marking roll offcuts as remnants for later sale.' },
  { key: 'creditSales',       label: 'Credit Sales',       description: 'Allow partial payment / credit balance on sales invoices.' },
] as const;

export const CANONICAL_FLAG_KEYS: string[] = FEATURE_FLAG_DEFINITIONS.map((d) => d.key);

/** Default value used when a canonical flag row does not exist yet. */
export const DEFAULT_FLAG_ENABLED = true;

export const FEATURE_FLAGS = {
  WHOLESALE_POS: 'wholesalePos',
  BARCODE_GENERATION: 'barcodeGeneration',
  WASTAGE_TRACKING: 'wastageTracking',
  REMNANT_MANAGEMENT: 'remnantManagement',
  CREDIT_SALES: 'creditSales',
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFlags(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.featureFlag.findMany();
    const byName = new Map(rows.map((r) => [r.name, r.isEnabled]));
    // Return exactly the canonical keys; unknown/legacy rows are ignored.
    return Object.fromEntries(
      CANONICAL_FLAG_KEYS.map((key) => [key, byName.get(key) ?? DEFAULT_FLAG_ENABLED]),
    );
  }

  async isEnabled(flag: FeatureFlagKey): Promise<boolean> {
    const row = await this.prisma.featureFlag.findUnique({
      where: { name: FEATURE_FLAGS[flag] },
    });
    return row?.isEnabled ?? DEFAULT_FLAG_ENABLED;
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
