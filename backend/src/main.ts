import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppError } from './common/errors/app-error';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`TextilePOS Backend initialized and running on port ${port}`);
}

bootstrap();
