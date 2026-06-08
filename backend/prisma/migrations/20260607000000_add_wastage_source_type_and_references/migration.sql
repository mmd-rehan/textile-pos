-- Add WastageSourceType enum and new fields to wastage_entries

-- Add source_type column with enum values
ALTER TABLE `wastage_entries` ADD COLUMN `source_type` ENUM('SALE_OVERCUT', 'MANUAL_DAMAGE', 'MANUAL_WASTAGE', 'RECONCILIATION_LOSS') NOT NULL DEFAULT 'SALE_OVERCUT';

-- Add sale_invoice_id nullable FK column
ALTER TABLE `wastage_entries` ADD COLUMN `sale_invoice_id` VARCHAR(191) NULL;

-- Add reconciliation_id nullable FK column
ALTER TABLE `wastage_entries` ADD COLUMN `reconciliation_id` VARCHAR(191) NULL;

-- Add responsible_user_id nullable FK column
ALTER TABLE `wastage_entries` ADD COLUMN `responsible_user_id` VARCHAR(191) NULL;

-- Add indexes
ALTER TABLE `wastage_entries` ADD INDEX `wastage_entries_source_type_idx` (`source_type`);
ALTER TABLE `wastage_entries` ADD INDEX `wastage_entries_roll_id_idx` (`roll_id`);
ALTER TABLE `wastage_entries` ADD INDEX `wastage_entries_sale_invoice_id_idx` (`sale_invoice_id`);
ALTER TABLE `wastage_entries` ADD INDEX `wastage_entries_reconciliation_id_idx` (`reconciliation_id`);
ALTER TABLE `wastage_entries` ADD INDEX `wastage_entries_responsible_user_id_idx` (`responsible_user_id`);

-- Add FK constraints
ALTER TABLE `wastage_entries` ADD CONSTRAINT `wastage_entries_sale_invoice_id_fkey` FOREIGN KEY (`sale_invoice_id`) REFERENCES `sale_invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `wastage_entries` ADD CONSTRAINT `wastage_entries_reconciliation_id_fkey` FOREIGN KEY (`reconciliation_id`) REFERENCES `roll_reconciliations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `wastage_entries` ADD CONSTRAINT `wastage_entries_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
