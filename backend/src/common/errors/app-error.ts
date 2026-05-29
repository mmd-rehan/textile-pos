import { HttpStatus } from '@nestjs/common';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: any;

  constructor(
    message: string,
    code = 'INTERNAL_SERVER_ERROR',
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    details: any = null,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Ensure proper prototype chain and capture stack trace
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details: any = null): AppError {
    return new AppError(message, code, HttpStatus.BAD_REQUEST, details);
  }

  static unauthorized(message: string, code = 'UNAUTHORIZED', details: any = null): AppError {
    return new AppError(message, code, HttpStatus.UNAUTHORIZED, details);
  }

  static forbidden(message: string, code = 'FORBIDDEN', details: any = null): AppError {
    return new AppError(message, code, HttpStatus.FORBIDDEN, details);
  }

  static notFound(message: string, code = 'NOT_FOUND', details: any = null): AppError {
    return new AppError(message, code, HttpStatus.NOT_FOUND, details);
  }

  static conflict(message: string, code = 'CONFLICT', details: any = null): AppError {
    return new AppError(message, code, HttpStatus.CONFLICT, details);
  }

  static internal(message: string, code = 'INTERNAL_SERVER_ERROR', details: any = null): AppError {
    return new AppError(message, code, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}
