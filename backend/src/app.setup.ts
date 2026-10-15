import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppError } from './common/errors/app-error';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';

/**
 * Global app configuration shared by main.ts and the integration tests, so the
 * tests exercise the same prefix, validation, envelopes and guards as production.
 */
export function configureApp(app: INestApplication) {
  // Enable CORS
  app.enableCors();

  // Set global endpoint prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe with auto-transform and validation-to-AppError mapping
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const details = errors.map((err) => ({
          field: err.property,
          constraints: err.constraints ? Object.values(err.constraints) : [],
        }));
        return AppError.badRequest('Validation failed', 'VALIDATION_ERROR', details);
      },
    }),
  );

  // Apply global interceptors and filters for success & error envelopes
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Apply JWT guard globally — use @Public() on routes that don't need auth
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new PermissionsGuard(reflector));
}
