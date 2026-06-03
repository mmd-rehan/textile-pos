import { Injectable } from '@nestjs/common';
import { RollStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../database/prisma.service';

const BLOCKED_STATUSES: RollStatus[] = ['SOLD', 'DAMAGED'];
const WARNING_STATUSES: RollStatus[] = ['WASTED'];

@Injectable()
export class BarcodesService {
  constructor(private readonly prisma: PrismaService) { }

  async lookup(barcode: string) {
    // 1. Check rolls first
    const roll = await this.prisma.roll.findUnique({
      where: { barcode },
      include: {
        product: { select: { id: true, name: true, productCode: true } },
        color: { select: { id: true, name: true, colorCode: true } },
        design: { select: { id: true, name: true, designCode: true } },
        batch: { select: { id: true, batchNumber: true } },
      },
    });

    if (roll) {
      const blocked = BLOCKED_STATUSES.includes(roll.status);
      const warning = WARNING_STATUSES.includes(roll.status);
      return {
        type: 'ROLL' as const,
        blocked,
        warning,
        statusMessage: blocked
          ? `Roll is ${roll.status.toLowerCase()} and cannot be sold`
          : warning
            ? `Roll is ${roll.status.toLowerCase()}`
            : null,
        roll: {
          id: roll.id,
          rollNumber: roll.rollNumber,
          barcode: roll.barcode,
          status: roll.status,
          originalLengthYard: roll.originalLengthYard,
          remainingLengthYard: roll.remainingLengthYard,
          salePricePerYard: roll.salePricePerYard,
          location: roll.location,
          product: roll.product,
          color: roll.color,
          design: roll.design,
          batch: roll.batch,
        },
      };
    }

    // 2. Check product barcode
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: { select: { id: true, name: true } },
        color: { select: { id: true, name: true, colorCode: true } },
        design: { select: { id: true, name: true, designCode: true } },
        defaultUnit: { select: { id: true, name: true, abbreviation: true } },
        rolls: {
          where: { status: { in: ['IN_STOCK', 'ALLOCATED'] } },
          select: {
            id: true,
            rollNumber: true,
            barcode: true,
            status: true,
            remainingLengthYard: true,
            salePricePerYard: true,
            location: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        productStockItems: {
          where: { isActive: true },
          select: {
            id: true,
            quantityOnHand: true,
            barcodeValue: true,
            salePricePerUnit: true,
            location: true,
            color: { select: { id: true, name: true } },
            design: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true, abbreviation: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (product) {
      const isFabricRoll = product.productType === 'FABRIC_ROLL';
      return {
        type: 'PRODUCT' as const,
        blocked: false,
        warning: false,
        statusMessage: null,
        product: {
          id: product.id,
          productCode: product.productCode,
          name: product.name,
          productType: product.productType,
          retailPrice: product.retailPrice,
          wholesalePrice: product.wholesalePrice,
          status: product.status,
          category: product.category,
          color: product.color,
          design: product.design,
          defaultUnit: product.defaultUnit,
          availableRolls: isFabricRoll ? product.rolls : [],
          stockItems: !isFabricRoll ? product.productStockItems : [],
        },
      };
    }

    // 3. Check ProductStockItem barcode
    const stockItem = await this.prisma.productStockItem.findUnique({
      where: { barcodeValue: barcode },
      include: {
        product: { select: { id: true, name: true, productCode: true, productType: true } },
        color: { select: { id: true, name: true } },
        design: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
      },
    });

    if (stockItem) {
      const outOfStock = stockItem.quantityOnHand.lte(0);
      return {
        type: 'STOCK_ITEM' as const,
        blocked: !stockItem.isActive || outOfStock,
        warning: false,
        statusMessage: !stockItem.isActive
          ? 'Stock item is inactive'
          : outOfStock
            ? 'Out of stock'
            : null,
        stockItem: {
          id: stockItem.id,
          productId: stockItem.productId,
          barcodeValue: stockItem.barcodeValue,
          quantityOnHand: stockItem.quantityOnHand,
          salePricePerUnit: stockItem.salePricePerUnit,
          location: stockItem.location,
          isActive: stockItem.isActive,
          product: stockItem.product,
          color: stockItem.color,
          design: stockItem.design,
          unit: stockItem.unit,
        },
      };
    }

    throw AppError.notFound('Barcode not found', 'BARCODE_NOT_FOUND');
  }
}
