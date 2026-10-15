-- CreateTable
CREATE TABLE `document_sequences` (
    `key` VARCHAR(64) NOT NULL,
    `last_value` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
