import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { CreateRetailSaleDto } from './dto/create-retail-sale.dto';

const INVOICE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  cashier: { select: { id: true, username: true } },
  saleInvoiceItems: {
    include: {
      product: { select: { id: true, name: true, productCode: true } },
      roll: { select: { id: true, rollNumber: true, barcode: true } },
      color: { select: { id: true, name: true } },
      design: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, abbreviation: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  salePayments: {
    include: { receivedBy: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

interface ProcessedLine {
  productId: string;
  rollId: string;
  colorId: string | null;
  designId: string | null;
  unitId: string;
  billedQty: Prisma.Decimal;
  actualCutQty: Prisma.Decimal;
  billedYard: Prisma.Decimal;
  actualCutYard: Prisma.Decimal;
  wastageYard: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  grossSubTotal: Prisma.Decimal;
  subTotal: Prisma.Decimal;
  rollRemainingBefore: Prisma.Decimal;
  rollRemainingAfter: Prisma.Decimal;
  newRollStatus: string;
  rollNumber: string;
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) { }

  async createRetailSale(dto: CreateRetailSaleDto, userId: string, idempotencyKey?: string) {
    // Idempotency: return existing sale if this key was already processed
    if (idempotencyKey) {
      const existing = await this.prisma.saleInvoice.findUnique({
        where: { idempotencyKey },
        include: INVOICE_INCLUDE,
      });
      if (existing) return existing;
    }

    const invoiceId = await this.prisma.$transaction(
      async (tx) => {
        // Load unit records
        const [yardUnit, meterUnit] = await Promise.all([
          tx.unit.findFirst({ where: { abbreviation: 'yd' } }),
          tx.unit.findFirst({ where: { abbreviation: 'm' } }),
        ]);
        if (!yardUnit) throw AppError.internal('Yard unit not configured', 'UNIT_NOT_FOUND');

        // Resolve meter→yard factor from DB conversion table
        let meterToYardFactor = new Prisma.Decimal('1.093613');
        if (meterUnit) {
          const conv = await tx.unitConversion.findFirst({
            where: { fromUnitId: meterUnit.id, toUnitId: yardUnit.id },
          });
          if (conv) meterToYardFactor = new Prisma.Decimal(conv.factor.toString());
        }

        if (dto.customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: dto.customerId },
            select: { id: true },
          });
          if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
        }

        const processedLines: ProcessedLine[] = [];

        for (const line of dto.lines) {
          // Load roll within transaction for correct isolation
          const roll = await tx.roll.findUnique({ where: { id: line.rollId } });
          if (!roll) throw AppError.notFound(`Roll not found: ${line.rollId}`, 'ROLL_NOT_FOUND');

          if (roll.productId !== line.productId) {
            throw AppError.badRequest(
              `Roll ${roll.rollNumber} does not belong to product ${line.productId}`,
              'ROLL_PRODUCT_MISMATCH',
            );
          }
          if (!['IN_STOCK', 'ALLOCATED'].includes(roll.status)) {
            throw AppError.badRequest(
              `Roll ${roll.rollNumber} is ${roll.status} and cannot be sold`,
              'ROLL_NOT_AVAILABLE',
            );
          }

          const isMetric = line.unit === 'METER';
          const lineUnitId = isMetric ? (meterUnit?.id ?? yardUnit.id) : yardUnit.id;
          const toYardFactor = isMetric ? meterToYardFactor : new Prisma.Decimal(1);

          const billedQty = new Prisma.Decimal(line.billedQuantity.toString());
          const actualCutQty =
            line.actualCutQuantity != null
              ? new Prisma.Decimal(line.actualCutQuantity.toString())
              : billedQty;

          const billedYard = billedQty.times(toYardFactor).toDecimalPlaces(4);
          const actualCutYard = actualCutQty.times(toYardFactor).toDecimalPlaces(4);

          const rollRemainingBefore = new Prisma.Decimal(roll.remainingLengthYard.toString());
          if (actualCutYard.gt(rollRemainingBefore)) {
            throw AppError.badRequest(
              `Roll ${roll.rollNumber} has ${rollRemainingBefore.toFixed(2)} yd remaining, cannot cut ${actualCutYard.toFixed(2)} yd`,
              'INSUFFICIENT_ROLL_LENGTH',
            );
          }

          // Wastage: actual cut beyond billed quantity (both in yards)
          const wastageYard = actualCutYard.gt(billedYard)
            ? actualCutYard.minus(billedYard).toDecimalPlaces(4)
            : new Prisma.Decimal(0);

          const unitPrice = new Prisma.Decimal(line.unitPrice.toString());
          const discountAmount = new Prisma.Decimal((line.discountAmount ?? 0).toString());
          const grossSubTotal = billedQty.times(unitPrice).toDecimalPlaces(2);
          const subTotal = grossSubTotal.minus(discountAmount).toDecimalPlaces(2);
          if (subTotal.lt(0)) {
            throw AppError.badRequest(
              `Line subtotal for roll ${roll.rollNumber} cannot be negative`,
              'NEGATIVE_SUBTOTAL',
            );
          }

          const rollRemainingAfter = rollRemainingBefore.minus(actualCutYard).toDecimalPlaces(4);
          const newRollStatus = rollRemainingAfter.lte(0) ? 'SOLD' : roll.status;

          processedLines.push({
            productId: line.productId,
            rollId: line.rollId,
            colorId: roll.colorId,
            designId: roll.designId,
            unitId: lineUnitId,
            billedQty,
            actualCutQty,
            billedYard,
            actualCutYard,
            wastageYard,
            unitPrice,
            discountAmount,
            grossSubTotal,
            subTotal,
            rollRemainingBefore,
            rollRemainingAfter,
            newRollStatus,
            rollNumber: roll.rollNumber,
          });
        }

        // Invoice totals
        const totalAmount = processedLines
          .reduce((s, l) => s.plus(l.grossSubTotal), new Prisma.Decimal(0))
          .toDecimalPlaces(2);
        const totalDiscount = processedLines
          .reduce((s, l) => s.plus(l.discountAmount), new Prisma.Decimal(0))
          .toDecimalPlaces(2);
        const netAmount = totalAmount.minus(totalDiscount).toDecimalPlaces(2);

        const totalPaid = dto.payments
          .reduce((s, p) => s.plus(new Prisma.Decimal(p.amount.toString())), new Prisma.Decimal(0))
          .toDecimalPlaces(2);
        const rawDue = netAmount.minus(totalPaid);
        const dueAmount = rawDue.lt(0) ? new Prisma.Decimal(0) : rawDue.toDecimalPlaces(2);

        let invoiceStatus: InvoiceStatus;
        let paymentStatus: PaymentStatus;
        if (dueAmount.lte(0)) {
          invoiceStatus = InvoiceStatus.PAID;
          paymentStatus = PaymentStatus.PAID;
        } else if (totalPaid.gt(0)) {
          invoiceStatus = InvoiceStatus.PARTIALLY_PAID;
          paymentStatus = PaymentStatus.PARTIALLY_PAID;
        } else {
          invoiceStatus = InvoiceStatus.UNPAID;
          paymentStatus = PaymentStatus.PENDING;
        }

        const invoiceNumber = await this.generateInvoiceNumber(tx);

        const invoice = await tx.saleInvoice.create({
          data: {
            invoiceNumber,
            idempotencyKey: idempotencyKey ?? null,
            customerId: dto.customerId ?? null,
            totalAmount,
            discountAmount: totalDiscount,
            taxAmount: new Prisma.Decimal(0),
            netAmount,
            paidAmount: totalPaid,
            dueAmount,
            status: invoiceStatus,
            paymentStatus,
            saleType: 'RETAIL',
            cashierId: userId,
            notes: dto.notes ?? null,
          },
        });

        // Create line items, deduct rolls, record movements and wastage
        for (const line of processedLines) {
          await tx.saleInvoiceItem.create({
            data: {
              invoiceId: invoice.id,
              productId: line.productId,
              rollId: line.rollId,
              colorId: line.colorId,
              designId: line.designId,
              billedQuantity: line.billedQty,
              actualCutQuantity: line.actualCutQty,
              unitId: line.unitId,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              taxAmount: new Prisma.Decimal(0),
              subTotal: line.subTotal,
            },
          });

          await tx.roll.update({
            where: { id: line.rollId },
            data: {
              remainingLengthYard: line.rollRemainingAfter,
              status: line.newRollStatus as any,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              productId: line.productId,
              rollId: line.rollId,
              movementType: 'SALE',
              direction: 'OUT',
              quantity: line.actualCutYard,
              unitId: yardUnit.id,
              beforeQuantity: line.rollRemainingBefore,
              afterQuantity: line.rollRemainingAfter,
              referenceType: 'SALE_INVOICE',
              referenceId: invoice.id,
              remarks: `Sale ${invoiceNumber}`,
              userId,
            },
          });

          if (line.wastageYard.gt(0)) {
            await tx.wastageEntry.create({
              data: {
                rollId: line.rollId,
                productId: line.productId,
                quantity: line.wastageYard,
                unitId: yardUnit.id,
                reason: `Cutting wastage on sale ${invoiceNumber} — actual cut exceeded billed quantity`,
                userId,
              },
            });
          }
        }

        // Payment records
        for (const payment of dto.payments) {
          const amt = new Prisma.Decimal(payment.amount.toString());
          if (amt.lte(0)) continue;
          await tx.salePayment.create({
            data: {
              invoiceId: invoice.id,
              paymentMethod: payment.method,
              amount: amt,
              status: PaymentStatus.PAID,
              receivedById: userId,
            },
          });
        }

        // Customer ledger debit if unpaid balance
        if (dueAmount.gt(0) && dto.customerId) {
          const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
          if (customer) {
            const prevBalance = new Prisma.Decimal(customer.currentBalance.toString());
            const newBalance = prevBalance.plus(dueAmount).toDecimalPlaces(2);

            await tx.customerLedgerEntry.create({
              data: {
                customerId: dto.customerId,
                debit: dueAmount,
                credit: new Prisma.Decimal(0),
                balanceAfter: newBalance,
                referenceType: 'SALE_INVOICE',
                referenceId: invoice.id,
                remarks: `Sale ${invoiceNumber} — unpaid balance`,
              },
            });

            await tx.customer.update({
              where: { id: dto.customerId },
              data: { currentBalance: newBalance },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            userId,
            action: 'RETAIL_SALE_CREATED',
            tableName: 'sale_invoices',
            recordId: invoice.id,
            newValues: JSON.stringify({
              invoiceNumber,
              customerId: dto.customerId ?? null,
              netAmount: netAmount.toString(),
              totalPaid: totalPaid.toString(),
              dueAmount: dueAmount.toString(),
              lineCount: processedLines.length,
              rollIds: processedLines.map((l) => l.rollId),
            }),
          },
        });

        return invoice.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.prisma.saleInvoice.findUnique({
      where: { id: invoiceId! },
      include: INVOICE_INCLUDE,
    });
  }

  async findAll(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleInvoiceWhereInput = { saleType: 'RETAIL' };
    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search } },
        { customer: { name: { contains: query.search } } },
      ];
    }
    if (query.status) where.status = query.status as InvoiceStatus;

    const [data, total] = await Promise.all([
      this.prisma.saleInvoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          cashier: { select: { id: true, username: true } },
          _count: { select: { saleInvoiceItems: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.saleInvoice.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const invoice = await this.prisma.saleInvoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) throw AppError.notFound('Sale invoice not found', 'INVOICE_NOT_FOUND');
    return invoice;
  }

  async getReceipt(id: string) {
    const invoice = await this.prisma.saleInvoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) throw AppError.notFound('Sale invoice not found', 'INVOICE_NOT_FOUND');

    const settings = await this.prisma.companySetting.findMany({
      where: { key: { in: ['company_name', 'company_address', 'company_phone'] } },
    });
    const settingMap = new Map(settings.map((s) => [s.key, s.value]));

    return {
      invoice,
      company: {
        name: settingMap.get('company_name') ?? 'Textile Shop',
        address: settingMap.get('company_address') ?? '',
        phone: settingMap.get('company_phone') ?? '',
      },
    };
  }

  private async generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `INV-${y}${m}${d}`;

    const count = await tx.saleInvoice.count({
      where: { invoiceNumber: { startsWith: prefix } },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
}
