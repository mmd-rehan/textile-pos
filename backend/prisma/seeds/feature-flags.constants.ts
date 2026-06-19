/**
 * Canonical feature-flag definitions (seed side).
 *
 * Single source of truth used by the standard seed and the verify script. The
 * backend application keeps its own mirror of these keys in
 * src/modules/settings/feature-flags.service.ts — keep the two in sync if a flag
 * is added or renamed.
 *
 * The DB stores only `key` (FeatureFlag.name) + `isEnabled` + `description`.
 * The human label is derived in the UI / definitions endpoint from this list.
 */
export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  /** Default value applied only when the flag does not exist yet. */
  defaultEnabled: boolean;
}

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: 'wholesalePos',
    label: 'Wholesale POS',
    description: 'Enable the wholesale POS and bulk invoicing flow.',
    defaultEnabled: true,
  },
  {
    key: 'barcodeGeneration',
    label: 'Barcode Generation',
    description: 'Allow generating and printing barcodes from the system.',
    defaultEnabled: true,
  },
  {
    key: 'wastageTracking',
    label: 'Wastage Tracking',
    description: 'Track cutting wastage automatically on fabric sales.',
    defaultEnabled: true,
  },
  {
    key: 'remnantManagement',
    label: 'Remnant Management',
    description: 'Allow marking roll offcuts as remnants for later sale.',
    defaultEnabled: true,
  },
  {
    key: 'creditSales',
    label: 'Credit Sales',
    description: 'Allow partial payment / credit balance on sales invoices.',
    defaultEnabled: true,
  },
];

export const CANONICAL_FLAG_KEYS: string[] = FEATURE_FLAG_DEFINITIONS.map((d) => d.key);
