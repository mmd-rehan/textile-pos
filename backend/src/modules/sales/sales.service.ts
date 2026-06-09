import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { FeatureFlagsService } from '../settings/feature-flags.service';
import { CreateRetailSaleDto } from './dto/create-retail-sale.dto';
import { CreateWholesaleSaleDto } from './dto/create-wholesale-sale.dto';

const INVOICE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  cashier: { select: { id: true, username: true } },
  saleInvoiceItems: {
    include: {
      product: { select: { id: true, name: true, productCode: true, productType: true } },
      roll: { select: { id: true, rollNumber: true, barcode: true } },
      productStockItem: {
        select: {
          id: true,
          quantityOnHand: true,
          barcodeValue: true,
          color: { select: { id: true, name: true } },
          design: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, abbreviation: true } },
        },
      },
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

interface ProcessedRollLine {
  lineType: 'ROLL';
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

interface ProcessedQuantityLine {
  lineType: 'QUANTITY';
  productId: string;
  productStockItemId: string;
  colorId: string | null;
  designId: string | null;
  unitId: string;
  billedQty: Prisma.Decimal;
  qtyBefore: Prisma.Decimal;
  qtyAfter: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  grossSubTotal: Prisma.Decimal;
  subTotal: Prisma.Decimal;
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async createRetailSale(dto: CreateRetailSaleDto, userId: string, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.prisma.saleInvoice.findUnique({
        where: { idempotencyKey },
        include: INVOICE_INCLUDE,
      });
      if (existing) return existing;
    }

    const rollLineCount = dto.lines?.length ?? 0;
    const qtyLineCount = dto.quantityLines?.length ?? 0;
    if (rollLineCount + qtyLineCount === 0) {
      throw AppError.badRequest('Sale must have at least one line item', 'EMPTY_SALE');
    }

    const invoiceId = await this.prisma.$transaction(
      async (tx) => {
        // ── Load units + feature flags ────────────────────────────────────────
        const [yardUnit, meterUnit, baseCurrencySetting, wastageFlag, creditFlag] = await Promise.all([
          tx.unit.findFirst({ where: { abbreviation: 'yd' } }),
          tx.unit.findFirst({ where: { abbreviation: 'm' } }),
          tx.companySetting.findUnique({ where: { key: 'company_currency' } }),
          tx.featureFlag.findUnique({ where: { name: 'wastage_tracking' } }),
          tx.featureFlag.findUnique({ where: { name: 'credit_sales' } }),
        ]);
        if (!yardUnit) throw AppError.internal('Yard unit not configured', 'UNIT_NOT_FOUND');
        const baseCurrencyCode = baseCurrencySetting?.value ?? 'PKR';
        const wastageTrackingEnabled = wastageFlag?.isEnabled ?? false;
        const creditSalesEnabled = creditFlag?.isEnabled ?? false;

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
            select: { id: true, status: true },
          });
          if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
          if (customer.status === 'INACTIVE') {
            throw AppError.badRequest('Customer account is inactive', 'CUSTOMER_INACTIVE');
          }
        }

        // ── Process roll lines ────────────────────────────────────────────────
        const processedRollLines: ProcessedRollLine[] = [];

