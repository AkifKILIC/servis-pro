-- ==========================================================
-- SERVISPRO TEKNİK SERVİS YÖNETİM SİSTEMİ VERİTABANI ŞEMASI
-- MySQL / MariaDB (cPanel phpMyAdmin)
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Müşteriler Tablosu
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(64) NOT NULL,
  `fullName` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `phone2` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `neighborhood` VARCHAR(100) DEFAULT NULL,
  `address` TEXT NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customers_phone` (`phone`),
  KEY `idx_customers_name` (`fullName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Servis Fişleri Tablosu
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` VARCHAR(64) NOT NULL,
  `ticketNumber` VARCHAR(50) NOT NULL,
  `customerId` VARCHAR(64) NOT NULL,
  `customerName` VARCHAR(255) NOT NULL,
  `customerPhone` VARCHAR(50) NOT NULL,
  `customerAddress` TEXT NOT NULL,
  `deviceType` VARCHAR(50) NOT NULL,
  `brand` VARCHAR(100) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `serialNumber` VARCHAR(100) DEFAULT NULL,
  `warrantyStatus` VARCHAR(50) NOT NULL,
  `reportedFault` TEXT NOT NULL,
  `technicianDiagnosis` TEXT DEFAULT NULL,
  `technicianName` VARCHAR(100) DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL,
  `priority` VARCHAR(20) NOT NULL,
  `scheduledDate` VARCHAR(50) DEFAULT NULL,
  `scheduledTimeSlot` VARCHAR(50) DEFAULT NULL,
  `partsUsed` LONGTEXT DEFAULT NULL,
  `laborCost` DECIMAL(10,2) DEFAULT 0.00,
  `transportCost` DECIMAL(10,2) DEFAULT 0.00,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `totalAmount` DECIMAL(10,2) DEFAULT 0.00,
  `paymentStatus` VARCHAR(20) NOT NULL,
  `paymentMethod` VARCHAR(50) DEFAULT NULL,
  `paidAmount` DECIMAL(10,2) DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `completedAt` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_ticket_number` (`ticketNumber`),
  KEY `idx_tickets_customer` (`customerId`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_tickets_date` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Yedek Parçalar Tablosu
CREATE TABLE IF NOT EXISTS `spare_parts` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `compatibleBrands` TEXT DEFAULT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `minStockLevel` INT NOT NULL DEFAULT 3,
  `purchasePrice` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `salePrice` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `location` VARCHAR(100) DEFAULT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_parts_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Kasa & Muhasebe Tablosu
CREATE TABLE IF NOT EXISTS `cash_transactions` (
  `id` VARCHAR(64) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `date` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `relatedTicketId` VARCHAR(64) DEFAULT NULL,
  `paymentMethod` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cash_date` (`date`),
  KEY `idx_cash_ticket` (`relatedTicketId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Dükkan Ayarları Tablosu
CREATE TABLE IF NOT EXISTS `shop_settings` (
  `id` INT NOT NULL DEFAULT 1,
  `settings_json` LONGTEXT NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
