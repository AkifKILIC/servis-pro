<?php
/**
 * ServisPro Merkezi REST API & MySQL Köprüsü
 * İzmirim Teknik Servis Yönetim Sistemi
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Preflight CORS isteği
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Veritabanı Bilgileri
$db_host = 'localhost';
$db_name = 'izmirimteknik_servispro_db';
$db_user = 'izmirimteknik_servispro_user';
$db_pass = 'LY7678MQ5Pr4PRR';

try {
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit();
}

// Tabloları Otomatik Kontrol Et ve Oluştur (Otomatik Kurulum Garantisi)
function ensureTablesExist($pdo) {
    $sql = "
    CREATE TABLE IF NOT EXISTS `customers` (
      `id` VARCHAR(64) NOT NULL PRIMARY KEY,
      `fullName` VARCHAR(255) NOT NULL,
      `phone` VARCHAR(50) NOT NULL,
      `phone2` VARCHAR(50) DEFAULT NULL,
      `email` VARCHAR(255) DEFAULT NULL,
      `city` VARCHAR(100) NOT NULL,
      `district` VARCHAR(100) NOT NULL,
      `neighborhood` VARCHAR(100) DEFAULT NULL,
      `address` TEXT NOT NULL,
      `notes` TEXT DEFAULT NULL,
      `createdAt` VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `tickets` (
      `id` VARCHAR(64) NOT NULL PRIMARY KEY,
      `ticketNumber` VARCHAR(50) NOT NULL UNIQUE,
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
      `completedAt` VARCHAR(50) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `spare_parts` (
      `id` VARCHAR(64) NOT NULL PRIMARY KEY,
      `name` VARCHAR(255) NOT NULL,
      `code` VARCHAR(100) NOT NULL,
      `category` VARCHAR(100) NOT NULL,
      `compatibleBrands` TEXT DEFAULT NULL,
      `quantity` INT NOT NULL DEFAULT 0,
      `minStockLevel` INT NOT NULL DEFAULT 3,
      `purchasePrice` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      `salePrice` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      `location` VARCHAR(100) DEFAULT NULL,
      `updatedAt` VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `cash_transactions` (
      `id` VARCHAR(64) NOT NULL PRIMARY KEY,
      `type` VARCHAR(20) NOT NULL,
      `category` VARCHAR(100) NOT NULL,
      `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      `date` VARCHAR(50) NOT NULL,
      `description` TEXT NOT NULL,
      `relatedTicketId` VARCHAR(64) DEFAULT NULL,
      `paymentMethod` VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `current_accounts` (
      `id` VARCHAR(64) NOT NULL PRIMARY KEY,
      `name` VARCHAR(255) NOT NULL,
      `type` VARCHAR(50) NOT NULL,
      `phone` VARCHAR(50) NOT NULL,
      `phone2` VARCHAR(50) DEFAULT NULL,
      `email` VARCHAR(255) DEFAULT NULL,
      `taxOrIdNumber` VARCHAR(100) DEFAULT NULL,
      `authorizedPerson` VARCHAR(255) DEFAULT NULL,
      `city` VARCHAR(100) NOT NULL,
      `district` VARCHAR(100) NOT NULL,
      `address` TEXT DEFAULT NULL,
      `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      `creditLimit` DECIMAL(12,2) DEFAULT 0.00,
      `notes` TEXT DEFAULT NULL,
      `createdAt` VARCHAR(50) NOT NULL,
      `updatedAt` VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `current_transactions` (
      `id` VARCHAR(64) NOT NULL PRIMARY KEY,
      `accountId` VARCHAR(64) NOT NULL,
      `accountName` VARCHAR(255) NOT NULL,
      `type` VARCHAR(20) NOT NULL,
      `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      `date` VARCHAR(50) NOT NULL,
      `description` TEXT NOT NULL,
      `documentNo` VARCHAR(100) DEFAULT NULL,
      `paymentMethod` VARCHAR(50) DEFAULT NULL,
      `relatedTicketId` VARCHAR(64) DEFAULT NULL,
      `relatedCashTxId` VARCHAR(64) DEFAULT NULL,
      `createdAt` VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `shop_settings` (
      `id` INT NOT NULL DEFAULT 1 PRIMARY KEY,
      `settings_json` LONGTEXT NOT NULL,
      `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($sql);
}

ensureTablesExist($pdo);

// İstek Verisini Al
$action = $_GET['action'] ?? '';
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true) ?: [];

try {
    switch ($action) {
        // -------------------------------------------------------------
        // 1. TÜM VERİLERİ GETİR (Telefon veya PC açılışında tek sorguda çeker)
        // -------------------------------------------------------------
        case 'data':
            // Müşteriler
            $custStmt = $pdo->query("SELECT * FROM customers ORDER BY createdAt DESC");
            $customers = $custStmt->fetchAll();

            // Fişler
            $ticketStmt = $pdo->query("SELECT * FROM tickets ORDER BY createdAt DESC");
            $rawTickets = $ticketStmt->fetchAll();
            $tickets = array_map(function($t) {
                $t['partsUsed'] = $t['partsUsed'] ? json_decode($t['partsUsed'], true) : [];
                $t['laborCost'] = (float)$t['laborCost'];
                $t['transportCost'] = (float)$t['transportCost'];
                $t['discount'] = (float)$t['discount'];
                $t['totalAmount'] = (float)$t['totalAmount'];
                $t['paidAmount'] = (float)$t['paidAmount'];
                return $t;
            }, $rawTickets);

            // Parçalar
            $partStmt = $pdo->query("SELECT * FROM spare_parts ORDER BY updatedAt DESC");
            $rawParts = $partStmt->fetchAll();
            $parts = array_map(function($p) {
                $p['compatibleBrands'] = $p['compatibleBrands'] ? json_decode($p['compatibleBrands'], true) : [];
                $p['quantity'] = (int)$p['quantity'];
                $p['minStockLevel'] = (int)$p['minStockLevel'];
                $p['purchasePrice'] = (float)$p['purchasePrice'];
                $p['salePrice'] = (float)$p['salePrice'];
                return $p;
            }, $rawParts);

            // Kasa
            $cashStmt = $pdo->query("SELECT * FROM cash_transactions ORDER BY date DESC");
            $rawCash = $cashStmt->fetchAll();
            $cash = array_map(function($c) {
                $c['amount'] = (float)$c['amount'];
                return $c;
            }, $rawCash);

            // Cari Hesaplar
            $cariStmt = $pdo->query("SELECT * FROM current_accounts ORDER BY updatedAt DESC");
            $rawCari = $cariStmt->fetchAll();
            $currentAccounts = array_map(function($ca) {
                $ca['balance'] = (float)$ca['balance'];
                $ca['creditLimit'] = (float)$ca['creditLimit'];
                return $ca;
            }, $rawCari);

            // Cari Hareketler
            $ctxStmt = $pdo->query("SELECT * FROM current_transactions ORDER BY date DESC");
            $rawCtx = $ctxStmt->fetchAll();
            $currentTransactions = array_map(function($ct) {
                $ct['amount'] = (float)$ct['amount'];
                return $ct;
            }, $rawCtx);

            // Ayarlar
            $setStmt = $pdo->query("SELECT settings_json FROM shop_settings WHERE id = 1");
            $setRow = $setStmt->fetch();
            $settings = $setRow ? json_decode($setRow['settings_json'], true) : null;

            echo json_encode([
                'success' => true,
                'customers' => $customers,
                'tickets' => $tickets,
                'parts' => $parts,
                'cash' => $cash,
                'currentAccounts' => $currentAccounts,
                'currentTransactions' => $currentTransactions,
                'settings' => $settings,
                'serverTime' => date('c')
            ], JSON_UNESCAPED_UNICODE);
            break;


        // -------------------------------------------------------------
        // 2. TAM SENKRONİZASYON / YEDEK YÜKLEME
        // -------------------------------------------------------------
        case 'sync':
            $pdo->beginTransaction();

            if (!empty($body['customers']) && is_array($body['customers'])) {
                $stmt = $pdo->prepare("REPLACE INTO customers (id, fullName, phone, phone2, email, city, district, neighborhood, address, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($body['customers'] as $c) {
                    $stmt->execute([
                        $c['id'], $c['fullName'], $c['phone'], $c['phone2'] ?? null, $c['email'] ?? null,
                        $c['city'], $c['district'], $c['neighborhood'] ?? null, $c['address'], $c['notes'] ?? null, $c['createdAt']
                    ]);
                }
            }

            if (!empty($body['tickets']) && is_array($body['tickets'])) {
                $stmt = $pdo->prepare("REPLACE INTO tickets (id, ticketNumber, customerId, customerName, customerPhone, customerAddress, deviceType, brand, model, serialNumber, warrantyStatus, reportedFault, technicianDiagnosis, technicianName, status, priority, scheduledDate, scheduledTimeSlot, partsUsed, laborCost, transportCost, discount, totalAmount, paymentStatus, paymentMethod, paidAmount, notes, createdAt, updatedAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($body['tickets'] as $t) {
                    $stmt->execute([
                        $t['id'], $t['ticketNumber'], $t['customerId'], $t['customerName'], $t['customerPhone'],
                        $t['customerAddress'], $t['deviceType'], $t['brand'], $t['model'], $t['serialNumber'] ?? null,
                        $t['warrantyStatus'], $t['reportedFault'], $t['technicianDiagnosis'] ?? null, $t['technicianName'] ?? null,
                        $t['status'], $t['priority'], $t['scheduledDate'] ?? null, $t['scheduledTimeSlot'] ?? null,
                        json_encode($t['partsUsed'] ?? [], JSON_UNESCAPED_UNICODE),
                        $t['laborCost'] ?? 0, $t['transportCost'] ?? 0, $t['discount'] ?? 0, $t['totalAmount'] ?? 0,
                        $t['paymentStatus'] ?? 'unpaid', $t['paymentMethod'] ?? null, $t['paidAmount'] ?? 0,
                        $t['notes'] ?? null, $t['createdAt'], $t['updatedAt'], $t['completedAt'] ?? null
                    ]);
                }
            }

            if (!empty($body['parts']) && is_array($body['parts'])) {
                $stmt = $pdo->prepare("REPLACE INTO spare_parts (id, name, code, category, compatibleBrands, quantity, minStockLevel, purchasePrice, salePrice, location, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($body['parts'] as $p) {
                    $stmt->execute([
                        $p['id'], $p['name'], $p['code'], $p['category'],
                        json_encode($p['compatibleBrands'] ?? [], JSON_UNESCAPED_UNICODE),
                        $p['quantity'] ?? 0, $p['minStockLevel'] ?? 3, $p['purchasePrice'] ?? 0,
                        $p['salePrice'] ?? 0, $p['location'] ?? null, $p['updatedAt']
                    ]);
                }
            }

            if (!empty($body['cash']) && is_array($body['cash'])) {
                $stmt = $pdo->prepare("REPLACE INTO cash_transactions (id, type, category, amount, date, description, relatedTicketId, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($body['cash'] as $c) {
                    $stmt->execute([
                        $c['id'], $c['type'], $c['category'], $c['amount'], $c['date'],
                        $c['description'], $c['relatedTicketId'] ?? null, $c['paymentMethod']
                    ]);
                }
            }

            if (!empty($body['currentAccounts']) && is_array($body['currentAccounts'])) {
                $stmt = $pdo->prepare("REPLACE INTO current_accounts (id, name, type, phone, phone2, email, taxOrIdNumber, authorizedPerson, city, district, address, balance, creditLimit, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($body['currentAccounts'] as $ca) {
                    $stmt->execute([
                        $ca['id'], $ca['name'], $ca['type'], $ca['phone'], $ca['phone2'] ?? null,
                        $ca['email'] ?? null, $ca['taxOrIdNumber'] ?? null, $ca['authorizedPerson'] ?? null,
                        $ca['city'], $ca['district'], $ca['address'] ?? null, $ca['balance'] ?? 0,
                        $ca['creditLimit'] ?? 0, $ca['notes'] ?? null, $ca['createdAt'], $ca['updatedAt']
                    ]);
                }
            }

            if (!empty($body['currentTransactions']) && is_array($body['currentTransactions'])) {
                $stmt = $pdo->prepare("REPLACE INTO current_transactions (id, accountId, accountName, type, amount, date, description, documentNo, paymentMethod, relatedTicketId, relatedCashTxId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($body['currentTransactions'] as $ct) {
                    $stmt->execute([
                        $ct['id'], $ct['accountId'], $ct['accountName'], $ct['type'],
                        $ct['amount'] ?? 0, $ct['date'], $ct['description'], $ct['documentNo'] ?? null,
                        $ct['paymentMethod'] ?? null, $ct['relatedTicketId'] ?? null, $ct['relatedCashTxId'] ?? null,
                        $ct['createdAt']
                    ]);
                }
            }

            if (!empty($body['settings'])) {
                $stmt = $pdo->prepare("REPLACE INTO shop_settings (id, settings_json) VALUES (1, ?)");
                $stmt->execute([json_encode($body['settings'], JSON_UNESCAPED_UNICODE)]);
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Tüm veriler SQL veritabanına başarıyla senkronize edildi.']);
            break;

        // -------------------------------------------------------------
        // 3. SERVİS FİŞİ KAYDET / GÜNCELLE
        // -------------------------------------------------------------
        case 'ticket_save':
            $t = $body;
            if (empty($t['id']) || empty($t['ticketNumber'])) {
                throw new Exception('Eksik fiş bilgisi');
            }

            $stmt = $pdo->prepare("REPLACE INTO tickets (id, ticketNumber, customerId, customerName, customerPhone, customerAddress, deviceType, brand, model, serialNumber, warrantyStatus, reportedFault, technicianDiagnosis, technicianName, status, priority, scheduledDate, scheduledTimeSlot, partsUsed, laborCost, transportCost, discount, totalAmount, paymentStatus, paymentMethod, paidAmount, notes, createdAt, updatedAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $t['id'], $t['ticketNumber'], $t['customerId'], $t['customerName'], $t['customerPhone'],
                $t['customerAddress'], $t['deviceType'], $t['brand'], $t['model'], $t['serialNumber'] ?? null,
                $t['warrantyStatus'], $t['reportedFault'], $t['technicianDiagnosis'] ?? null, $t['technicianName'] ?? null,
                $t['status'], $t['priority'], $t['scheduledDate'] ?? null, $t['scheduledTimeSlot'] ?? null,
                json_encode($t['partsUsed'] ?? [], JSON_UNESCAPED_UNICODE),
                $t['laborCost'] ?? 0, $t['transportCost'] ?? 0, $t['discount'] ?? 0, $t['totalAmount'] ?? 0,
                $t['paymentStatus'] ?? 'unpaid', $t['paymentMethod'] ?? null, $t['paidAmount'] ?? 0,
                $t['notes'] ?? null, $t['createdAt'], $t['updatedAt'], $t['completedAt'] ?? null
            ]);

            echo json_encode(['success' => true, 'ticket' => $t]);
            break;

        // -------------------------------------------------------------
        // 4. SERVİS FİŞİ SİL (BÜTÜN CİHAZLARDAN ANINDA SİLİNİR!)
        // -------------------------------------------------------------
        case 'ticket_delete':
            $id = $body['id'] ?? $_GET['id'] ?? '';
            if (!$id) throw new Exception('Silinecek fiş ID belirtilmedi');

            $stmt = $pdo->prepare("DELETE FROM tickets WHERE id = ?");
            $stmt->execute([$id]);

            echo json_encode(['success' => true, 'id' => $id, 'message' => 'Fiş SQL veritabanından kalıcı olarak silindi.']);
            break;

        // -------------------------------------------------------------
        // 5. MÜŞTERİ KAYDET & SİL
        // -------------------------------------------------------------
        case 'customer_save':
            $c = $body;
            $stmt = $pdo->prepare("REPLACE INTO customers (id, fullName, phone, phone2, email, city, district, neighborhood, address, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $c['id'], $c['fullName'], $c['phone'], $c['phone2'] ?? null, $c['email'] ?? null,
                $c['city'], $c['district'], $c['neighborhood'] ?? null, $c['address'], $c['notes'] ?? null, $c['createdAt']
            ]);
            echo json_encode(['success' => true, 'customer' => $c]);
            break;

        case 'customer_delete':
            $id = $body['id'] ?? $_GET['id'] ?? '';
            $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        // -------------------------------------------------------------
        // 6. YEDEK PARÇA KAYDET & SİL
        // -------------------------------------------------------------
        case 'part_save':
            $p = $body;
            $stmt = $pdo->prepare("REPLACE INTO spare_parts (id, name, code, category, compatibleBrands, quantity, minStockLevel, purchasePrice, salePrice, location, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $p['id'], $p['name'], $p['code'], $p['category'],
                json_encode($p['compatibleBrands'] ?? [], JSON_UNESCAPED_UNICODE),
                $p['quantity'] ?? 0, $p['minStockLevel'] ?? 3, $p['purchasePrice'] ?? 0,
                $p['salePrice'] ?? 0, $p['location'] ?? null, $p['updatedAt']
            ]);
            echo json_encode(['success' => true, 'part' => $p]);
            break;

        case 'part_delete':
            $id = $body['id'] ?? $_GET['id'] ?? '';
            $stmt = $pdo->prepare("DELETE FROM spare_parts WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        // -------------------------------------------------------------
        // 7. KASA İŞLEMİ KAYDET & SİL
        // -------------------------------------------------------------
        case 'cash_save':
            $c = $body;
            $stmt = $pdo->prepare("REPLACE INTO cash_transactions (id, type, category, amount, date, description, relatedTicketId, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $c['id'], $c['type'], $c['category'], $c['amount'], $c['date'],
                $c['description'], $c['relatedTicketId'] ?? null, $c['paymentMethod']
            ]);
            echo json_encode(['success' => true, 'cash' => $c]);
            break;

        case 'cash_delete':
            $id = $body['id'] ?? $_GET['id'] ?? '';
            $stmt = $pdo->prepare("DELETE FROM cash_transactions WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        // -------------------------------------------------------------
        // 8. CARİ HESAP KAYDET & SİL
        // -------------------------------------------------------------
        case 'current_account_save':
            $ca = $body;
            $stmt = $pdo->prepare("REPLACE INTO current_accounts (id, name, type, phone, phone2, email, taxOrIdNumber, authorizedPerson, city, district, address, balance, creditLimit, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $ca['id'], $ca['name'], $ca['type'], $ca['phone'], $ca['phone2'] ?? null,
                $ca['email'] ?? null, $ca['taxOrIdNumber'] ?? null, $ca['authorizedPerson'] ?? null,
                $ca['city'], $ca['district'], $ca['address'] ?? null, $ca['balance'] ?? 0,
                $ca['creditLimit'] ?? 0, $ca['notes'] ?? null, $ca['createdAt'], $ca['updatedAt']
            ]);
            echo json_encode(['success' => true, 'currentAccount' => $ca]);
            break;

        case 'current_account_delete':
            $id = $body['id'] ?? $_GET['id'] ?? '';
            $stmt = $pdo->prepare("DELETE FROM current_accounts WHERE id = ?");
            $stmt->execute([$id]);
            $stmt2 = $pdo->prepare("DELETE FROM current_transactions WHERE accountId = ?");
            $stmt2->execute([$id]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        // -------------------------------------------------------------
        // 9. CARİ HAREKET KAYDET & SİL
        // -------------------------------------------------------------
        case 'current_tx_save':
            $ct = $body;
            $stmt = $pdo->prepare("REPLACE INTO current_transactions (id, accountId, accountName, type, amount, date, description, documentNo, paymentMethod, relatedTicketId, relatedCashTxId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $ct['id'], $ct['accountId'], $ct['accountName'], $ct['type'],
                $ct['amount'] ?? 0, $ct['date'], $ct['description'], $ct['documentNo'] ?? null,
                $ct['paymentMethod'] ?? null, $ct['relatedTicketId'] ?? null, $ct['relatedCashTxId'] ?? null,
                $ct['createdAt']
            ]);
            echo json_encode(['success' => true, 'currentTransaction' => $ct]);
            break;

        case 'current_tx_delete':
            $id = $body['id'] ?? $_GET['id'] ?? '';
            $stmt = $pdo->prepare("DELETE FROM current_transactions WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        // -------------------------------------------------------------
        // 10. AYARLARI KAYDET
        // -------------------------------------------------------------
        case 'settings_save':
            $stmt = $pdo->prepare("REPLACE INTO shop_settings (id, settings_json) VALUES (1, ?)");
            $stmt->execute([json_encode($body, JSON_UNESCAPED_UNICODE)]);
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Geçersiz veya eksik action parametresi (örn: ?action=data)']);
            break;

    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
