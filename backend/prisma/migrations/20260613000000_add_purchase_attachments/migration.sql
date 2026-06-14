-- Add PurchaseAttachment table for storing supplier invoice attachments
-- linked to purchase orders. Files live on disk; only metadata stays in MySQL.

CREATE TABLE `purchase_attachments` (
  `id` VARCHAR(191) NOT NULL,
  `purchase_order_id` VARCHAR(191) NOT NULL,
  `supplier_id` VARCHAR(191) NOT NULL,
  `original_file_name` VARCHAR(191) NOT NULL,
  `stored_file_name` VARCHAR(191) NOT NULL,
  `storage_path` VARCHAR(191) NOT NULL,
  `mime_type` VARCHAR(191) NOT NULL,
  `file_size` INT NOT NULL,
  `file_hash` VARCHAR(191) NULL,
  `uploaded_by_user_id` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `purchase_attachments_stored_file_name_key` (`stored_file_name`),
  INDEX `purchase_attachments_purchase_order_id_idx` (`purchase_order_id`),
  INDEX `purchase_attachments_supplier_id_idx` (`supplier_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `purchase_attachments`
  ADD CONSTRAINT `purchase_attachments_purchase_order_id_fkey`
  FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `purchase_attachments`
  ADD CONSTRAINT `purchase_attachments_supplier_id_fkey`
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `purchase_attachments`
  ADD CONSTRAINT `purchase_attachments_uploaded_by_user_id_fkey`
  FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
