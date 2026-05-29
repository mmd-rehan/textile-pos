import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class TransactionHelper {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs operations in a secure transaction block using Prisma
   * @param operation The database operations callback
   * @param options Transaction timeout or isolation options
   */
  async run<T>(
    operation: (tx: TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return this.prisma.$transaction(operation, options);
  }
}
