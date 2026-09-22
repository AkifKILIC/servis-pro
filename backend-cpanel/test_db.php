<?php
/**
 * ServisPro Veritabanı Bağlantı Testi
 * Bu dosyayı cPanel Dosya Yöneticisi ile sitenize yükleyip tarayıcıda açarak test edebilirsiniz.
 * Örn: https://alanadiniz.com/test_db.php
 */

header('Content-Type: application/json; charset=utf-8');

$host = 'localhost';
$dbname = 'izmirimteknik_servispro_db';
$username = 'izmirimteknik_servispro_user';
$password = 'LY7678MQ5Pr4PRR';

try {
    $pdo = new PDO("mysql:host={$host};dbname={$dbname};charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Tebrikler! MySQL Veritabanı bağlantısı başarıyla sağlandı.',
        'database' => $dbname,
        'time' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
