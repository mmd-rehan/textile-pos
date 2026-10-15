-- CreateTable
CREATE TABLE `customer_payment_allocations` (
    `id` VARCHAR(191) NOT NULL,
    `payment_id` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_payment_allocations_payment_id_idx`(`payment_id`),
    INDEX `customer_payment_allocations_invoice_id_idx`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customer_payment_allocations` ADD CONSTRAINT `customer_payment_allocations_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `customer_payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_payment_allocations` ADD CONSTRAINT `customer_payment_allocations_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `sale_invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

