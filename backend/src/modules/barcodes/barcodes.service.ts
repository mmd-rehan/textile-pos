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

    // 2. Check products
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: { select: { id: true, name: true } },
        color: { select: { id: true, name: true, colorCode: true } },
        design: { select: { id: true, name: true, designCode: true } },
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
      },
    });

    if (product) {
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
          availableRolls: product.rolls,
        },
      };
    }

    throw AppError.notFound('Barcode not found', 'BARCODE_NOT_FOUND');
  }
}