        for (const line of dto.lines ?? []) {
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

          const wastageYard = actualCutYard.gt(billedYard)
            ? actualCutYard.minus(billedYard).toDecimalPlaces(4)
            : new Prisma.Decimal(0);

          if (wastageYard.gt(0) && !wastageTrackingEnabled) {
            throw AppError.forbidden(
              'This feature is disabled in system settings.',
              'FEATURE_DISABLED',
              { feature: 'WASTAGE_TRACKING' },
            );
          }

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

          processedRollLines.push({
            lineType: 'ROLL',
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

        // ── Process quantity lines ────────────────────────────────────────────
        const processedQuantityLines: ProcessedQuantityLine[] = [];

        for (const line of dto.quantityLines ?? []) {
          const stockItem = await tx.productStockItem.findUnique({
            where: { id: line.productStockItemId },
          });
          if (!stockItem) {
            throw AppError.notFound(`Stock item not found: ${line.productStockItemId}`, 'STOCK_ITEM_NOT_FOUND');
          }
          if (stockItem.productId !== line.productId) {
            throw AppError.badRequest(
              `Stock item does not belong to product ${line.productId}`,
              'STOCK_ITEM_PRODUCT_MISMATCH',
            );
          }
          if (!stockItem.isActive) {
            throw AppError.badRequest(`Stock item is inactive and cannot be sold`, 'STOCK_ITEM_INACTIVE');
          }

          const billedQty = new Prisma.Decimal(line.quantity.toString());
          const qtyBefore = new Prisma.Decimal(stockItem.quantityOnHand.toString());

          if (billedQty.gt(qtyBefore)) {
            throw AppError.badRequest(
              `Insufficient stock: requested ${billedQty.toFixed(4)}, available ${qtyBefore.toFixed(4)}`,
              'INSUFFICIENT_STOCK',
            );
          }

          const qtyAfter = qtyBefore.minus(billedQty).toDecimalPlaces(4);
          const unitPrice = new Prisma.Decimal(line.unitPrice.toString());
          const discountAmount = new Prisma.Decimal((line.discountAmount ?? 0).toString());
          const grossSubTotal = billedQty.times(unitPrice).toDecimalPlaces(2);
          const subTotal = grossSubTotal.minus(discountAmount).toDecimalPlaces(2);
          if (subTotal.lt(0)) {
            throw AppError.badRequest(`Line subtotal cannot be negative`, 'NEGATIVE_SUBTOTAL');
          }

          processedQuantityLines.push({
            lineType: 'QUANTITY',
            productId: line.productId,
            productStockItemId: line.productStockItemId,
            colorId: stockItem.colorId,
            designId: stockItem.designId,
            unitId: stockItem.unitId,
            billedQty,
            qtyBefore,
            qtyAfter,
            unitPrice,
            discountAmount,
            grossSubTotal,
            subTotal,
          });
        }

        // ── Load tax settings ─────────────────────────────────────────────────
        const [taxEnabledSetting, taxRateSetting, taxLabelSetting] = await Promise.all([
          tx.companySetting.findUnique({ where: { key: 'company_tax_enabled' } }),
          tx.companySetting.findUnique({ where: { key: 'company_tax_rate' } }),
          tx.companySetting.findUnique({ where: { key: 'company_tax_label' } }),
        ]);
        const taxEnabled = taxEnabledSetting?.value === 'true';
        const taxRatePercent = new Prisma.Decimal(taxRateSetting?.value ?? '0');
        const taxLabel = taxLabelSetting?.value || (taxEnabled ? 'Tax' : null);

        if (taxEnabled && (taxRatePercent.lt(0) || taxRatePercent.gt(100))) {
          throw AppError.badRequest('Tax rate must be between 0 and 100', 'INVALID_TAX_RATE');
        }

        // ── Invoice totals ────────────────────────────────────────────────────
        const totalAmount = [
          ...processedRollLines.map((l) => l.grossSubTotal),
          ...processedQuantityLines.map((l) => l.grossSubTotal),
        ].reduce((s, v) => s.plus(v), new Prisma.Decimal(0)).toDecimalPlaces(2);

        const totalDiscount = [
          ...processedRollLines.map((l) => l.discountAmount),
          ...processedQuantityLines.map((l) => l.discountAmount),
        ].reduce((s, v) => s.plus(v), new Prisma.Decimal(0)).toDecimalPlaces(2);

        const taxableAmount = totalAmount.minus(totalDiscount).toDecimalPlaces(2);
        if (taxableAmount.lt(0)) {
          throw AppError.badRequest('Taxable amount cannot be negative', 'NEGATIVE_TAXABLE_AMOUNT');
        }

        const taxAmount = taxEnabled
          ? taxableAmount.times(taxRatePercent).dividedBy(100).toDecimalPlaces(2)
          : new Prisma.Decimal(0);

        const grandTotal = taxableAmount.plus(taxAmount).toDecimalPlaces(2);

        const totalPaid = (dto.payments ?? [])
          .reduce((s, p) => s.plus(new Prisma.Decimal(p.amount.toString())), new Prisma.Decimal(0))
          .toDecimalPlaces(2);
        const rawDue = grandTotal.minus(totalPaid);
        const dueAmount = rawDue.lt(0) ? new Prisma.Decimal(0) : rawDue.toDecimalPlaces(2);

        if (dueAmount.gt(0) && !creditSalesEnabled) {
          throw AppError.forbidden(
            'Credit sales are disabled. Full payment is required.',
            'FEATURE_DISABLED',
            { feature: 'CREDIT_SALES' },
          );
        }

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
            taxableAmount,
            taxEnabled,
            taxRatePercent,
            taxLabel: taxEnabled ? (taxLabel ?? 'Tax') : null,
            taxAmount,
            netAmount: grandTotal,
            paidAmount: totalPaid,
            dueAmount,
            currencyCode: baseCurrencyCode,
            status: invoiceStatus,
            paymentStatus,
            saleType: 'RETAIL',
            cashierId: userId,
            notes: dto.notes ?? null,
          },
        });

