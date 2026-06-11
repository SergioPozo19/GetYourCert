<?php
header('Content-Type: application/json');
require __DIR__ . '/_db.php';

$config = app_config();
$secret = $config['patreon_webhook_secret'] ?? '';

$raw = file_get_contents('php://input');
$sig = $_SERVER['HTTP_X_PATREON_SIGNATURE'] ?? '';

if(empty($secret) || !hash_equals(hash_hmac('md5', $raw, $secret), (string)$sig)){
  http_response_code(403);
  echo json_encode(['ok' => false, 'error' => 'invalid_signature']);
  exit;
}

$event = $_SERVER['HTTP_X_PATREON_EVENT'] ?? '';
$payload = json_decode($raw, true);
$data = $payload['data'] ?? null;
$included = $payload['included'] ?? [];

if(!$data || ($data['type'] ?? '') !== 'member'){
  echo json_encode(['ok' => true]);
  exit;
}

$memberId = $data['id'];
$patronStatus = $data['attributes']['patron_status'] ?? null;

$email = null;
foreach($included as $item){
  if(($item['type'] ?? '') === 'user'){
    $email = $item['attributes']['email'] ?? null;
    break;
  }
}

if(!$email){
  echo json_encode(['ok' => true]);
  exit;
}
$email = strtolower(trim($email));

$active = (strpos($event, 'pledge:delete') !== false || $patronStatus !== 'active_patron') ? 0 : 1;

try {
  $pdo = db();

  $stmt = $pdo->prepare(
    'INSERT INTO patreon_pledges (member_id, email, active) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE active = VALUES(active), email = VALUES(email)'
  );
  $stmt->execute([$memberId, $email, $active]);

  // is_pro queda activo si existe CUALQUIER pledge activo para este email
  // (real o concedido manualmente vía api/admin/grant-pro.html), para no
  // pisar una concesión manual al cancelar una suscripción de Patreon.
  $stmt = $pdo->prepare('SELECT COUNT(*) FROM patreon_pledges WHERE email = ? AND active = 1');
  $stmt->execute([$email]);
  $anyActive = (int)$stmt->fetchColumn() > 0;

  $upd = $pdo->prepare('UPDATE users SET is_pro = ?, patreon_member_id = ? WHERE email = ?');
  $upd->execute([$anyActive ? 1 : 0, $active ? $memberId : null, $email]);

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'server']);
}
