import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BarcodesModule } from './modules/barcodes/barcodes.module';
import { BatchesModule } from './modules/batches/batches.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProductsModule } from './modules/products/products.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { RolesModule } from './modules/roles/roles.module';
import { RollsModule } from './modules/rolls/rolls.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { UnitsModule } from './modules/units/units.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SettingsModule,
    AuditModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    UnitsModule,
    BatchesModule,
    SuppliersModule,
    PurchasesModule,
    RollsModule,
    BarcodesModule,
    InventoryModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