        // ── Write roll line items, deduct rolls, record movements + wastage ──
        for (const line of processedRollLines) {
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
                sourceType: 'SALE_OVERCUT',
                saleInvoiceId: invoice.id,
                reason: `Cutting wastage on sale ${invoiceNumber} — actual cut exceeded billed quantity`,
                userId,
              },
            });
          }
        }

        // ── Write quantity line items, deduct stock ───────────────────────────
        for (const line of processedQuantityLines) {
          await tx.saleInvoiceItem.create({
            data: {
              invoiceId: invoice.id,
              productId: line.productId,
              productStockItemId: line.productStockItemId,
              rollId: null,
              colorId: line.colorId,
              designId: line.designId,
              billedQuantity: line.billedQty,
              actualCutQuantity: null,
              unitId: line.unitId,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              taxAmount: new Prisma.Decimal(0),
              subTotal: line.subTotal,
            },
          });

          await tx.productStockItem.update({
            where: { id: line.productStockItemId },
            data: { quantityOnHand: line.qtyAfter },
          });

          await tx.inventoryMovement.create({
            data: {
              productId: line.productId,
              productStockItemId: line.productStockItemId,
              movementType: 'SALE',
              direction: 'OUT',
              quantity: line.billedQty,
              unitId: line.unitId,
              beforeQuantity: line.qtyBefore,
              afterQuantity: line.qtyAfter,
              referenceType: 'SALE_INVOICE',
              referenceId: invoice.id,
              remarks: `Sale ${invoiceNumber}`,
              userId,
            },
          });
        }

        // ── Payment records ───────────────────────────────────────────────────
        for (const payment of dto.payments ?? []) {
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

        // ── Customer ledger ───────────────────────────────────────────────────
        if (dueAmount.gt(0) && dto.customerId) {
          const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
          if (customer) {
            if (customer.type === 'CREDIT' && customer.creditLimit) {
              const projectedBalance = new Prisma.Decimal(customer.currentBalance.toString()).plus(dueAmount);
              if (projectedBalance.gt(customer.creditLimit)) {
                const over = projectedBalance.minus(customer.creditLimit).toFixed(2);
                throw AppError.badRequest(
                  `Credit limit exceeded by ${over}. Limit: ${customer.creditLimit.toFixed(2)}, current balance: ${customer.currentBalance.toFixed(2)}`,
                  'CREDIT_LIMIT_EXCEEDED',
                );
              }
            }
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
              taxableAmount: taxableAmount.toString(),
              taxEnabled,
              taxRatePercent: taxRatePercent.toString(),
              taxLabel,
              taxAmount: taxAmount.toString(),
              grandTotal: grandTotal.toString(),
              totalPaid: totalPaid.toString(),
              dueAmount: dueAmount.toString(),
              rollLineCount: processedRollLines.length,
              quantityLineCount: processedQuantityLines.length,
              rollIds: processedRollLines.map((l) => l.rollId),
              stockItemIds: processedQuantityLines.map((l) => l.productStockItemId),
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

  async createWholesaleSale(dto: CreateWholesaleSaleDto, userId: string, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.prisma.saleInvoice.findUnique({
        where: { idempotencyKey },
        include: INVOICE_INCLUDE,
      });
      if (existing) return existing;
    }

    await this.featureFlags.assertEnabled('WHOLESALE_POS');

    const rollLineCount = dto.lines?.length ?? 0;
    const qtyLineCount = dto.quantityLines?.length ?? 0;
    if (rollLineCount + qtyLineCount === 0) {
      throw AppError.badRequest('Sale must have at least one line item', 'EMPTY_SALE');
    }

    const invoiceId = await this.prisma.$transaction(
      async (tx) => {
        // ── Load units + feature flags ────────────────────────────────────────
        const [yardUnit, meterUnit, wsBaseCurrencySetting, wsWastageFlag, wsCreditFlag] = await Promise.all([
          tx.unit.findFirst({ where: { abbreviation: 'yd' } }),
          tx.unit.findFirst({ where: { abbreviation: 'm' } }),
          tx.companySetting.findUnique({ where: { key: 'company_currency' } }),
          tx.featureFlag.findUnique({ where: { name: 'wastage_tracking' } }),
          tx.featureFlag.findUnique({ where: { name: 'credit_sales' } }),
        ]);
        if (!yardUnit) throw AppError.internal('Yard unit not configured', 'UNIT_NOT_FOUND');
        const wsBaseCurrencyCode = wsBaseCurrencySetting?.value ?? 'PKR';
        const wsWastageTrackingEnabled = wsWastageFlag?.isEnabled ?? false;
        const wsCreditSalesEnabled = wsCreditFlag?.isEnabled ?? false;

        let meterToYardFactor = new Prisma.Decimal('1.093613');
        if (meterUnit) {
          const conv = await tx.unitConversion.findFirst({
            where: { fromUnitId: meterUnit.id, toUnitId: yardUnit.id },
          });
          if (conv) meterToYardFactor = new Prisma.Decimal(conv.factor.toString());
        }

        // ── Validate customer (required for wholesale) ────────────────────────
        const customer = await tx.customer.findUnique({
          where: { id: dto.customerId },
        });
        if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
        if (customer.status === 'INACTIVE') {
          throw AppError.badRequest('Customer account is inactive', 'CUSTOMER_INACTIVE');
        }

        // ── Process roll lines ────────────────────────────────────────────────
        const processedRollLines: ProcessedRollLine[] = [];

        for (const line of dto.lines ?? []) {
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

          let billedQty: Prisma.Decimal;
          let actualCutQty: Prisma.Decimal;
          let lineUnitId: string;
          let toYardFactor: Prisma.Decimal;

          if (line.isFullRoll) {
            billedQty = new Prisma.Decimal(roll.remainingLengthYard.toString());
            actualCutQty = billedQty;
            lineUnitId = yardUnit.id;
            toYardFactor = new Prisma.Decimal(1);
          } else {
            if (line.billedQuantity == null) {
              throw AppError.badRequest(
                `Roll ${roll.rollNumber}: billedQuantity is required when isFullRoll is false`,
                'BILLED_QTY_REQUIRED',
              );
            }
            const isMetric = line.unit === 'METER';
            lineUnitId = isMetric ? (meterUnit?.id ?? yardUnit.id) : yardUnit.id;
            toYardFactor = isMetric ? meterToYardFactor : new Prisma.Decimal(1);
            billedQty = new Prisma.Decimal(line.billedQuantity.toString());
            actualCutQty =
              line.actualCutQuantity != null
                ? new Prisma.Decimal(line.actualCutQuantity.toString())
                : billedQty;
          }

          const billedYard = billedQty.times(toYardFactor).toDecimalPlaces(4);
          const actualCutYard = actualCutQty.times(toYardFactor).toDecimalPlaces(4);

          const rollRemainingBefore = new Prisma.Decimal(roll.remainingLengthYard.toString());
          if (actualCutYard.gt(rollRemainingBefore)) {
            throw AppError.badRequest(
              `Roll ${roll.rollNumber} has ${rollRemainingBefore.toFixed(2)} yd remaining, cannot cut ${actualCutYard.toFixed(2)} yd`,
              'INSUFFICIENT_ROLL_LENGTH',
            );
          }

          const wastageYard = actualCutYard.gt(billedYard)
            ? actualCutYard.minus(billedYard).toDecimalPlaces(4)
            : new Prisma.Decimal(0);

          if (wastageYard.gt(0) && !wsWastageTrackingEnabled) {
            throw AppError.forbidden(
              'This feature is disabled in system settings.',
              'FEATURE_DISABLED',
              { feature: 'WASTAGE_TRACKING' },
            );
          }

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

          processedRollLines.push({
            lineType: 'ROLL',
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

        // ── Process quantity lines ────────────────────────────────────────────
        const processedQuantityLines: ProcessedQuantityLine[] = [];

        for (const line of dto.quantityLines ?? []) {
          const stockItem = await tx.productStockItem.findUnique({
            where: { id: line.productStockItemId },
          });
          if (!stockItem) {
            throw AppError.notFound(`Stock item not found: ${line.productStockItemId}`, 'STOCK_ITEM_NOT_FOUND');
          }
          if (stockItem.productId !== line.productId) {
            throw AppError.badRequest(
              `Stock item does not belong to product ${line.productId}`,
              'STOCK_ITEM_PRODUCT_MISMATCH',
            );
          }
          if (!stockItem.isActive) {
            throw AppError.badRequest(`Stock item is inactive and cannot be sold`, 'STOCK_ITEM_INACTIVE');
          }

          const billedQty = new Prisma.Decimal(line.quantity.toString());
          const qtyBefore = new Prisma.Decimal(stockItem.quantityOnHand.toString());

          if (billedQty.gt(qtyBefore)) {
            throw AppError.badRequest(
              `Insufficient stock: requested ${billedQty.toFixed(4)}, available ${qtyBefore.toFixed(4)}`,
              'INSUFFICIENT_STOCK',
            );
          }

          const qtyAfter = qtyBefore.minus(billedQty).toDecimalPlaces(4);
          const unitPrice = new Prisma.Decimal(line.unitPrice.toString());
          const discountAmount = new Prisma.Decimal((line.discountAmount ?? 0).toString());
          const grossSubTotal = billedQty.times(unitPrice).toDecimalPlaces(2);
          const subTotal = grossSubTotal.minus(discountAmount).toDecimalPlaces(2);
          if (subTotal.lt(0)) {
            throw AppError.badRequest(`Line subtotal cannot be negative`, 'NEGATIVE_SUBTOTAL');
          }

          processedQuantityLines.push({
            lineType: 'QUANTITY',
            productId: line.productId,
            productStockItemId: line.productStockItemId,
            colorId: stockItem.colorId,
            designId: stockItem.designId,
            unitId: stockItem.unitId,
            billedQty,
            qtyBefore,
            qtyAfter,
            unitPrice,
            discountAmount,
            grossSubTotal,
            subTotal,
          });
        }

        // ── Load tax settings ─────────────────────────────────────────────────
        const [wsTaxEnabledSetting, wsTaxRateSetting, wsTaxLabelSetting] = await Promise.all([
          tx.companySetting.findUnique({ where: { key: 'company_tax_enabled' } }),
          tx.companySetting.findUnique({ where: { key: 'company_tax_rate' } }),
          tx.companySetting.findUnique({ where: { key: 'company_tax_label' } }),
        ]);
        const wsTaxEnabled = wsTaxEnabledSetting?.value === 'true';
        const wsTaxRatePercent = new Prisma.Decimal(wsTaxRateSetting?.value ?? '0');
        const wsTaxLabel = wsTaxLabelSetting?.value || (wsTaxEnabled ? 'Tax' : null);

        if (wsTaxEnabled && (wsTaxRatePercent.lt(0) || wsTaxRatePercent.gt(100))) {
          throw AppError.badRequest('Tax rate must be between 0 and 100', 'INVALID_TAX_RATE');
        }

        // ── Invoice totals ────────────────────────────────────────────────────
        const totalAmount = [
          ...processedRollLines.map((l) => l.grossSubTotal),
          ...processedQuantityLines.map((l) => l.grossSubTotal),
        ].reduce((s, v) => s.plus(v), new Prisma.Decimal(0)).toDecimalPlaces(2);

        const totalDiscount = [
          ...processedRollLines.map((l) => l.discountAmount),
          ...processedQuantityLines.map((l) => l.discountAmount),
        ].reduce((s, v) => s.plus(v), new Prisma.Decimal(0)).toDecimalPlaces(2);

        const wsTaxableAmount = totalAmount.minus(totalDiscount).toDecimalPlaces(2);
        if (wsTaxableAmount.lt(0)) {
          throw AppError.badRequest('Taxable amount cannot be negative', 'NEGATIVE_TAXABLE_AMOUNT');
        }

        const wsTaxAmount = wsTaxEnabled
          ? wsTaxableAmount.times(wsTaxRatePercent).dividedBy(100).toDecimalPlaces(2)
          : new Prisma.Decimal(0);

        const wsGrandTotal = wsTaxableAmount.plus(wsTaxAmount).toDecimalPlaces(2);

        const totalPaid = (dto.payments ?? [])
          .reduce((s, p) => s.plus(new Prisma.Decimal(p.amount.toString())), new Prisma.Decimal(0))
          .toDecimalPlaces(2);
        const rawDue = wsGrandTotal.minus(totalPaid);
        const dueAmount = rawDue.lt(0) ? new Prisma.Decimal(0) : rawDue.toDecimalPlaces(2);

        if (dueAmount.gt(0) && !wsCreditSalesEnabled) {
          throw AppError.forbidden(
            'Credit sales are disabled. Full payment is required.',
            'FEATURE_DISABLED',
            { feature: 'CREDIT_SALES' },
          );
        }

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

        const invoiceNumber = await this.generateInvoiceNumber(tx, 'WHL');

        const invoice = await tx.saleInvoice.create({
          data: {
            invoiceNumber,
            idempotencyKey: idempotencyKey ?? null,
            customerId: dto.customerId,
            totalAmount,
            discountAmount: totalDiscount,
            taxableAmount: wsTaxableAmount,
            taxEnabled: wsTaxEnabled,
            taxRatePercent: wsTaxRatePercent,
            taxLabel: wsTaxEnabled ? (wsTaxLabel ?? 'Tax') : null,
            taxAmount: wsTaxAmount,
            netAmount: wsGrandTotal,
            paidAmount: totalPaid,
            dueAmount,
            currencyCode: wsBaseCurrencyCode,
            status: invoiceStatus,
            paymentStatus,
            saleType: 'WHOLESALE',
            cashierId: userId,
            notes: dto.notes ?? null,
          },
        });

        // ── Write roll line items, deduct rolls, record movements + wastage ──
        for (const line of processedRollLines) {
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
              remarks: `Wholesale sale ${invoiceNumber}`,
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
                sourceType: 'SALE_OVERCUT',
                saleInvoiceId: invoice.id,
                reason: `Cutting wastage on wholesale sale ${invoiceNumber} — actual cut exceeded billed quantity`,
                userId,
              },
            });
          }
        }

        // ── Write quantity line items, deduct stock ───────────────────────────
        for (const line of processedQuantityLines) {
          await tx.saleInvoiceItem.create({
            data: {
              invoiceId: invoice.id,
              productId: line.productId,
              productStockItemId: line.productStockItemId,
              rollId: null,
              colorId: line.colorId,
              designId: line.designId,
              billedQuantity: line.billedQty,
              actualCutQuantity: null,
              unitId: line.unitId,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              taxAmount: new Prisma.Decimal(0),
              subTotal: line.subTotal,
            },
          });

          await tx.productStockItem.update({
            where: { id: line.productStockItemId },
            data: { quantityOnHand: line.qtyAfter },
          });

          await tx.inventoryMovement.create({
            data: {
              productId: line.productId,
              productStockItemId: line.productStockItemId,
              movementType: 'SALE',
              direction: 'OUT',
              quantity: line.billedQty,
              unitId: line.unitId,
              beforeQuantity: line.qtyBefore,
              afterQuantity: line.qtyAfter,
              referenceType: 'SALE_INVOICE',
              referenceId: invoice.id,
              remarks: `Wholesale sale ${invoiceNumber}`,
              userId,
            },
          });
        }

        // ── Payment records ───────────────────────────────────────────────────
        for (const payment of dto.payments ?? []) {
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

        // ── Customer ledger ───────────────────────────────────────────────────
        if (dueAmount.gt(0)) {
          if (customer.type === 'CREDIT' && customer.creditLimit) {
            const projectedBalance = new Prisma.Decimal(customer.currentBalance.toString()).plus(dueAmount);
            if (projectedBalance.gt(customer.creditLimit)) {
              const over = projectedBalance.minus(customer.creditLimit).toFixed(2);
              throw AppError.badRequest(
                `Credit limit exceeded by ${over}. Limit: ${customer.creditLimit.toFixed(2)}, current balance: ${customer.currentBalance.toFixed(2)}`,
                'CREDIT_LIMIT_EXCEEDED',
              );
            }
          }
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
              remarks: `Wholesale sale ${invoiceNumber} — unpaid balance`,
            },
          });

          await tx.customer.update({
            where: { id: dto.customerId },
            data: { currentBalance: newBalance },
          });
        }

        await tx.auditLog.create({
          data: {
            userId,
            action: 'WHOLESALE_SALE_CREATED',
            tableName: 'sale_invoices',
            recordId: invoice.id,
            newValues: JSON.stringify({
              invoiceNumber,
              customerId: dto.customerId,
              taxableAmount: wsTaxableAmount.toString(),
              taxEnabled: wsTaxEnabled,
              taxRatePercent: wsTaxRatePercent.toString(),
              taxLabel: wsTaxLabel,
              taxAmount: wsTaxAmount.toString(),
              grandTotal: wsGrandTotal.toString(),
              totalPaid: totalPaid.toString(),
              dueAmount: dueAmount.toString(),
              rollLineCount: processedRollLines.length,
              quantityLineCount: processedQuantityLines.length,
              rollIds: processedRollLines.map((l) => l.rollId),
              stockItemIds: processedQuantityLines.map((l) => l.productStockItemId),
              deliveryChallanNumber: dto.deliveryChallanNumber ?? null,
              deliveryAddress: dto.deliveryAddress ?? null,
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

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    saleType?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    cashierId?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleInvoiceWhereInput = {};

    if (query.saleType) where.saleType = query.saleType as any;
    if (query.status) where.status = query.status as InvoiceStatus;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus as any;
    if (query.cashierId) where.cashierId = query.cashierId;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search } },
        { customer: { name: { contains: query.search } } },
        { customer: { phone: { contains: query.search } } },
      ];
    }

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
      where: { key: { in: ['company_name', 'company_address', 'company_phone', 'invoice_footer'] } },
    });
    const settingMap = new Map(settings.map((s) => [s.key, s.value]));

    return {
      invoice,
      company: {
        name: settingMap.get('company_name') ?? 'Textile Shop',
        address: settingMap.get('company_address') ?? '',
        phone: settingMap.get('company_phone') ?? '',
        invoiceFooter: settingMap.get('invoice_footer') ?? 'Thank you for your business!',
      },
    };
  }

  private async generateInvoiceNumber(
    tx: Prisma.TransactionClient,
    series: 'INV' | 'WHL' = 'INV',
  ): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${series}-${y}${m}${d}`;

    const count = await tx.saleInvoice.count({
      where: { invoiceNumber: { startsWith: datePrefix } },
    });

    return `${datePrefix}-${String(count + 1).padStart(4, '0')}`;
  }
}
