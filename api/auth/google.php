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

$config = require __DIR__ . '/../config.php';

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
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'server']);
}
