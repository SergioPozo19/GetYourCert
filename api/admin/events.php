<?php
header('Content-Type: application/json');
require __DIR__ . '/../_db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

$config = app_config();
$input = json_decode(file_get_contents('php://input'), true);
$secret = $input['secret'] ?? '';
if (empty($config['admin_secret']) || !hash_equals((string)$config['admin_secret'], (string)$secret)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

$days = max(1, min(180, (int)($input['days'] ?? 30)));

try {
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT name, SUM(cnt) AS total,
                SUM(CASE WHEN logged = 0 THEN cnt ELSE 0 END) AS guests,
                SUM(CASE WHEN logged = 1 AND pro = 0 THEN cnt ELSE 0 END) AS free_users,
                SUM(CASE WHEN pro = 1 THEN cnt ELSE 0 END) AS pro_users
         FROM events WHERE day >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY name ORDER BY total DESC'
    );
    $stmt->bindValue(1, $days, PDO::PARAM_INT);
    $stmt->execute();
    $daily = $pdo->prepare(
        'SELECT day, SUM(cnt) AS total FROM events
         WHERE name = ? AND day >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY day ORDER BY day'
    );
    $daily->bindValue(1, 'visit_home');
    $daily->bindValue(2, $days, PDO::PARAM_INT);
    $daily->execute();
    echo json_encode(['ok' => true, 'days' => $days, 'events' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'visits_by_day' => $daily->fetchAll(PDO::FETCH_ASSOC)]);
} catch (\Throwable $e) {
    error_log('[admin/events.php] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'server']);
}
