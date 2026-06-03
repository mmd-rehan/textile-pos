-- AlterTable
ALTER TABLE `customers` ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    MODIFY `type` ENUM('RETAIL', 'WHOLESALE', 'CREDIT') NOT NULL DEFAULT 'RETAIL';

-- CreateTable
CREATE TABLE `customer_payments` (
    `id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `payment_method` VARCHAR(191) NOT NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `received_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_payments_idempotency_key_key`(`idempotency_key`),
    INDEX `customer_payments_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customer_payments` ADD CONSTRAINT `customer_payments_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_payments` ADD CONSTRAINT `customer_payments_received_by_id_fkey` FOREIGN KEY (`received_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
