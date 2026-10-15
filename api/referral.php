<?php
// Invitaciones: cada usuario tiene un código; quien se registra con él recibe preguntas extra
// y quien invita también (se entregan en su siguiente visita). Las tablas se crean solas.
//   GET  -> { code, invited, rewarded, bonus }   (bonus = preguntas pendientes de entregar a quien invita; se marcan entregadas)
//   POST { code } -> { bonus }                    (solo cuentas creadas hace < 48 h, una vez por cuenta, nunca la propia)
header('Content-Type: application/json');
require __DIR__ . '/_db.php';

const REF_BONUS = 50;        // preguntas para cada parte
const REF_MAX_REWARDS = 10;  // tope de invitaciones premiadas por usuario

$pdo = db();
$user = bearer_user($pdo);
if (!$user) { http_response_code(401); echo json_encode(['ok' => false, 'error' => 'unauthorized']); exit; }

try {
  $pdo->exec('CREATE TABLE IF NOT EXISTS referral_codes (
    user_id INT PRIMARY KEY,
    code VARCHAR(16) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)');
  $pdo->exec('CREATE TABLE IF NOT EXISTS referrals (
    referee_id INT PRIMARY KEY,
    referrer_id INT NOT NULL,
    rewarded TINYINT(1) NOT NULL DEFAULT 0,
    referrer_paid TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_referrer (referrer_id),
    FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE)');

  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $st = $pdo->prepare('SELECT code FROM referral_codes WHERE user_id = ?');
    $st->execute([$user['id']]);
    $code = $st->fetchColumn();
    for ($i = 0; !$code && $i < 5; $i++) {
      $try = strtoupper(substr(str_replace(['+', '/', '='], '', base64_encode(random_bytes(9))), 0, 7));
      if (preg_match('/[^A-Z0-9]/', $try)) continue;
      try {
        $pdo->prepare('INSERT INTO referral_codes (user_id, code) VALUES (?, ?)')->execute([$user['id'], $try]);
        $code = $try;
      } catch (\Throwable $dup) { /* colisión: otro intento */ }
    }
    $st = $pdo->prepare('SELECT COUNT(*) AS invited, SUM(rewarded) AS rewarded, SUM(rewarded = 1 AND referrer_paid = 0) AS pending FROM referrals WHERE referrer_id = ?');
    $st->execute([$user['id']]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    $pending = (int)($r['pending'] ?? 0);
    if ($pending > 0) {
      $pdo->prepare('UPDATE referrals SET referrer_paid = 1 WHERE referrer_id = ? AND rewarded = 1 AND referrer_paid = 0')->execute([$user['id']]);
    }
    echo json_encode(['ok' => true, 'code' => $code ?: null, 'invited' => (int)$r['invited'], 'rewarded' => (int)$r['rewarded'],
                      'bonus' => $pending * REF_BONUS, 'per' => REF_BONUS]);
    exit;
  }

  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode(file_get_contents('php://input'), true);
    $code = strtoupper(trim((string)($in['code'] ?? '')));
    if (!preg_match('/^[A-Z0-9]{4,16}$/', $code)) { echo json_encode(['ok' => false, 'error' => 'code']); exit; }
    $st = $pdo->prepare('SELECT user_id FROM referral_codes WHERE code = ?');
    $st->execute([$code]);
    $referrer = (int)$st->fetchColumn();
    if (!$referrer || $referrer === (int)$user['id']) { echo json_encode(['ok' => false, 'error' => 'code']); exit; }
    // solo cuentas nuevas: evita que usuarios existentes se "inviten" entre sí
    if (strtotime($user['created_at']) < time() - 48 * 3600) { echo json_encode(['ok' => false, 'error' => 'not_new']); exit; }
    $st = $pdo->prepare('SELECT COUNT(*) FROM referrals WHERE referrer_id = ? AND rewarded = 1');
    $st->execute([$referrer]);
    $rewarded = ((int)$st->fetchColumn()) < REF_MAX_REWARDS ? 1 : 0;
    $ins = $pdo->prepare('INSERT IGNORE INTO referrals (referee_id, referrer_id, rewarded) VALUES (?, ?, ?)');
    $ins->execute([$user['id'], $referrer, $rewarded]);
    if ($ins->rowCount() !== 1) { echo json_encode(['ok' => false, 'error' => 'used']); exit; }
    echo json_encode(['ok' => true, 'bonus' => REF_BONUS]);
    exit;
  }

  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method']);
} catch (\Throwable $e) {
  error_log('[referral.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'server']);
}
