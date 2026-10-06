<?php
// Contador de eventos agregado y anónimo (sin cookies, sin IP, sin identificadores de usuario).
// Solo guarda: día, nombre del evento, idioma, ¿sesión iniciada?, ¿Pro? y un contador.
header('Content-Type: application/json');
require __DIR__ . '/_db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

const EVENT_NAMES = [
    'visit_home', 'visit_pro', 'visit_landing',
    'hero_new', 'hero_pro', 'hero_career', 'hero_chip',
    'news_open', 'pack_start',
    'bonus_promo_click', 'review_posted', 'bonus_granted',
    'results_pro_click', 'results_signup_click', 'cert_add', 'career_open',
    'patreon_hero', 'patreon_modal', 'patreon_footer', 'patreon_other', 'patreon_prohtml',
    'landing_cta', 'landing_sticky',
    'exam_start', 'exam_pass', 'exam_fail',
    'paywall_limit', 'paywall_manual',
];

$raw = file_get_contents('php://input');
if (strlen($raw) > 512) { http_response_code(413); echo json_encode(['ok' => false]); exit; }
$in = json_decode($raw, true);
$name = is_array($in) ? (string)($in['n'] ?? '') : '';
if (!in_array($name, EVENT_NAMES, true)) {
    echo json_encode(['ok' => false, 'error' => 'name']);
    exit;
}
$lang   = (isset($in['l']) && $in['l'] === 'en') ? 'en' : 'es';
$logged = !empty($in['a']) ? 1 : 0;
$pro    = !empty($in['p']) ? 1 : 0;

try {
    $pdo = db();
    $pdo->prepare(
        'INSERT INTO events (day, name, lang, logged, pro, cnt) VALUES (CURDATE(), ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE cnt = cnt + 1'
    )->execute([$name, $lang, $logged, $pro]);
    echo json_encode(['ok' => true]);
} catch (\Throwable $e) {
    // Si la tabla aún no existe, no rompemos nada en el cliente.
    error_log('[events.php] ' . $e->getMessage());
    echo json_encode(['ok' => false]);
}
