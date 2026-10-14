<?php
// Encuesta de baja: se enlaza desde el correo que envía patreon-webhook.php
// cuando un mecenas cancela. El enlace va firmado (mail_token 'survey').
// Guarda la respuesta en cancel_surveys y avisa a soporte.
require __DIR__ . '/_mail.php';

$email = strtolower(trim((string)($_GET['e'] ?? '')));
$token = (string)($_GET['t'] ?? '');
$lang = (($_GET['lang'] ?? 'es') === 'en') ? 'en' : 'es';
$valid = $email !== '' && mail_token_ok($email, 'survey', $token);

$REASONS = [
  'passed'    => ['Ya aprobé mi examen', 'I already passed my exam'],
  'paused'    => ['Voy a hacer una pausa en mis estudios', "I'm taking a break from studying"],
  'price'     => ['El precio', 'The price'],
  'content'   => ['Faltan exámenes o preguntas que necesito', "Exams or questions I need are missing"],
  'quality'   => ['Encontré errores en las preguntas', 'I found mistakes in the questions'],
  'other_app' => ['Uso otra plataforma', "I'm using another platform"],
  'technical' => ['Problemas técnicos o de acceso', 'Technical or access problems'],
  'other'     => ['Otro motivo', 'Other reason'],
];
$L = [
  'es' => [
    'title' => '¿Por qué cancelaste Pro?',
    'intro' => 'Gracias por haber apoyado EarnYourCert. Nos ayudas mucho si nos cuentas el motivo; lo leemos todo.',
    'comment' => '¿Algo que podamos mejorar? (opcional)',
    'send' => 'Enviar',
    'thanks' => '¡Gracias por tu respuesta!',
    'thanks2' => 'Tu progreso y tus certificaciones siguen guardados en tu cuenta. Si vuelves, todo estará donde lo dejaste.',
    'back' => 'Volver a EarnYourCert',
    'invalid' => 'Este enlace no es válido o está incompleto.',
    'pick' => 'Elige un motivo.',
  ],
  'en' => [
    'title' => 'Why did you cancel Pro?',
    'intro' => 'Thanks for supporting EarnYourCert. Telling us why helps a lot; we read every answer.',
    'comment' => 'Anything we could improve? (optional)',
    'send' => 'Send',
    'thanks' => 'Thanks for your answer!',
    'thanks2' => 'Your progress and certifications stay saved in your account. If you come back, everything will be where you left it.',
    'back' => 'Back to EarnYourCert',
    'invalid' => 'This link is not valid or is incomplete.',
    'pick' => 'Choose a reason.',
  ],
][$lang];
$li = $lang === 'en' ? 1 : 0;

$done = false;
$error = '';
if($valid && $_SERVER['REQUEST_METHOD'] === 'POST'){
  $reason = (string)($_POST['reason'] ?? '');
  $comment = mb_substr(trim((string)($_POST['comment'] ?? '')), 0, 2000);
  if(!isset($REASONS[$reason])){
    $error = $L['pick'];
  } else {
    $stmt = db()->prepare('INSERT INTO cancel_surveys (email, reason, comment, lang) VALUES (?, ?, ?, ?)');
    $stmt->execute([$email, $reason, $comment !== '' ? $comment : null, $lang]);
    send_mail('soporte@earnyourcert.com', 'Encuesta de baja · ' . $REASONS[$reason][0],
      "Email: {$email}\nMotivo: {$REASONS[$reason][0]}\nIdioma: {$lang}\n\nComentario:\n" . ($comment !== '' ? $comment : '-') . "\n");
    $done = true;
  }
}

$h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$self = '/api/survey.php?e=' . rawurlencode($email) . '&t=' . rawurlencode($token) . '&lang=' . $lang;
header('Content-Type: text/html; charset=UTF-8');
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>EarnYourCert · <?= $h($L['title']) ?></title>
<style>
:root{--bg:#EEF2F7;--panel:#fff;--ink:#0D1520;--ink-2:#3A4452;--line:#DDE4EE;--accent:#0F6CBD;--soft:#EAF3FB}
@media (prefers-color-scheme: dark){:root{--bg:#0D1520;--panel:#18212E;--ink:#E8EDF4;--ink-2:#B8C2CF;--line:#2A3545;--soft:#1C2B3D}}
body{font-family:-apple-system,system-ui,sans-serif;background:var(--bg);color:var(--ink);margin:0;padding:48px 16px;line-height:1.55}
.box{max-width:520px;margin:0 auto;background:var(--panel);border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(16,24,40,.08)}
h1{font-size:1.3rem;margin:0 0 10px}
p{margin:0 0 16px;color:var(--ink-2)}
label.opt{display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;cursor:pointer}
label.opt:has(input:checked){border-color:var(--accent);background:var(--soft)}
textarea{width:100%;box-sizing:border-box;min-height:90px;margin:6px 0 16px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--ink);font:inherit}
button{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:12px 22px;font-size:1rem;cursor:pointer}
.err{color:#C4314B;font-weight:600}
a{color:var(--accent)}
</style>
</head>
<body>
<div class="box">
<?php if(!$valid): ?>
  <h1><?= $h($L['invalid']) ?></h1>
  <p><a href="/"><?= $h($L['back']) ?></a></p>
<?php elseif($done): ?>
  <h1><?= $h($L['thanks']) ?></h1>
  <p><?= $h($L['thanks2']) ?></p>
  <p><a href="/?lang=<?= $lang ?>"><?= $h($L['back']) ?></a></p>
<?php else: ?>
  <h1><?= $h($L['title']) ?></h1>
  <p><?= $h($L['intro']) ?></p>
  <?php if($error): ?><p class="err"><?= $h($error) ?></p><?php endif; ?>
  <form method="post" action="<?= $h($self) ?>">
    <?php foreach($REASONS as $k => $r): ?>
      <label class="opt"><input type="radio" name="reason" value="<?= $k ?>" required> <?= $h($r[$li]) ?></label>
    <?php endforeach; ?>
    <label for="comment"><?= $h($L['comment']) ?></label>
    <textarea id="comment" name="comment" maxlength="2000"></textarea>
    <button type="submit"><?= $h($L['send']) ?></button>
  </form>
<?php endif; ?>
</div>
</body>
</html>
