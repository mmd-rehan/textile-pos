/*
  Warnings:

  - You are about to drop the column `color_code` on the `product_colors` table. All the data in the column will be lost.
  - You are about to drop the column `color_name` on the `product_colors` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `product_colors` table. All the data in the column will be lost.
  - You are about to drop the column `design_code` on the `product_designs` table. All the data in the column will be lost.
  - You are about to drop the column `design_name` on the `product_designs` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `product_designs` table. All the data in the column will be lost.
  - You are about to drop the column `cost` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `unit_id` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `brands` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,color_id]` on the table `product_colors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,design_id]` on the table `product_designs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_code]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[from_unit_id,to_unit_id]` on the table `unit_conversions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `units` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `color_id` to the `product_colors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `design_id` to the `product_designs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `default_unit_id` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_code` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_type` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `retail_price` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wholesale_price` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_unit_id_fkey`;

-- DropForeignKey
ALTER TABLE `rolls` DROP FOREIGN KEY `rolls_color_id_fkey`;

-- DropForeignKey
ALTER TABLE `rolls` DROP FOREIGN KEY `rolls_design_id_fkey`;

-- DropForeignKey
ALTER TABLE `sale_invoice_items` DROP FOREIGN KEY `sale_invoice_items_color_id_fkey`;

-- DropForeignKey
ALTER TABLE `sale_invoice_items` DROP FOREIGN KEY `sale_invoice_items_design_id_fkey`;

-- DropIndex
DROP INDEX `products_sku_key` ON `products`;

-- AlterTable
ALTER TABLE `batches` ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `received_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `brands` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `product_colors` DROP COLUMN `color_code`,
    DROP COLUMN `color_name`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `color_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `product_designs` DROP COLUMN `design_code`,
    DROP COLUMN `design_name`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `design_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `cost`,
    DROP COLUMN `price`,
    DROP COLUMN `sku`,
    DROP COLUMN `type`,
    DROP COLUMN `unit_id`,
    ADD COLUMN `color_id` VARCHAR(191) NULL,
    ADD COLUMN `default_unit_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `design_id` VARCHAR(191) NULL,
    ADD COLUMN `product_code` VARCHAR(191) NOT NULL,
    ADD COLUMN `product_type` ENUM('FABRIC_ROLL', 'CUT_PIECE', 'FIXED_PRODUCT') NOT NULL,
    ADD COLUMN `retail_price` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `wholesale_price` DECIMAL(12, 2) NOT NULL;

-- CreateTable
CREATE TABLE `colors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color_code` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `colors_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `designs` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `design_code` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `designs_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `brands_name_key` ON `brands`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `product_colors_product_id_color_id_key` ON `product_colors`(`product_id`, `color_id`);

-- CreateIndex
CREATE UNIQUE INDEX `product_designs_product_id_design_id_key` ON `product_designs`(`product_id`, `design_id`);

-- CreateIndex
CREATE UNIQUE INDEX `products_product_code_key` ON `products`(`product_code`);

-- CreateIndex
CREATE INDEX `products_product_code_idx` ON `products`(`product_code`);

-- CreateIndex
CREATE UNIQUE INDEX `unit_conversions_from_unit_id_to_unit_id_key` ON `unit_conversions`(`from_unit_id`, `to_unit_id`);

-- CreateIndex
CREATE UNIQUE INDEX `units_name_key` ON `units`(`name`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_color_id_fkey` FOREIGN KEY (`color_id`) REFERENCES `colors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_design_id_fkey` FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_default_unit_id_fkey` FOREIGN KEY (`default_unit_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_colors` ADD CONSTRAINT `product_colors_color_id_fkey` FOREIGN KEY (`color_id`) REFERENCES `colors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_designs` ADD CONSTRAINT `product_designs_design_id_fkey` FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rolls` ADD CONSTRAINT `rolls_color_id_fkey` FOREIGN KEY (`color_id`) REFERENCES `colors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rolls` ADD CONSTRAINT `rolls_design_id_fkey` FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_invoice_items` ADD CONSTRAINT `sale_invoice_items_color_id_fkey` FOREIGN KEY (`color_id`) REFERENCES `colors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_invoice_items` ADD CONSTRAINT `sale_invoice_items_design_id_fkey` FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
