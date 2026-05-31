-- AlterTable: Add hex_code and is_active to colors
ALTER TABLE `colors` ADD COLUMN `hex_code` VARCHAR(191) NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add description and is_active to designs
ALTER TABLE `designs` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add paid/due amount tracking to purchase_orders
ALTER TABLE `purchase_orders` ADD COLUMN `due_amount_original_ccy` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `paid_amount_original_ccy` DECIMAL(14, 2) NOT NULL DEFAULT 0.00;

-- Backfill due amounts for existing UNPAID purchase orders
UPDATE `purchase_orders` SET `due_amount_original_ccy` = `total_original_ccy` WHERE `status` = 'UNPAID';

-- CreateTable: supplier_payments
CREATE TABLE `supplier_payments` (
    `id` VARCHAR(191) NOT NULL,
    `purchase_order_id` VARCHAR(191) NOT NULL,
    `supplier_id` VARCHAR(191) NOT NULL,
    `amount_original_ccy` DECIMAL(14, 2) NOT NULL,
    `amount_base_ccy` DECIMAL(14, 2) NOT NULL,
    `currency_code` VARCHAR(191) NOT NULL,
    `exchange_rate_to_base_currency` DECIMAL(18, 6) NOT NULL DEFAULT 1.000000,
    `payment_method` VARCHAR(191) NOT NULL,
    `payment_date` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supplier_payments_purchase_order_id_idx`(`purchase_order_id`),
    INDEX `supplier_payments_supplier_id_idx`(`supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
