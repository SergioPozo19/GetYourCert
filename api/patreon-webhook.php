<?php
header('Content-Type: application/json');
require __DIR__ . '/_mail.php';

function send_cancel_survey($pdo, $memberId, $email){
  $stmt = $pdo->prepare('UPDATE patreon_pledges SET survey_sent_at = NOW() WHERE member_id = ? AND survey_sent_at IS NULL');
  $stmt->execute([$memberId]);
  if($stmt->rowCount() === 0) return; // ya enviada

  $stmt = $pdo->prepare('SELECT name, data FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
  $data = json_decode($u['data'] ?? '', true);
  $lang = (($data['lang'] ?? 'es') === 'en') ? 'en' : 'es';
  $first = trim(explode(' ', (string)($u['name'] ?? ''))[0] ?? '');
  $hasCerts = !empty($data['certs']);
  $url = SITE_URL . '/api/survey.php?e=' . rawurlencode($email) . '&t=' . mail_token($email, 'survey') . '&lang=' . $lang;

  if($lang === 'en'){
    $subject = 'Thanks for supporting EarnYourCert';
    $text = 'Hi' . ($first !== '' ? ' ' . $first : '') . ",\n\n"
      . "Your Pro membership has been cancelled. Thanks for supporting EarnYourCert while you studied.\n\n"
      . "Could you tell us why you left? It takes 20 seconds and helps us improve:\n{$url}\n\n"
      . "Your progress stays saved in your account."
      . ($hasCerts ? " We'll keep emailing you when it's time to renew the certifications you saved." : '') . "\n\n"
      . "If you want to come back, Pro is €1.99 a month: https://www.patreon.com/earnyourcert/membership\n\n"
      . "The EarnYourCert team\n";
  } else {
    $subject = 'Gracias por apoyar EarnYourCert';
    $text = 'Hola' . ($first !== '' ? ' ' . $first : '') . ":\n\n"
      . "Tu suscripción Pro se ha cancelado. Gracias por apoyar EarnYourCert mientras estudiabas.\n\n"
      . "¿Nos cuentas por qué te vas? Son 20 segundos y nos ayuda a mejorar:\n{$url}\n\n"
      . "Tu progreso sigue guardado en tu cuenta."
      . ($hasCerts ? ' Te seguiremos avisando por email cuando toque renovar las certificaciones que guardaste.' : '') . "\n\n"
      . "Si quieres volver, Pro cuesta 1,99 € al mes: https://www.patreon.com/earnyourcert/membership\n\n"
      . "El equipo de EarnYourCert\n";
  }
  send_mail($email, $subject, $text);
}

$config = app_config();
$secret = $config['patreon_webhook_secret'] ?? '';

$raw = file_get_contents('php://input');
$sig = $_SERVER['HTTP_X_PATREON_SIGNATURE'] ?? '';

// Log every incoming webhook for debugging
$logFile = __DIR__ . '/patreon-webhook.log';
$logEntry = date('Y-m-d H:i:s') . ' | event=' . ($_SERVER['HTTP_X_PATREON_EVENT'] ?? 'none')
  . ' | sig=' . substr($sig, 0, 8) . '...'
  . ' | body=' . substr($raw, 0, 500) . "\n";
file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);

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

// Patreon API v2 puts email directly in data.attributes
$email = $data['attributes']['email'] ?? null;
if(!$email){
  foreach($included as $item){
    if(($item['type'] ?? '') === 'user'){
      $email = $item['attributes']['email'] ?? null;
      break;
    }
  }
}

if(!$email){
  // Log missing email so we can diagnose
  file_put_contents($logFile,
    date('Y-m-d H:i:s') . ' | NO_EMAIL | memberId=' . $memberId
    . ' | patron_status=' . $patronStatus
    . ' | included_types=' . implode(',', array_column($included, 'type')) . "\n",
    FILE_APPEND | LOCK_EX
  );
  echo json_encode(['ok' => true]);
  exit;
}
$email = strtolower(trim($email));

$active = (strpos($event, 'pledge:delete') !== false || $patronStatus !== 'active_patron') ? 0 : 1;

try {
  $pdo = db();

  $stmt = $pdo->prepare('SELECT active FROM patreon_pledges WHERE member_id = ?');
  $stmt->execute([$memberId]);
  $wasActive = (int)$stmt->fetchColumn() === 1;

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

  // Cancelación voluntaria (no un cobro rechazado): enviar la encuesta de baja una vez.
  if($wasActive && !$active && !$anyActive && $patronStatus !== 'declined_patron'){
    try { send_cancel_survey($pdo, $memberId, $email); }
    catch (\Throwable $e) {
      file_put_contents($logFile, date('Y-m-d H:i:s') . ' | SURVEY_FAIL | ' . $e->getMessage() . "\n", FILE_APPEND | LOCK_EX);
    }
  }

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'server']);
}
