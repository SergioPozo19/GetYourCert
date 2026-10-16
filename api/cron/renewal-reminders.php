<?php
// Recordatorios por email de renovación de certificaciones.
//
// Ejecutar UNA vez al día desde el cron de Hostinger (hPanel -> Avanzado -> Cron Jobs):
//   /usr/bin/php /home/uXXXXXXXX/domains/earnyourcert.com/public_html/api/cron/renewal-reminders.php
// Prueba sin enviar nada:
//   /usr/bin/php .../renewal-reminders.php --dry-run
//
// Lee las certificaciones que cada usuario ha guardado en "Mis certificaciones"
// (users.data.certs, sincronizado desde la app) y avisa:
//   - open: se abre la ventana de renovación gratuita (180 días antes)
//   - d30:  quedan 30 días
//   - d7:   quedan 7 días
// Cada aviso se envía una sola vez por certificación y fecha de caducidad
// (tabla cert_reminders); si el usuario renueva, la caducidad cambia y el ciclo
// vuelve a empezar. Las de nivel Fundamentals no caducan y se ignoran.

if(PHP_SAPI !== 'cli'){
  http_response_code(403);
  exit("Forbidden\n");
}

require __DIR__ . '/../_mail.php';

$dryRun = in_array('--dry-run', $argv, true);
$today = new DateTimeImmutable('today', new DateTimeZone('UTC'));

// Catálogo de exámenes: se lee del bloque examsdata de index.html para no
// duplicar códigos ni niveles.
$html = @file_get_contents(__DIR__ . '/../../index.html');
if($html === false || !preg_match('#<script id="examsdata" type="application/json">(.*?)</script>#s', $html, $m)){
  fwrite(STDERR, "No se pudo leer examsdata de index.html\n");
  exit(1);
}
$exams = [];
foreach(json_decode($m[1], true) ?: [] as $ex){
  $exams[$ex['id']] = $ex;
}

// Avisos de más urgente a menos urgente: [tipo, días restantes como máximo]
$KINDS = [['d7', 7], ['d30', 30], ['open', 180]];

$T = [
  'es' => [
    'subj_open' => 'Ya puedes renovar gratis tu certificación {code}',
    'subj_d30'  => 'Tu certificación {code} caduca en {n} días',
    'subj_d7'   => 'Última semana para renovar {code}',
    'hello'     => 'Hola{name}:',
    'line_open' => '- {title} ({code}): caduca el {date}. La renovación gratuita ya está disponible.',
    'line_d30'  => '- {title} ({code}): caduca el {date}, dentro de {n} días.',
    'line_d7'   => '- {title} ({code}): caduca el {date}, dentro de {n} días. ¡No lo dejes para el último momento!',
    'intro'     => 'Te escribimos porque tienes estas certificaciones en EarnYourCert:',
    'how'       => "Renovar es gratis: haces una evaluación online en Microsoft Learn, sin examinador y sin límite de tiempo estricto. Si no la superas, puedes repetirla.\nCómo renovar: https://learn.microsoft.com/es-es/credentials/certifications/renew-your-microsoft-certification",
    'practice'  => 'Repasa antes con las preguntas actualizadas:',
    'pro'       => 'Tu acceso Pro ya no está activo. Puedes reactivarlo por 1,99 € al mes cuando quieras: https://www.patreon.com/earnyourcert/membership',
    'bye'       => "Mucho éxito,\nEl equipo de EarnYourCert",
    'unsub'     => 'Si no quieres recibir más avisos de renovación: {url}',
  ],
  'en' => [
    'subj_open' => 'You can now renew your {code} certification for free',
    'subj_d30'  => 'Your {code} certification expires in {n} days',
    'subj_d7'   => 'Last week to renew {code}',
    'hello'     => 'Hi{name},',
    'line_open' => '- {title} ({code}): expires on {date}. Free renewal is now open.',
    'line_d30'  => '- {title} ({code}): expires on {date}, in {n} days.',
    'line_d7'   => "- {title} ({code}): expires on {date}, in {n} days. Don't leave it to the last minute!",
    'intro'     => "We're writing because you track these certifications on EarnYourCert:",
    'how'       => "Renewing is free: you take an online assessment on Microsoft Learn, unproctored, and you can retake it if you don't pass.\nHow to renew: https://learn.microsoft.com/en-us/credentials/certifications/renew-your-microsoft-certification",
    'practice'  => 'Review first with up-to-date questions:',
    'pro'       => 'Your Pro access is no longer active. You can reactivate it for €1.99 a month at any time: https://www.patreon.com/earnyourcert/membership',
    'bye'       => "Good luck,\nThe EarnYourCert team",
    'unsub'     => "If you don't want more renewal reminders: {url}",
  ],
];

function tr($s, $vars){
  foreach($vars as $k => $v) $s = str_replace('{' . $k . '}', $v, $s);
  return $s;
}

