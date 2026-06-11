<?php
header('Content-Type: application/json');

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method']);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$code = isset($input['code']) ? strtoupper(trim($input['code'])) : '';

if($code === ''){
  echo json_encode(['ok' => false, 'error' => 'invalid']);
  exit;
}

$config = require __DIR__ . '/config.php';

try {
  $pdo = new PDO(
    "mysql:host={$config['host']};dbname={$config['db']};charset=utf8mb4",
    $config['user'],
    $config['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );

  $stmt = $pdo->prepare('SELECT id, max_uses, uses, active FROM pro_codes WHERE code = ?');
  $stmt->execute([$code]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  if(!$row || !$row['active'] || $row['uses'] >= $row['max_uses']){
    echo json_encode(['ok' => false, 'error' => 'invalid']);
    exit;
  }

  $upd = $pdo->prepare('UPDATE pro_codes SET uses = uses + 1 WHERE id = ?');
  $upd->execute([$row['id']]);

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'server']);
}
