/**
 * Shared helpers for the split seed scripts (standard / dev / repair).
 *
 * Nothing in here writes business data on its own — these are pure utilities
 * used by the individual seeders to stay idempotent and readable.
 */

export type Stats = { created: number; skipped: number };

export const newStats = (): Stats => ({ created: 0, skipped: 0 });

/** Count an operation as a create or a skip. */
export const bump = (s: Stats, created: boolean): void => {
  if (created) s.created++;
  else s.skipped++;
};

/** Standard one-line summary for a seeded collection. */
export const logStats = (label: string, s: Stats): void =>
  console.log(`   ${label}: ${s.created} created, ${s.skipped} already present`);

/** Read an env var, falling back to a default when missing/blank. */
export function envOr(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v.trim() : fallback;
}

/** Read a boolean-ish env var ("true"/"1"/"yes"/"y" → true). */
export function envBool(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (!v) return fallback;
  return ['true', '1', 'yes', 'y'].includes(v.trim().toLowerCase());
}

/** Normalize a currency / similar code to a trimmed upper-case form. */
export const normalizeCode = (code: string): string => code.trim().toUpperCase();

/** Section header used by every seeder for consistent output. */
export const section = (title: string): void => console.log(title);
