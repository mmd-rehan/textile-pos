import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Tables whose rows are locked before a read-modify-write of stock or balances. */
export type LockableTable = 'rolls' | 'product_stock_items' | 'customers';

/**
 * Takes exclusive row locks (SELECT … FOR UPDATE) on the given ids.
 *
 * Call this first in a transaction, before any other read, so later reads see
 * the latest committed values and concurrent writers queue instead of
 * overwriting each other. Ids are de-duplicated and locked in ascending order,
 * and callers lock tables in the order rolls → product_stock_items → customers,
 * so two transactions can never wait on each other in a cycle.
 */
export async function lockRowsForUpdate(tx: Tx, table: LockableTable, ids: Array<string | null | undefined>) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))].sort();
  if (unique.length === 0) return;
  await tx.$queryRaw`SELECT id FROM ${Prisma.raw(table)} WHERE id IN (${Prisma.join(unique)}) ORDER BY id FOR UPDATE`;
}

/**
 * Returns the next value of a named counter, atomically, inside the caller's
 * transaction (a rollback also rolls the counter back, so numbers stay gapless).
 *
 * `initialValue` is used only the first time a key is seen and should return
 * the highest number already issued for that key, so the counter continues
 * from documents created before the counter existed.
 */
export async function nextSequenceValue(tx: Tx, key: string, initialValue: () => Promise<number>): Promise<number> {
  const updated = await tx.$executeRaw`
    UPDATE document_sequences SET \`last_value\` = \`last_value\` + 1, updated_at = NOW(3) WHERE \`key\` = ${key}`;
  if (updated === 0) {
    const start = (await initialValue()) + 1;
    await tx.$executeRaw`
      INSERT INTO document_sequences (\`key\`, \`last_value\`, updated_at) VALUES (${key}, ${start}, NOW(3))
      ON DUPLICATE KEY UPDATE \`last_value\` = \`last_value\` + 1, updated_at = NOW(3)`;
  }
  const rows = await tx.$queryRaw<{ last_value: number | bigint }[]>`
    SELECT \`last_value\` FROM document_sequences WHERE \`key\` = ${key}`;
  return Number(rows[0].last_value);
}

/** Parses the trailing counter of a number such as INV-20260101-0042 (→ 42). */
export function trailingCounter(documentNumber: string | null | undefined): number {
  const match = documentNumber?.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}
