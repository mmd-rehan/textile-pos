import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface PaymentAllocationResult {
  allocations: { invoiceId: string; invoiceNumber: string; amount: string; dueAfter: string }[];
  /** Part of the payment left as customer credit (no open invoice to apply it to). */
  unallocated: Prisma.Decimal;
}

interface OpenInvoiceRow {
  id: string;
  invoice_number: string;
  paid_amount: unknown;
  due_amount: unknown;
}

/**
 * Applies a customer payment to the customer's unpaid invoices, oldest first,
 * updating each invoice's paid/due amounts and status and recording an
 * append-only allocation row per invoice.
 *
 * Must run inside the payment transaction after the customer row is locked.
 * Invoices are read with a locking read so the amounts are the latest
 * committed values, not a stale snapshot.
 */
export async function allocateCustomerPayment(
  tx: Tx,
  params: { customerId: string; paymentId: string; amount: Prisma.Decimal },
): Promise<PaymentAllocationResult> {
  const open = await tx.$queryRaw<OpenInvoiceRow[]>`
    SELECT id, invoice_number, paid_amount, due_amount
    FROM sale_invoices
    WHERE customer_id = ${params.customerId}
      AND due_amount > 0
      AND status NOT IN ('CANCELLED', 'DRAFT')
    ORDER BY created_at ASC, id ASC
    FOR UPDATE`;

  let remaining = params.amount;
  const allocations: PaymentAllocationResult['allocations'] = [];

  for (const inv of open) {
    if (remaining.lte(0)) break;
    const due = new Prisma.Decimal(String(inv.due_amount));
    const applied = Prisma.Decimal.min(due, remaining).toDecimalPlaces(2);
    const dueAfter = due.minus(applied).toDecimalPlaces(2);
    const paidAfter = new Prisma.Decimal(String(inv.paid_amount)).plus(applied).toDecimalPlaces(2);
    const fullyPaid = dueAfter.lte(0);

    await tx.saleInvoice.update({
      where: { id: inv.id },
      data: {
        paidAmount: paidAfter,
        dueAmount: dueAfter,
        status: fullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
        paymentStatus: fullyPaid ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID,
      },
    });
    await tx.customerPaymentAllocation.create({
      data: { paymentId: params.paymentId, invoiceId: inv.id, amount: applied },
    });

    allocations.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      amount: applied.toString(),
      dueAfter: dueAfter.toString(),
    });
    remaining = remaining.minus(applied);
  }

  return { allocations, unallocated: remaining.toDecimalPlaces(2) };
}
