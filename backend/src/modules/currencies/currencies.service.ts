import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../database/prisma.service';

export interface UpsertExchangeRateDto {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: string;
  notes?: string;
  userId: string;
}

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.currency.findMany({ orderBy: [{ isBaseCurrency: 'desc' }, { code: 'asc' }] });
  }

  async findActive() {
    return this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: [{ isBaseCurrency: 'desc' }, { code: 'asc' }],
    });
  }

  async toggleActive(code: string, isActive: boolean, userId: string) {
    const currency = await this.prisma.currency.findUnique({ where: { code } });
    if (!currency) throw AppError.notFound('Currency not found', 'CURRENCY_NOT_FOUND');
    if (currency.isBaseCurrency && !isActive) {
      throw AppError.badRequest('Cannot deactivate the base currency', 'BASE_CURRENCY_CANNOT_DEACTIVATE');
    }

    const updated = await this.prisma.currency.update({ where: { code }, data: { isActive } });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: isActive ? 'CURRENCY_ACTIVATED' : 'CURRENCY_DEACTIVATED',
        tableName: 'currencies',
        recordId: code,
        newValues: JSON.stringify({ code, isActive }),
      },
    });

    return updated;
  }

  async getExchangeRates(toCurrencyCode?: string) {
    const where: Prisma.CurrencyExchangeRateWhereInput = { isCurrent: true };
    if (toCurrencyCode) where.toCurrencyCode = toCurrencyCode;

    return this.prisma.currencyExchangeRate.findMany({
      where,
      orderBy: [{ toCurrencyCode: 'asc' }, { fromCurrencyCode: 'asc' }],
    });
  }

  async upsertExchangeRate(dto: UpsertExchangeRateDto) {
    const rate = new Prisma.Decimal(dto.rate);
    if (rate.lte(0)) throw AppError.badRequest('Exchange rate must be positive', 'INVALID_RATE');
    if (dto.fromCurrencyCode === dto.toCurrencyCode) {
      throw AppError.badRequest('From and to currency must differ', 'SAME_CURRENCY');
    }

    const [from, to] = await Promise.all([
      this.prisma.currency.findUnique({ where: { code: dto.fromCurrencyCode } }),
      this.prisma.currency.findUnique({ where: { code: dto.toCurrencyCode } }),
    ]);
    if (!from) throw AppError.notFound(`Currency ${dto.fromCurrencyCode} not found`, 'CURRENCY_NOT_FOUND');
    if (!to) throw AppError.notFound(`Currency ${dto.toCurrencyCode} not found`, 'CURRENCY_NOT_FOUND');

    // Deactivate any existing current rate for this pair
    await this.prisma.currencyExchangeRate.updateMany({
      where: { fromCurrencyCode: dto.fromCurrencyCode, toCurrencyCode: dto.toCurrencyCode, isCurrent: true },
      data: { isCurrent: false },
    });

    const newRate = await this.prisma.currencyExchangeRate.create({
      data: {
        fromCurrencyCode: dto.fromCurrencyCode,
        toCurrencyCode: dto.toCurrencyCode,
        rate,
        isCurrent: true,
        notes: dto.notes ?? null,
        createdByUserId: dto.userId,
        updatedByUserId: dto.userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: 'EXCHANGE_RATE_UPDATED',
        tableName: 'currency_exchange_rates',
        recordId: newRate.id,
        newValues: JSON.stringify({
          fromCurrencyCode: dto.fromCurrencyCode,
          toCurrencyCode: dto.toCurrencyCode,
          rate: rate.toString(),
        }),
      },
    });

    return newRate;
  }

  async getCurrentRate(fromCode: string, toCode: string): Promise<Prisma.Decimal | null> {
    if (fromCode === toCode) return new Prisma.Decimal(1);
    const rate = await this.prisma.currencyExchangeRate.findFirst({
      where: { fromCurrencyCode: fromCode, toCurrencyCode: toCode, isCurrent: true },
    });
    return rate ? new Prisma.Decimal(rate.rate.toString()) : null;
  }

  async getCurrentBaseCurrencyCode(): Promise<string> {
    const setting = await this.prisma.companySetting.findUnique({ where: { key: 'company_currency' } });
    return setting?.value ?? 'PKR';
  }
}
