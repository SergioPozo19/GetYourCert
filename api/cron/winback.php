<?php
// Emails para recuperar a quien deja de practicar ("win-back").
// Se ejecuta a diario al final de renewal-reminders.php (mismo cron); también se puede lanzar solo:
//   /usr/bin/php .../api/cron/winback.php [--dry-run]
//
// Reglas (para no molestar):
//   - solo cuentas que han practicado alguna vez y no se han dado de baja (email_opt_out)
//   - el último examen/práctica fue hace entre 7 y 60 días
//   - un solo email por racha de inactividad (si vuelve a practicar y lo deja otra vez, puede recibir otro)
//   - nunca más de un email cada 21 días, y como máximo 4 en total por cuenta
// Contenido: su dominio más flojo del último examen que practicó, con enlace directo a practicarlo.
// Si la persona vuelve a practicar después del email se marca returned_at (lo muestra el panel).

if (PHP_SAPI !== 'cli') { http_response_code(403); exit("Forbidden\n"); }
require_once __DIR__ . '/../_mail.php';

(function () {
  global $argv;
  $dryRun = in_array('--dry-run', $argv ?? [], true);
  $pdo = db();
  $pdo->exec('CREATE TABLE IF NOT EXISTS winback_mail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    exam_id VARCHAR(32) NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    returned_at TIMESTAMP NULL,
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)');

  $html = @file_get_contents(__DIR__ . '/../../index.html');
  if ($html === false || !preg_match('#<script id="examsdata" type="application/json">(.*?)</script>#s', $html, $m)) { fwrite(STDERR, "examsdata not found\n"); return; }
  $exams = []; foreach (json_decode($m[1], true) ?: [] as $ex) $exams[$ex['id']] = $ex;

  $T = [
    'es' => [
      'subj' => '{name}tu preparación de {code} te espera',
      'subjDom' => '{name}repasa «{dom}» de {code}',
      'hello' => 'Hola{name}:',
      'p1' => 'Hace {n} días que no practicas {code} en EarnYourCert. Retomarlo con una sesión corta es lo que más ayuda a no perder lo aprendido.',
      'weak' => 'Tu punto más flojo ahora mismo es «{dom}», con un {p}% de acierto (el aprobado está en el {pass}%). Te dejamos el enlace directo para practicar solo ese dominio:',
      'noweak' => 'Puedes seguir justo donde lo dejaste:',
      'last' => 'Tu último simulacro fue un {p}%.',
      'tip' => 'Consejo: 10-15 preguntas al día con el repaso inteligente rinden más que un simulacro largo de vez en cuando.',
      'bye' => "¡Ánimo con la certificación!\nEl equipo de EarnYourCert",
      'unsub' => 'Si no quieres recibir más correos como este: {url}',
    ],
    'en' => [
      'subj' => '{name}your {code} prep is waiting',
      'subjDom' => '{name}review "{dom}" for {code}',
      'hello' => 'Hi{name},',
      'p1' => "It's been {n} days since you last practised {code} on EarnYourCert. A short session now is the best way to keep what you've learned.",
      'weak' => 'Your weakest area right now is "{dom}" at {p}% (the pass mark is {pass}%). Here is a direct link to practise just that domain:',
      'noweak' => 'Pick up right where you left off:',
      'last' => 'Your last mock exam score was {p}%.',
      'tip' => 'Tip: 10-15 questions a day with smart review beat one long mock exam every now and then.',
      'bye' => "Good luck with your certification!\nThe EarnYourCert team",
      'unsub' => "If you don't want more emails like this: {url}",
    ],
  ];
  $tr = function ($s, $v) { foreach ($v as $k => $x) $s = str_replace('{' . $k . '}', $x, $s); return $s; };

  $users = $pdo->query("SELECT id, email, name, data FROM users WHERE email_opt_out = 0 AND data LIKE '%\"history\"%'")->fetchAll(PDO::FETCH_ASSOC);
  $prev = $pdo->prepare('SELECT id, sent_at, returned_at FROM winback_mail WHERE user_id = ? ORDER BY sent_at DESC');
  $markBack = $pdo->prepare('UPDATE winback_mail SET returned_at = FROM_UNIXTIME(?) WHERE id = ? AND returned_at IS NULL');
  $ins = $pdo->prepare('INSERT INTO winback_mail (user_id, exam_id) VALUES (?, ?)');
  $stats = ['candidates' => 0, 'emails' => 0, 'failed' => 0, 'returned' => 0];
  $now = time();

  foreach ($users as $u) {
    $data = json_decode($u['data'] ?? '', true);
    $hist = is_array($data['history'] ?? null) ? $data['history'] : [];
    if (!$hist) continue;
    usort($hist, fn($a, $b) => ($b['date'] ?? 0) <=> ($a['date'] ?? 0));
    $lastT = (int)(($hist[0]['date'] ?? 0) / 1000);
    if (!$lastT) continue;

    $prev->execute([$u['id']]);
    $sent = $prev->fetchAll(PDO::FETCH_ASSOC);
    // came back after an email -> record it
    foreach ($sent as $s) {
      if (!$s['returned_at'] && $lastT > strtotime($s['sent_at'])) { if (!$dryRun) $markBack->execute([$lastT, $s['id']]); $stats['returned']++; }
    }
    $idle = (int)floor(($now - $lastT) / 86400);
    if ($idle < 7 || $idle > 60) continue;
    if (count($sent) >= 4) continue;
    if ($sent) {
      $lastSent = strtotime($sent[0]['sent_at']);
      if ($lastSent > $lastT) continue;                 // already emailed during this inactive streak
      if ($now - $lastSent < 21 * 86400) continue;      // at most one email every 21 days
    }
    $stats['candidates']++;

    $ex = $exams[$hist[0]['examId'] ?? ''] ?? null;
    if (!$ex || !empty($ex['soon'])) continue;
    $lang = (($data['lang'] ?? 'es') === 'en') ? 'en' : 'es';
    $t = $T[$lang];
    $pass = (int)($ex['pass'] ?? 70);

    // weakest domain of that exam across the user's history (needs >= 5 answers)
    $acc = [];
    foreach ($hist as $h) {
      if (($h['examId'] ?? '') !== $ex['id'] || !is_array($h['dom'] ?? null)) continue;
      foreach ($h['dom'] as $d => $o) { $acc[$d]['c'] = ($acc[$d]['c'] ?? 0) + (int)($o['c'] ?? 0); $acc[$d]['t'] = ($acc[$d]['t'] ?? 0) + (int)($o['t'] ?? 0); }
    }
    $weak = null;
    foreach ($acc as $d => $o) {
      if ($o['t'] < 5) continue;
      $p = (int)round($o['c'] / $o['t'] * 100);
      if ($weak === null || $p < $weak['p']) $weak = ['d' => (int)$d, 'p' => $p];
    }
    $domName = null;
    if ($weak) foreach ($ex['domains'] ?? [] as $dd) if ((int)$dd['id'] === $weak['d']) $domName = $dd['name_' . $lang] ?? null;
    $lastMock = null;
    foreach ($hist as $h) if (($h['examId'] ?? '') === $ex['id'] && ($h['mode'] ?? '') === 'exam' && isset($h['pct'])) { $lastMock = (int)$h['pct']; break; }

    $first = trim(explode(' ', (string)$u['name'])[0] ?? '');
    $nm = $first !== '' ? $first . ', ' : '';
    $subject = ($weak && $domName && $weak['p'] < $pass)
      ? $tr($t['subjDom'], ['name' => $nm, 'dom' => $domName, 'code' => $ex['code']])
      : $tr($t['subj'], ['name' => $nm, 'code' => $ex['code']]);
    $subject = mb_strtoupper(mb_substr($subject, 0, 1)) . mb_substr($subject, 1);

    $base = SITE_URL . '/?exam=' . $ex['id'];
    $lines = [$tr($t['hello'], ['name' => $first !== '' ? ' ' . $first : '']), '', $tr($t['p1'], ['n' => $idle, 'code' => $ex['code']]), ''];
    if ($weak && $domName && $weak['p'] < 100) {
      $lines[] = $tr($t['weak'], ['dom' => $domName, 'p' => $weak['p'], 'pass' => $pass]);
      $lines[] = $base . '&dom=' . $weak['d'] . '&lang=' . $lang;
    } else {
      $lines[] = $t['noweak'];
      $lines[] = $base . '&lang=' . $lang;
    }
    if ($lastMock !== null) { $lines[] = ''; $lines[] = $tr($t['last'], ['p' => $lastMock]); }
    $unsub = unsubscribe_url($u['email']);
    array_push($lines, '', $t['tip'], '', $t['bye'], '', '--', $tr($t['unsub'], ['url' => $unsub]));
    $text = implode("\n", $lines) . "\n";

    if ($dryRun) { echo "=== To: {$u['email']} | {$subject}\n{$text}\n"; $stats['emails']++; continue; }
    if (send_mail($u['email'], $subject, $text, $unsub)) { $ins->execute([$u['id'], $ex['id']]); $stats['emails']++; }
    else $stats['failed']++;
  }
  echo date('Y-m-d H:i:s') . ' winback' . ($dryRun ? ' (dry run)' : '')
    . " candidates={$stats['candidates']} emails={$stats['emails']} failed={$stats['failed']} returned={$stats['returned']}\n";
})();
