-- AddColumn tax snapshot fields to sale_invoices
-- taxableAmount: subtotal minus line discounts (before tax)
-- taxEnabled: whether tax was active at time of sale
-- taxRatePercent: tax rate snapshot (0.00 for historical)
-- taxLabel: tax label snapshot (e.g. "VAT", "GST")
-- Also widens existing money columns from Decimal(12,2) to Decimal(14,2)

-- Add new tax snapshot columns
ALTER TABLE `sale_invoices` ADD COLUMN `taxable_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER `discount_amount`;
ALTER TABLE `sale_invoices` ADD COLUMN `tax_enabled` BOOLEAN NOT NULL DEFAULT FALSE AFTER `taxable_amount`;
ALTER TABLE `sale_invoices` ADD COLUMN `tax_rate_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `tax_enabled`;
ALTER TABLE `sale_invoices` ADD COLUMN `tax_label` VARCHAR(191) NULL AFTER `tax_rate_percent`;

-- Widen existing money columns to Decimal(14,2) for consistency
ALTER TABLE `sale_invoices` MODIFY `total_amount` DECIMAL(14,2) NOT NULL;
ALTER TABLE `sale_invoices` MODIFY `discount_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00;
ALTER TABLE `sale_invoices` MODIFY `tax_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00;
ALTER TABLE `sale_invoices` MODIFY `net_amount` DECIMAL(14,2) NOT NULL;
ALTER TABLE `sale_invoices` MODIFY `paid_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00;
ALTER TABLE `sale_invoices` MODIFY `due_amount` DECIMAL(14,2) NOT NULL;

-- Backfill taxable_amount for existing rows:
-- For all historical rows, tax_amount = 0, so net_amount = taxable_amount (grand total = subtotal - discount)
UPDATE `sale_invoices` SET `taxable_amount` = `net_amount` WHERE `tax_enabled` = FALSE;
