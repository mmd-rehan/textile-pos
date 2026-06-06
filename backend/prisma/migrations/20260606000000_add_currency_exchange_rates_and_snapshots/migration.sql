-- Currency model: add decimalPlaces
ALTER TABLE `currencies` ADD COLUMN `decimal_places` INTEGER NOT NULL DEFAULT 2;

-- CurrencyExchangeRate table
CREATE TABLE `currency_exchange_rates` (
    `id` VARCHAR(191) NOT NULL,
    `from_currency_code` VARCHAR(191) NOT NULL,
    `to_currency_code` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(18, 6) NOT NULL,
    `is_current` BOOLEAN NOT NULL DEFAULT true,
    `effective_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `updated_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `currency_exchange_rates_from_currency_code_to_currency_code_idx` ON `currency_exchange_rates`(`from_currency_code`, `to_currency_code`);
ALTER TABLE `currency_exchange_rates` ADD CONSTRAINT `currency_exchange_rates_from_currency_code_fkey` FOREIGN KEY (`from_currency_code`) REFERENCES `currencies`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `currency_exchange_rates` ADD CONSTRAINT `currency_exchange_rates_to_currency_code_fkey` FOREIGN KEY (`to_currency_code`) REFERENCES `currencies`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- PurchaseOrder: add baseCurrencyCodeAtTime
ALTER TABLE `purchase_orders` ADD COLUMN `base_currency_code_at_time` VARCHAR(191) NOT NULL DEFAULT 'PKR';

-- SupplierPayment: add baseCurrencyCodeAtTime
ALTER TABLE `supplier_payments` ADD COLUMN `base_currency_code_at_time` VARCHAR(191) NOT NULL DEFAULT 'PKR';

-- SupplierLedgerEntry: add baseCurrencyCodeAtTime
ALTER TABLE `supplier_ledger_entries` ADD COLUMN `base_currency_code_at_time` VARCHAR(191) NOT NULL DEFAULT 'PKR';

-- SaleInvoice: add currencyCode
ALTER TABLE `sale_invoices` ADD COLUMN `currency_code` VARCHAR(191) NOT NULL DEFAULT 'PKR';
