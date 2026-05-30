import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '../errors/app-error';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const requestId = (request as any).id || request.headers['x-request-id'] || null;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any = null;

    // 1. Handle custom AppError
    if (exception instanceof AppError) {
      status = exception.statusCode;
      message = exception.message;
      code = exception.code;
      details = exception.details;
    }
    // 2. Handle NestJS HttpException
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      code = exception.constructor.name || 'HTTP_EXCEPTION';

      if (typeof errorResponse === 'object') {
        const errObj = errorResponse as any;
        message = Array.isArray(errObj.message)
          ? errObj.message.join(', ')
          : errObj.message || exception.message;
        details = errObj.error || null;
      } else {
        message = errorResponse;
      }
    }
    // 3. Handle Prisma database errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma Client Known Request Error codes
      switch (exception.code) {
        case 'P2002': // Unique constraint violation
          status = HttpStatus.CONFLICT;
          code = 'UNIQUE_CONSTRAINT_VIOLATION';
          message = `Unique constraint failed on field(s): ${(exception.meta?.target as string[])?.join(', ') || 'unknown'}`;
          details = exception.meta || null;
          break;
        case 'P2003': // Foreign key constraint violation
          status = HttpStatus.BAD_REQUEST;
          code = 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
          message = 'Foreign key constraint failed on the database.';
          details = exception.meta || null;
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          code = 'RECORD_NOT_FOUND';
          message = exception.meta?.cause as string || 'The requested record was not found.';
          details = exception.meta || null;
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          code = `DATABASE_ERROR_${exception.code}`;
          message = 'A database constraint violation occurred.';
          details = exception.meta || null;
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'DATABASE_VALIDATION_ERROR';
      message = 'Database validation failed. Ensure your fields conform to the schema.';
      details = process.env.NODE_ENV !== 'production' ? exception.message : null;
    } else if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'DATABASE_CONNECTION_ERROR';
      message = 'Database service is currently unavailable.';
      details = process.env.NODE_ENV !== 'production' ? exception.message : null;
    }
    // 4. General fallback
    else if (exception instanceof Error) {
      message = exception.message;
      code = exception.name || 'UNKNOWN_ERROR';
      details = process.env.NODE_ENV !== 'production' ? exception.stack : null;
    }

    // Log the error for internal tracking (only log non-4xx errors as errors, 4xx as warnings)
    const logPayload = {
      path: request.url,
      method: request.method,
      requestId,
      code,
      message,
      details,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    if (status >= 500) {
      this.logger.error(`[${request.method}] ${request.url} - Error: ${message}`, JSON.stringify(logPayload));
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - Warning: ${message}`, JSON.stringify(logPayload));
    }

    // Set response status and body
    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
        requestId,
      },
    });
  }
}
