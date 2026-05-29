import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any = null;

    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();
      code = exception.name || 'HTTP_EXCEPTION';
      
      if (typeof errorResponse === 'object') {
        const errObj = errorResponse as any;
        message = Array.isArray(errObj.message) ? errObj.message.join(', ') : (errObj.message || exception.message);
        details = errObj.error || null;
      } else {
        message = errorResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = exception.name || 'UNKNOWN_ERROR';
      // In non-production, include stack trace or error details if available
      details = exception.stack && process.env.NODE_ENV !== 'production' ? exception.stack : null;
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  }
}
