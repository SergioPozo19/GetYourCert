<?php
header('Content-Type: application/json');
require __DIR__ . '/../_db.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method']);
  exit;
}

$config = app_config();
$input = json_decode(file_get_contents('php://input'), true);
$secret = $input['secret'] ?? '';
$email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
$action = ($input['action'] ?? 'grant') === 'revoke' ? 'revoke' : 'grant';

if(empty($config['admin_secret']) || !hash_equals((string)$config['admin_secret'], (string)$secret)){
  http_response_code(403);
  echo json_encode(['ok' => false, 'error' => 'forbidden']);
  exit;
}

if(!filter_var($email, FILTER_VALIDATE_EMAIL)){
  echo json_encode(['ok' => false, 'error' => 'invalid_email']);
  exit;
}

try {
  $pdo = db();
  $memberId = 'manual:' . $email;
  $active = $action === 'grant' ? 1 : 0;

  // Guarda el estado independientemente de si la cuenta existe ya: si el
  // usuario inicia sesión más tarde con este email, auth/google.php le
  // activará Pro automáticamente.
  $stmt = $pdo->prepare(
    'INSERT INTO patreon_pledges (member_id, email, active) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE active = VALUES(active), email = VALUES(email)'
  );
  $stmt->execute([$memberId, $email, $active]);

  $upd = $pdo->prepare(
    'UPDATE users SET is_pro = ?, patreon_member_id = ? WHERE email = ?'
  );
  $upd->execute([$active, $active ? $memberId : null, $email]);
  $affected = $upd->rowCount();

  echo json_encode(['ok' => true, 'is_pro' => (bool)$active, 'account_found' => $affected > 0]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'server']);
}
