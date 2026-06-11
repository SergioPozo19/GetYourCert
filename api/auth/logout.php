<?php
header('Content-Type: application/json');
require __DIR__ . '/../_db.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method']);
  exit;
}

$headers = function_exists('getallheaders') ? getallheaders() : [];
$auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');

if(!preg_match('/^Bearer\s+([A-Za-z0-9]+)$/', trim($auth), $m)){
  echo json_encode(['ok' => true]);
  exit;
}

try {
  $stmt = db()->prepare('DELETE FROM sessions WHERE token = ?');
  $stmt->execute([$m[1]]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'server']);
}
