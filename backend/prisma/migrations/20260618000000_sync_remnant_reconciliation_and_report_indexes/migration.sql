-- Sync DB schema with schema.prisma: milestone-7 Remnant/Reconciliation fields and
-- reporting indexes that were added to the Prisma model but never migrated.
-- Generated via `prisma migrate diff --from-migrations -> --to-schema-datamodel`.

-- AlterTable
ALTER TABLE `remnants` ADD COLUMN `barcode` VARCHAR(191) NULL,
    ADD COLUMN `batch_id` VARCHAR(191) NULL,
    ADD COLUMN `product_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `reconciliation_id` VARCHAR(191) NULL,
    ADD COLUMN `sale_price` DECIMAL(12, 2) NULL,
    ADD COLUMN `status` ENUM('AVAILABLE', 'SOLD', 'DISCARDED') NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE `roll_reconciliations` ADD COLUMN `reason` TEXT NOT NULL,
    ADD COLUMN `reconciliation_result` ENUM('MATCHED', 'SHRINKAGE', 'EXCESS', 'REMNANT') NOT NULL;

-- AlterTable
ALTER TABLE `rolls` MODIFY `status` ENUM('IN_STOCK', 'ALLOCATED', 'SOLD', 'WASTED', 'DAMAGED', 'FINISHED') NOT NULL DEFAULT 'IN_STOCK';

-- CreateIndex
CREATE UNIQUE INDEX `currency_exchange_rates_from_currency_code_to_currency_code__key` ON `currency_exchange_rates`(`from_currency_code`, `to_currency_code`, `is_current`);

-- CreateIndex
CREATE INDEX `purchase_orders_created_at_idx` ON `purchase_orders`(`created_at`);

-- CreateIndex
CREATE INDEX `purchase_orders_status_idx` ON `purchase_orders`(`status`);

-- CreateIndex
CREATE UNIQUE INDEX `remnants_reconciliation_id_key` ON `remnants`(`reconciliation_id`);

-- CreateIndex
CREATE UNIQUE INDEX `remnants_barcode_key` ON `remnants`(`barcode`);

-- CreateIndex
CREATE INDEX `remnants_product_id_idx` ON `remnants`(`product_id`);

-- CreateIndex
CREATE INDEX `sale_invoices_created_at_idx` ON `sale_invoices`(`created_at`);

-- CreateIndex
CREATE INDEX `sale_invoices_sale_type_idx` ON `sale_invoices`(`sale_type`);

-- CreateIndex
CREATE INDEX `sale_invoices_created_at_sale_type_idx` ON `sale_invoices`(`created_at`, `sale_type`);

-- CreateIndex
CREATE INDEX `wastage_entries_created_at_idx` ON `wastage_entries`(`created_at`);

-- AddForeignKey
ALTER TABLE `remnants` ADD CONSTRAINT `remnants_reconciliation_id_fkey` FOREIGN KEY (`reconciliation_id`) REFERENCES `roll_reconciliations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remnants` ADD CONSTRAINT `remnants_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remnants` ADD CONSTRAINT `remnants_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `remnants` RENAME INDEX `remnants_roll_id_fkey` TO `remnants_roll_id_idx`;
