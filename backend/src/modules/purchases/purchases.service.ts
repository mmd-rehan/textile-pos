import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { QueryPurchaseDto } from './dto/query-purchase.dto';

export const BASE_CURRENCY_CODE = 'PKR';

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true, contactName: true } },
  purchaseItems: {
    include: {
      product: { select: { id: true, name: true, productCode: true } },
      unit: { select: { id: true, name: true, abbreviation: true } },
    },
  },
  purchaseRolls: {
    include: {
      roll: {
        select: {
          id: true,
          rollNumber: true,
          barcode: true,
          originalLengthYard: true,
          remainingLengthYard: true,
          purchasePricePerYardOriginalCurrency: true,
          purchasePricePerYardBaseCurrency: true,
          salePricePerYard: true,
          status: true,
          location: true,
          color: { select: { id: true, name: true } },
          design: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, productCode: true } },
        },
      },
    },
  },
  _count: { select: { purchaseRolls: true } },
} as const;

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(query: QueryPurchaseDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {};
    if (query.search) {
      where.OR = [
        { poNumber: { contains: query.search } },
        { supplier: { name: { contains: query.search } } },
      ];
    }
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) where.status = query.status as InvoiceStatus;

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { purchaseRolls: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: PO_INCLUDE,
    });
    if (!po) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');
    return po;
  }

  async create(dto: CreatePurchaseDto, userId: string) {
    const rollNumbers = dto.rolls.map(() => this.generateRollNumber());
    const barcodes = dto.rolls.map(() => this.generateBarcode());

    const createdPoId = await this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: dto.supplierId } });
      if (!supplier) throw AppError.notFound('Supplier not found', 'SUPPLIER_NOT_FOUND');

      const productIds = [...new Set(dto.rolls.map((r) => r.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, defaultUnitId: true, name: true },
      });
      if (products.length !== productIds.length) {
        throw AppError.badRequest('One or more products not found', 'PRODUCT_NOT_FOUND');
      }
      const productUnitMap = new Map(products.map((p) => [p.id, p.defaultUnitId]));

      // ── Currency / exchange rate resolution ──────────────────────────────
      const currencyCode = dto.currency ?? BASE_CURRENCY_CODE;
      const isBaseCurrency = currencyCode === BASE_CURRENCY_CODE;

      // Exchange rate: 1.0 for base currency, user-supplied for foreign currency
      const exchangeRate = isBaseCurrency
        ? new Prisma.Decimal(1)
        : new Prisma.Decimal(dto.exchangeRateToBaseCurrency ?? 1);

      if (!isBaseCurrency && exchangeRate.lte(0)) {
        throw AppError.badRequest(
          'Exchange rate must be positive for foreign-currency purchases',
          'INVALID_EXCHANGE_RATE',
        );
      }

      // ── Batch handling ────────────────────────────────────────────────────
      let batchId = dto.batchId ?? null;
      if (!batchId && dto.batchNumber) {
        const existing = await tx.batch.findUnique({ where: { batchNumber: dto.batchNumber } });
        if (existing) {
          batchId = existing.id;
        } else {
          const batch = await tx.batch.create({
            data: {
              batchNumber: dto.batchNumber,
              supplierId: dto.supplierId,
              notes: dto.batchNotes,
              receivedAt: new Date(),
            },
          });
          batchId = batch.id;
        }
      }

      // ── Roll data with Decimal arithmetic ────────────────────────────────
      const rollsData = dto.rolls.map((r) => {
        const originalLength = new Prisma.Decimal(r.originalLengthYard);
        const priceOriginal = new Prisma.Decimal(r.purchasePricePerYard);
        const priceBase = priceOriginal.times(exchangeRate).toDecimalPlaces(2);
        const salePrice = new Prisma.Decimal(r.salePricePerYard);
        return { ...r, originalLength, priceOriginal, priceBase, salePrice };
      });

      // ── PO-level totals ───────────────────────────────────────────────────
      const subtotalOriginal = rollsData.reduce(
        (sum, r) => sum.plus(r.originalLength.times(r.priceOriginal)),
        new Prisma.Decimal(0),
      ).toDecimalPlaces(2);

      const subtotalBase = rollsData.reduce(
        (sum, r) => sum.plus(r.originalLength.times(r.priceBase)),
        new Prisma.Decimal(0),
      ).toDecimalPlaces(2);

      const totalOriginal = subtotalOriginal; // no discount/tax yet
      const totalBase = subtotalBase;

      const paidAmountOriginal = new Prisma.Decimal(dto.paidAmount ?? 0);
      const payableOriginal = totalOriginal.minus(paidAmountOriginal);

      let status: InvoiceStatus;
      if (payableOriginal.lte(0)) status = InvoiceStatus.PAID;
      else if (paidAmountOriginal.gt(0)) status = InvoiceStatus.PARTIALLY_PAID;
      else status = InvoiceStatus.UNPAID;

      // ── Create PurchaseOrder ──────────────────────────────────────────────
      const poNumber = await this.generatePoNumber(tx);
      const paidBase = paidAmountOriginal.times(exchangeRate).toDecimalPlaces(2);
      const dueOriginal = payableOriginal.lte(0) ? new Prisma.Decimal(0) : payableOriginal;
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: dto.supplierId,
          purchaseCurrencyCode: currencyCode,
          exchangeRateToBaseCurrency: exchangeRate,
          subtotalOriginalCurrency: subtotalOriginal,
          totalOriginalCurrency: totalOriginal,
          subtotalBaseCurrency: subtotalBase,
          totalBaseCurrency: totalBase,
          paidAmountOriginalCurrency: paidAmountOriginal.toDecimalPlaces(2),
          dueAmountOriginalCurrency: dueOriginal.toDecimalPlaces(2),
          status,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
          notes: dto.notes,
        },
      });
      void paidBase; // stored on PO for reference; ledger uses base amounts

      // ── Create Rolls + PurchaseRolls + InventoryMovements ────────────────
      for (let i = 0; i < rollsData.length; i++) {
        const r = rollsData[i];
        const unitId = productUnitMap.get(r.productId)!;

        // Find the yard unit ID for inventory movements (rolls are always measured in yards)
        const yardUnit = await tx.unit.findFirst({ where: { abbreviation: 'yd' } });
        const movementUnitId = yardUnit?.id ?? unitId;

        const roll = await tx.roll.create({
          data: {
            rollNumber: rollNumbers[i],
            barcode: barcodes[i],
            productId: r.productId,
            colorId: r.colorId ?? null,
            designId: r.designId ?? null,
            batchId,
            originalLengthYard: r.originalLength,
            remainingLengthYard: r.originalLength,
            purchasePricePerYardOriginalCurrency: r.priceOriginal,
            purchasePricePerYardBaseCurrency: r.priceBase,
            salePricePerYard: r.salePrice,
            status: 'IN_STOCK',
            location: r.location ?? null,
          },
        });

        await tx.purchaseRoll.create({
          data: {
            purchaseOrderId: po.id,
            rollId: roll.id,
            purchasePricePerUnitOriginalCurrency: r.priceOriginal,
            purchasePricePerUnitBaseCurrency: r.priceBase,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: r.productId,
            rollId: roll.id,
            movementType: 'PURCHASE',
            direction: 'IN',
            quantity: r.originalLength,
            unitId: movementUnitId,
            beforeQuantity: new Prisma.Decimal(0),
            afterQuantity: r.originalLength,
            referenceType: 'PURCHASE_ORDER',
            referenceId: po.id,
            remarks: `Purchase from PO ${poNumber}`,
            userId,
          },
        });
      }

      // ── Aggregate PurchaseItems per product ───────────────────────────────
      const productItemMap = new Map<
        string,
        {
          qty: Prisma.Decimal;
          costOriginal: Prisma.Decimal;
          costBase: Prisma.Decimal;
          lineTotalOriginal: Prisma.Decimal;
          lineTotalBase: Prisma.Decimal;
          unitId: string;
        }
      >();

      for (const r of rollsData) {
        const unitId = productUnitMap.get(r.productId)!;
        const lineOriginal = r.originalLength.times(r.priceOriginal);
        const lineBase = r.originalLength.times(r.priceBase);
        const existing = productItemMap.get(r.productId);
        if (existing) {
          productItemMap.set(r.productId, {
            qty: existing.qty.plus(r.originalLength),
            costOriginal: r.priceOriginal,
            costBase: r.priceBase,
            lineTotalOriginal: existing.lineTotalOriginal.plus(lineOriginal),
            lineTotalBase: existing.lineTotalBase.plus(lineBase),
            unitId,
          });
        } else {
          productItemMap.set(r.productId, {
            qty: r.originalLength,
            costOriginal: r.priceOriginal,
            costBase: r.priceBase,
            lineTotalOriginal: lineOriginal,
            lineTotalBase: lineBase,
            unitId,
          });
        }
      }

      for (const [productId, item] of productItemMap.entries()) {
        await tx.purchaseItem.create({
          data: {
            purchaseOrderId: po.id,
            productId,
            orderedQuantity: item.qty,
            receivedQuantity: item.qty,
            unitId: item.unitId,
            unitCostOriginalCurrency: item.costOriginal.toDecimalPlaces(2),
            lineTotalOriginalCurrency: item.lineTotalOriginal.toDecimalPlaces(2),
            unitCostBaseCurrency: item.costBase.toDecimalPlaces(2),
            lineTotalBaseCurrency: item.lineTotalBase.toDecimalPlaces(2),
          },
        });
      }

      // ── Supplier ledger + balance (always in base currency) ───────────────
      if (payableOriginal.gt(0)) {
        const payableBase = payableOriginal.times(exchangeRate).toDecimalPlaces(2);
        const supplierBalance = new Prisma.Decimal(supplier.currentBalance.toString());
        const newBalanceBase = supplierBalance.plus(payableBase);

        await tx.supplierLedgerEntry.create({
          data: {
            supplierId: dto.supplierId,
            currencyCode,
            debitOriginalCurrency: new Prisma.Decimal(0),
            creditOriginalCurrency: payableOriginal.toDecimalPlaces(2),
            exchangeRateToBaseCurrency: exchangeRate,
            debitBaseCurrency: new Prisma.Decimal(0),
            creditBaseCurrency: payableBase,
            balanceAfterBase: newBalanceBase,
            referenceType: 'PURCHASE_ORDER',
            referenceId: po.id,
            remarks: `Purchase order ${poNumber} — payable (${currencyCode})`,
          },
        });

        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: { currentBalance: newBalanceBase },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PURCHASE_CREATED',
          tableName: 'purchase_orders',
          recordId: po.id,
          newValues: JSON.stringify({
            poNumber,
            supplierId: dto.supplierId,
            currencyCode,
            exchangeRateToBaseCurrency: exchangeRate.toString(),
            totalOriginalCurrency: totalOriginal.toString(),
            totalBaseCurrency: totalBase.toString(),
            paidAmount: paidAmountOriginal.toString(),
            rollCount: dto.rolls.length,
          }),
        },
      });

      return po.id;
    });

    return this.prisma.purchaseOrder.findUnique({ where: { id: createdPoId! }, include: PO_INCLUDE });
  }

  async getPayments(purchaseId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: purchaseId } });
    if (!po) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');
    return this.prisma.supplierPayment.findMany({
      where: { purchaseOrderId: purchaseId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async createPayment(purchaseId: string, dto: CreateSupplierPaymentDto, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id: purchaseId } });
      if (!po) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');
      if (po.status === InvoiceStatus.PAID) {
        throw AppError.badRequest('Purchase order is already fully paid', 'PO_ALREADY_PAID');
      }

      const paymentAmount = new Prisma.Decimal(dto.amount);
      const currentDue = new Prisma.Decimal(po.dueAmountOriginalCurrency.toString());

      if (paymentAmount.lte(0)) {
        throw AppError.badRequest('Payment amount must be greater than zero', 'INVALID_PAYMENT_AMOUNT');
      }
      if (paymentAmount.gt(currentDue)) {
        throw AppError.badRequest(
          `Payment amount exceeds due amount of ${currentDue.toFixed(2)} ${po.purchaseCurrencyCode}`,
          'PAYMENT_EXCEEDS_DUE',
        );
      }

      const exchangeRate = new Prisma.Decimal(po.exchangeRateToBaseCurrency.toString());
      const amountBase = paymentAmount.times(exchangeRate).toDecimalPlaces(2);

      // Create payment record
      await tx.supplierPayment.create({
        data: {
          purchaseOrderId: purchaseId,
          supplierId: po.supplierId,
          amountOriginalCurrency: paymentAmount.toDecimalPlaces(2),
          amountBaseCurrency: amountBase,
          currencyCode: po.purchaseCurrencyCode,
          exchangeRateToBaseCurrency: exchangeRate,
          paymentMethod: dto.paymentMethod,
          paymentDate: new Date(dto.paymentDate),
          notes: dto.notes,
        },
      });

      // Update PO paid/due amounts and status
      const newPaid = new Prisma.Decimal(po.paidAmountOriginalCurrency.toString()).plus(paymentAmount);
      const newDue = currentDue.minus(paymentAmount).toDecimalPlaces(2);
      let newStatus: InvoiceStatus;
      if (newDue.lte(0)) newStatus = InvoiceStatus.PAID;
      else newStatus = InvoiceStatus.PARTIALLY_PAID;

      await tx.purchaseOrder.update({
        where: { id: purchaseId },
        data: {
          paidAmountOriginalCurrency: newPaid.toDecimalPlaces(2),
          dueAmountOriginalCurrency: newDue.lt(0) ? new Prisma.Decimal(0) : newDue,
          status: newStatus,
        },
      });

      // Supplier ledger entry: debit (payment reduces liability)
      const supplier = await tx.supplier.findUnique({ where: { id: po.supplierId } });
      if (!supplier) throw AppError.notFound('Supplier not found', 'SUPPLIER_NOT_FOUND');
      const prevBalance = new Prisma.Decimal(supplier.currentBalance.toString());
      const newBalance = prevBalance.minus(amountBase).toDecimalPlaces(2);

      await tx.supplierLedgerEntry.create({
        data: {
          supplierId: po.supplierId,
          currencyCode: po.purchaseCurrencyCode,
          debitOriginalCurrency: paymentAmount.toDecimalPlaces(2),
          creditOriginalCurrency: new Prisma.Decimal(0),
          exchangeRateToBaseCurrency: exchangeRate,
          debitBaseCurrency: amountBase,
          creditBaseCurrency: new Prisma.Decimal(0),
          balanceAfterBase: newBalance,
          referenceType: 'SUPPLIER_PAYMENT',
          referenceId: purchaseId,
          remarks: `Payment for PO ${po.poNumber} via ${dto.paymentMethod}${dto.notes ? ` — ${dto.notes}` : ''}`,
        },
      });

      await tx.supplier.update({
        where: { id: po.supplierId },
        data: { currentBalance: newBalance },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SUPPLIER_PAYMENT_RECORDED',
          tableName: 'supplier_payments',
          recordId: purchaseId,
          newValues: JSON.stringify({
            purchaseOrderId: purchaseId,
            poNumber: po.poNumber,
            amount: paymentAmount.toString(),
            currency: po.purchaseCurrencyCode,
            amountBase: amountBase.toString(),
            paymentMethod: dto.paymentMethod,
            paymentDate: dto.paymentDate,
            newStatus,
          }),
        },
      });
    });

    return this.findOne(purchaseId);
  }

  private generateRollNumber(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `R-${y}${m}${d}-${rand}`;
  }

  private generateBarcode(): string {
    const ts = Date.now().toString().slice(-9);
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return ts + rand;
  }

  private async generatePoNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const datePrefix = `PO-${y}${m}${d}`;

    const count = await tx.purchaseOrder.count({
      where: { poNumber: { startsWith: datePrefix } },
    });

    return `${datePrefix}-${String(count + 1).padStart(4, '0')}`;
  }
}
