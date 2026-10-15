/**
 * One-off backfill: applies customer payments recorded before payment
 * allocation existed to the customers' oldest unpaid invoices, exactly as new
 * payments are applied.
 *
 *   npm run db:allocate-payments            # dry run — prints what would change
 *   npm run db:allocate-payments -- --apply # writes allocations + audit logs
 *
 * Safe to re-run: only the part of each payment not yet allocated is applied.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { lockRowsForUpdate } from '../../src/database/locking';
import { allocateCustomerPayment } from '../../src/modules/customers/payment-allocation';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

class DryRunRollback extends Error {}

async function main() {
  const payments = await prisma.customerPayment.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { allocations: { select: { amount: true } }, customer: { select: { name: true } } },
  });
  const pending = payments
    .map((p) => ({
      ...p,
      remaining: new Prisma.Decimal(p.amount.toString()).minus(
        p.allocations.reduce((s, a) => s.plus(a.amount), new Prisma.Decimal(0)),
      ),
    }))
    .filter((p) => p.remaining.gt(0));

  console.log(`${apply ? 'APPLYING' : 'DRY RUN'} — ${pending.length} payment(s) with unallocated amounts\n`);
  let changedInvoices = 0;

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const p of pending) {
          await lockRowsForUpdate(tx, 'customers', [p.customerId]);
          const { allocations, unallocated } = await allocateCustomerPayment(tx, {
            customerId: p.customerId,
            paymentId: p.id,
            amount: p.remaining,
          });
          changedInvoices += allocations.length;
          console.log(
            `${p.createdAt.toISOString().slice(0, 10)}  ${p.customer.name}  payment ${p.amount} → ` +
              (allocations.length
                ? allocations.map((a) => `${a.invoiceNumber} ${a.amount} (due ${a.dueAfter})`).join(', ')
                : 'no open invoices') +
              (unallocated.gt(0) ? `; ${unallocated} left as credit` : ''),
          );
          if (allocations.length) {
            await tx.auditLog.create({
              data: {
                userId: p.receivedById,
                action: 'CUSTOMER_PAYMENT_BACKFILL_ALLOCATED',
                tableName: 'customer_payments',
                recordId: p.id,
                newValues: JSON.stringify({ allocations, unallocated: unallocated.toString() }),
              },
            });
          }
        }
        if (!apply) throw new DryRunRollback();
      },
      { timeout: 120_000 },
    );
  } catch (e) {
    if (!(e instanceof DryRunRollback)) throw e;
  }

  console.log(
    `\n${changedInvoices} invoice update(s) ${apply ? 'written' : 'would be written'}.` +
      (apply ? '' : ' Re-run with --apply to save.'),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