$pdo = db();
$users = $pdo->query(
  "SELECT id, email, name, is_pro, data FROM users
   WHERE email_opt_out = 0 AND data LIKE '%\"certs\"%'"
)->fetchAll(PDO::FETCH_ASSOC);

$wasSent = $pdo->prepare('SELECT kind FROM cert_reminders WHERE user_id = ? AND exam_id = ? AND expires = ?');
$markSent = $pdo->prepare('INSERT IGNORE INTO cert_reminders (user_id, exam_id, expires, kind) VALUES (?, ?, ?, ?)');

$stats = ['users' => count($users), 'emails' => 0, 'failed' => 0];

foreach($users as $u){
  $data = json_decode($u['data'] ?? '', true);
  $certs = is_array($data['certs'] ?? null) ? $data['certs'] : [];
  $lang = (($data['lang'] ?? 'es') === 'en') ? 'en' : 'es';
  $t = $T[$lang];

  $due = []; // [kind, n, exam, expires, alsoMark[]]
  foreach($certs as $c){
    $ex = $exams[$c['examId'] ?? ''] ?? null;
    if(!$ex || ($ex['level'] ?? '') === 'fundamentals') continue;
    $exp = $c['expires'] ?? null;
    if(!$exp && !empty($c['earned'])){
      $exp = (new DateTimeImmutable($c['earned'], new DateTimeZone('UTC')))->modify('+1 year')->format('Y-m-d');
    }
    if(!$exp || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $exp)) continue;
    $n = (int)$today->diff(new DateTimeImmutable($exp, new DateTimeZone('UTC')))->format('%r%a');
    if($n < 0) continue;

    $wasSent->execute([$u['id'], $ex['id'], $exp]);
    $sent = $wasSent->fetchAll(PDO::FETCH_COLUMN);

    // El aviso más urgente que corresponde hoy; si ya se envió, nada.
    // Al enviarlo se marcan también los menos urgentes para no mandarlos tarde.
    foreach($KINDS as $i => [$kind, $max]){
      if($n > $max) continue;
      if(!in_array($kind, $sent, true)){
        $due[] = [$kind, $n, $ex, $exp, array_column(array_slice($KINDS, $i), 0)];
      }
      break;
    }
  }
  if(!$due) continue;

  usort($due, fn($a, $b) => $a[1] <=> $b[1]);
  $first = $due[0];
  $subject = tr($t['subj_' . $first[0]], ['code' => $first[2]['code'], 'n' => $first[1]]);

  $first_name = trim(explode(' ', (string)$u['name'])[0] ?? '');
  $lines = [tr($t['hello'], ['name' => $first_name !== '' ? ' ' . $first_name : '']), '', $t['intro'], ''];
  foreach($due as [$kind, $n, $ex, $exp]){
    $dateFmt = $lang === 'es'
      ? DateTimeImmutable::createFromFormat('Y-m-d', $exp)->format('d/m/Y')
      : DateTimeImmutable::createFromFormat('Y-m-d', $exp)->format('M j, Y');
    $title = $ex['title_' . $lang] ?? $ex['code'];
    $lines[] = tr($t['line_' . $kind], ['title' => $title, 'code' => $ex['code'], 'date' => $dateFmt, 'n' => $n]);
  }
  $lines[] = '';
  $lines[] = $t['how'];
  $lines[] = '';
  $lines[] = $t['practice'];
  foreach($due as [, , $ex]){
    $lines[] = '  ' . $ex['code'] . ': ' . SITE_URL . '/?exam=' . $ex['id'] . '&lang=' . $lang;
  }
  if(!(int)$u['is_pro']){
    $lines[] = '';
    $lines[] = $t['pro'];
  }
  $unsub = unsubscribe_url($u['email']);
  $lines[] = '';
  $lines[] = $t['bye'];
  $lines[] = '';
  $lines[] = '--';
  $lines[] = tr($t['unsub'], ['url' => $unsub]);
  $text = implode("\n", $lines) . "\n";

  if($dryRun){
    echo "=== To: {$u['email']} | {$subject}\n{$text}\n";
    $stats['emails']++;
    continue;
  }

  if(send_mail($u['email'], $subject, $text, $unsub)){
    foreach($due as [, , $ex, $exp, $marks]){
      foreach($marks as $kind) $markSent->execute([$u['id'], $ex['id'], $exp, $kind]);
    }
    $stats['emails']++;
  } else {
    $stats['failed']++;
  }
}

echo date('Y-m-d H:i:s') . ' renewal-reminders' . ($dryRun ? ' (dry run)' : '')
  . " users={$stats['users']} emails={$stats['emails']} failed={$stats['failed']}\n";

// Emails de recuperación para quien deja de practicar (mismo cron diario).
require __DIR__ . '/winback.php';
