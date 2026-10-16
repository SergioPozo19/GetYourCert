<?php
// Baja de los recordatorios por email. El enlace va firmado (mail_token).
// GET muestra un botón de confirmación (los antivirus de correo abren los
// enlaces y no deben dar de baja a nadie); POST aplica la baja, también en
// la baja en un clic de Gmail/Outlook (RFC 8058, List-Unsubscribe-Post).
require __DIR__ . '/_mail.php';

$email = strtolower(trim((string)($_GET['e'] ?? '')));
$token = (string)($_GET['t'] ?? '');
$valid = $email !== '' && mail_token_ok($email, 'unsub', $token);
$done = false;

if($valid && $_SERVER['REQUEST_METHOD'] === 'POST'){
  $stmt = db()->prepare('UPDATE users SET email_opt_out = 1 WHERE email = ?');
  $stmt->execute([$email]);
  $done = true;
}

$h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$self = '/api/unsubscribe.php?e=' . rawurlencode($email) . '&t=' . rawurlencode($token);
header('Content-Type: text/html; charset=UTF-8');
?><!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>EarnYourCert · Avisos por email</title>
<style>
body{font-family:-apple-system,system-ui,sans-serif;background:#EEF2F7;color:#0D1520;margin:0;padding:48px 16px;line-height:1.55}
.box{max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(16,24,40,.08)}
h1{font-size:1.25rem;margin:0 0 12px}
p{margin:0 0 12px;color:#3A4452}
.en{border-top:1px solid #DDE4EE;padding-top:12px;margin-top:20px}
button{background:#0F6CBD;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:1rem;cursor:pointer}
a{color:#0F6CBD}
@media (prefers-color-scheme: dark){body{background:#0D1520;color:#E8EDF4}.box{background:#18212E}p{color:#B8C2CF}.en{border-color:#2A3545}}
</style>
</head>
<body>
<div class="box">
<?php if(!$valid): ?>
  <h1>Enlace no válido</h1>
  <p>Este enlace de baja no es válido o está incompleto. Escríbenos a <a href="mailto:soporte@earnyourcert.com">soporte@earnyourcert.com</a> y te damos de baja.</p>
  <p class="en">This unsubscribe link is not valid. Email <a href="mailto:soporte@earnyourcert.com">soporte@earnyourcert.com</a> and we'll unsubscribe you.</p>
<?php elseif($done): ?>
  <h1>Listo, no te enviaremos más avisos</h1>
  <p><?= $h($email) ?> ya no recibirá correos de EarnYourCert (avisos de renovación ni recordatorios de práctica). Tu progreso y tus certificaciones siguen guardados y verás los avisos dentro de la app.</p>
  <p class="en">Done. <?= $h($email) ?> will no longer receive EarnYourCert emails (renewal or practice reminders). Your progress and certifications stay saved and you'll still see the alerts in the app.</p>
  <p><a href="/">EarnYourCert</a></p>
<?php else: ?>
  <h1>¿Dejar de recibir correos de EarnYourCert?</h1>
  <p>Dejaremos de enviar avisos de renovación y recordatorios de práctica a <?= $h($email) ?>.</p>
  <p class="en">Stop renewal and practice reminders to <?= $h($email) ?>?</p>
  <form method="post" action="<?= $h($self) ?>"><button type="submit">Darme de baja · Unsubscribe</button></form>
<?php endif; ?>
</div>
</body>
</html>
