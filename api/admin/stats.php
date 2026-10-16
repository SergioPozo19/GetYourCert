<?php
// Métricas para el panel de administración (api/admin/panel.html). Protegido con admin_secret.
// POST { secret, days } -> usuarios, actividad, embudo, eventos por día, contenido y emails.
header('Content-Type: application/json');
require __DIR__ . '/../_db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method']); exit; }
$config = app_config();
$input = json_decode(file_get_contents('php://input'), true);
if (empty($config['admin_secret']) || !hash_equals((string)$config['admin_secret'], (string)($input['secret'] ?? ''))) {
  http_response_code(403); echo json_encode(['ok' => false, 'error' => 'forbidden']); exit;
}
$days = max(7, min(180, (int)($input['days'] ?? 30)));

function q($pdo, $sql, $params = []) { $s = $pdo->prepare($sql); $s->execute($params); return $s; }
function safe($fn, $default) { try { return $fn(); } catch (\Throwable $e) { return $default; } }

try {
  $pdo = db();
  $since = (new DateTimeImmutable('today'))->modify("-{$days} days")->format('Y-m-d');

  // ---- users (activity comes from the synced practice history: users.data.history[].date, ms)
  $rows = q($pdo, 'SELECT id, email, name, is_pro, email_opt_out, created_at, data FROM users')->fetchAll(PDO::FETCH_ASSOC);
  $now = time();
  $u = ['total' => count($rows), 'pro' => 0, 'new7' => 0, 'newPeriod' => 0, 'active7' => 0, 'active30' => 0, 'practiced' => 0, 'optOut' => 0];
  $newByDay = []; $activeByDay = []; $examsByUser = []; $recent = [];
  foreach ($rows as $r) {
    $created = strtotime($r['created_at']);
    if ($r['is_pro']) $u['pro']++;
    if ($r['email_opt_out']) $u['optOut']++;
    if ($created >= $now - 7 * 86400) $u['new7']++;
    if ($created >= strtotime($since)) { $u['newPeriod']++; $d = date('Y-m-d', $created); $newByDay[$d] = ($newByDay[$d] ?? 0) + 1; }
    $data = json_decode($r['data'] ?? '', true);
    $hist = is_array($data['history'] ?? null) ? $data['history'] : [];
    $last = 0;
    foreach ($hist as $h) {
      $t = (int)(($h['date'] ?? 0) / 1000); if ($t > $last) $last = $t;
      if ($t >= strtotime($since)) {
        $d = date('Y-m-d', $t); $activeByDay[$d][$r['id']] = 1;
        $ex = $h['examId'] ?? ''; if ($ex) $examsByUser[$ex][$r['id']] = 1;
      }
    }
    if ($hist) $u['practiced']++;
    if ($last >= $now - 7 * 86400) $u['active7']++;
    if ($last >= $now - 30 * 86400) $u['active30']++;
    $recent[] = ['name' => $r['name'], 'email' => $r['email'], 'pro' => (bool)$r['is_pro'], 'created' => $r['created_at'],
                 'last' => $last ? date('Y-m-d H:i', $last) : null, 'sessions' => count($hist)];
  }
  usort($recent, fn($a, $b) => strcmp($b['created'], $a['created']));
  $activeSeries = []; foreach ($activeByDay as $d => $set) $activeSeries[$d] = count($set);
  $examUsers = []; foreach ($examsByUser as $ex => $set) $examUsers[$ex] = count($set);
  arsort($examUsers);

  // ---- events (anonymous aggregate counters)
  $ev = q($pdo, 'SELECT name, SUM(cnt) AS total, SUM(CASE WHEN logged = 0 THEN cnt ELSE 0 END) AS guests,
                        SUM(CASE WHEN logged = 1 AND pro = 0 THEN cnt ELSE 0 END) AS free_users, SUM(CASE WHEN pro = 1 THEN cnt ELSE 0 END) AS pro_users
                 FROM events WHERE day >= ? GROUP BY name ORDER BY total DESC', [$since])->fetchAll(PDO::FETCH_ASSOC);
  $daily = q($pdo, 'SELECT day, name, SUM(cnt) AS c FROM events WHERE day >= ? GROUP BY day, name ORDER BY day', [$since])->fetchAll(PDO::FETCH_ASSOC);
  $byDay = [];
  foreach ($daily as $r) $byDay[$r['day']][$r['name']] = (int)$r['c'];

  // ---- content / community
  $answers = safe(fn() => q($pdo, 'SELECT exam, SUM(total) AS answers, SUM(correct) AS correct FROM question_stats GROUP BY exam ORDER BY answers DESC')->fetchAll(PDO::FETCH_ASSOC), []);
  $reviews = safe(fn() => q($pdo, 'SELECT COUNT(*) AS n, ROUND(AVG(rating), 2) AS avg FROM reviews')->fetch(PDO::FETCH_ASSOC), ['n' => 0, 'avg' => null]);
  $refs = safe(fn() => q($pdo, 'SELECT COUNT(*) AS n, SUM(rewarded) AS rewarded FROM referrals')->fetch(PDO::FETCH_ASSOC), ['n' => 0, 'rewarded' => 0]);
  $remind = safe(fn() => (int)q($pdo, 'SELECT COUNT(*) FROM cert_reminders WHERE sent_at >= ?', [$since])->fetchColumn(), 0);
  $winback = safe(fn() => (int)q($pdo, 'SELECT COUNT(*) FROM winback_mail WHERE sent_at >= ?', [$since])->fetchColumn(), 0);
  $winbackBack = safe(fn() => (int)q($pdo, 'SELECT COUNT(*) FROM winback_mail WHERE sent_at >= ? AND returned_at IS NOT NULL', [$since])->fetchColumn(), 0);

  echo json_encode(['ok' => true, 'days' => $days, 'since' => $since,
    'users' => $u, 'newByDay' => $newByDay, 'activeByDay' => $activeSeries, 'examUsers' => $examUsers,
    'recent' => array_slice($recent, 0, 25),
    'events' => $ev, 'eventsByDay' => $byDay,
    'answers' => $answers, 'reviews' => $reviews, 'referrals' => $refs,
    'emails' => ['renewal' => $remind, 'winback' => $winback, 'winbackReturned' => $winbackBack]]);
} catch (\Throwable $e) {
  error_log('[admin/stats.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'server']);
}
