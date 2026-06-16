<?php
header('Content-Type: application/json');
require __DIR__ . '/../_db.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method']);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$credential = $input['credential'] ?? '';

if($credential === ''){
  echo json_encode(['ok' => false, 'error' => 'invalid']);
  exit;
}

$config = app_config();

try {
  $resp = file_get_contents('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential));
  if($resp === false){
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'google_unreachable']);
    exit;
  }

  $payload = json_decode($resp, true);

  if(!isset($payload['sub']) || !isset($payload['email']) ||
     !isset($payload['aud']) || $payload['aud'] !== $config['google_client_id']){
    echo json_encode(['ok' => false, 'error' => 'invalid_token']);
    exit;
  }

  $sub = $payload['sub'];
  $email = $payload['email'];
  $name = $payload['name'] ?? null;
  $avatar = $payload['picture'] ?? null;

  $pdo = db();

  $stmt = $pdo->prepare(
    'INSERT INTO users (google_sub, email, name, avatar_url)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE email = VALUES(email), name = VALUES(name), avatar_url = VALUES(avatar_url)'
  );
  $stmt->execute([$sub, $email, $name, $avatar]);

  $stmt = $pdo->prepare('SELECT * FROM users WHERE google_sub = ?');
  $stmt->execute([$sub]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  // Si el correo coincide con un mecenas de Patreon activo y aún no está vinculado,
  // activamos Pro automáticamente y guardamos la vinculación.
  if(!$user['is_pro']){
    try {
      $stmt = $pdo->prepare('SELECT member_id FROM patreon_pledges WHERE email = ? AND active = 1');
      $stmt->execute([$email]);
      $pledge = $stmt->fetch(PDO::FETCH_ASSOC);
      if($pledge){
        $upd = $pdo->prepare('UPDATE users SET is_pro = 1, patreon_member_id = ? WHERE id = ?');
        $upd->execute([$pledge['member_id'], $user['id']]);
        $user['is_pro'] = 1;
        $user['patreon_member_id'] = $pledge['member_id'];
      }
    } catch (\Throwable $ignored) {
      // patreon_pledges table may not exist yet — login still succeeds
    }
  }

  $token = bin2hex(random_bytes(32));
  $stmt = $pdo->prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 90 DAY))');
  $stmt->execute([$token, $user['id']]);

  echo json_encode([
    'ok' => true,
    'token' => $token,
    'user' => [
      'email' => $user['email'],
      'name' => $user['name'],
      'avatar_url' => $user['avatar_url'],
      'is_pro' => (bool)$user['is_pro'],
    ],
    'data' => $user['data'] ? json_decode($user['data']) : null,
  ]);
} catch (\Throwable $e) {
  error_log('[google.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'server']);
}
