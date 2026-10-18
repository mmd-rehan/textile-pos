import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const port = process.env.PORT || process.env.BACKEND_PORT || 5001;
  await app.listen(port);
  logger.log(`TextilePOS Backend initialized and running on port ${port}`);
}

bootstrap();
