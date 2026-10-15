import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost() {
  const response = {
    headersSent: false,
    statusCode: 0,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const request = { url: '/api/v1/test', method: 'POST', headers: {} };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test', meta });

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  beforeAll(() => {
    jest.spyOn((filter as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined);
  });

  it('maps AppError to its status, code and details', () => {
    const { host, response } = mockHost();
    filter.catch(AppError.badRequest('Bad', 'SOME_CODE', { a: 1 }), host);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({ success: false, error: { code: 'SOME_CODE', message: 'Bad', details: { a: 1 } } });
  });

  it('maps a Nest HttpException', () => {
    const { host, response } = mockHost();
    filter.catch(new BadRequestException(['a must be a number', 'b is required']), host);
    expect(response.statusCode).toBe(400);
    expect(response.body.error.message).toBe('a must be a number, b is required');
  });

  it.each([
    ['an index name (MySQL)', 'sale_invoices_invoice_number_key', 'sale_invoices_invoice_number_key'],
    ['a field list', ['invoiceNumber'], 'invoiceNumber'],
    ['nothing', undefined, 'unknown'],
  ])('maps P2002 with %s as target to 409 without throwing', (_label, target, expected) => {
    const { host, response } = mockHost();
    filter.catch(prismaError('P2002', target === undefined ? undefined : { target }), host);
    expect(response.statusCode).toBe(HttpStatus.CONFLICT);
    expect(response.body.error.code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
    expect(response.body.error.message).toContain(expected);
  });

  it('maps a write conflict / deadlock (P2034) to a retryable 409', () => {
    const { host, response } = mockHost();
    filter.catch(prismaError('P2034'), host);
    expect(response.statusCode).toBe(409);
    expect(response.body.error.code).toBe('TRANSACTION_CONFLICT');
  });

  it('maps a missing record (P2025) to 404', () => {
    const { host, response } = mockHost();
    filter.catch(prismaError('P2025', { cause: 'Record to update not found.' }), host);
    expect(response.statusCode).toBe(404);
  });

  it('hides unknown errors behind a 500', () => {
    const { host, response } = mockHost();
    filter.catch(new Error('boom'), host);
    expect(response.statusCode).toBe(500);
  });

  it('still responds with 500 if building the error response itself fails', () => {
    const { host, response } = mockHost();
    const evil = AppError.badRequest('x', 'X');
    Object.defineProperty(evil, 'statusCode', {
      get() {
        throw new Error('getter exploded');
      },
    });
    expect(() => filter.catch(evil, host)).not.toThrow();
    expect(response.statusCode).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
