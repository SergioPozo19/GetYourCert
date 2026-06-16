<?php
header('Content-Type: application/json');
require __DIR__ . '/_db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$exam    = trim($input['exam'] ?? '');
$qid     = (int)($input['qid'] ?? 0);
$correct = (bool)($input['correct'] ?? false);

if (!$exam || !$qid) {
    echo json_encode(['ok' => false, 'error' => 'invalid']);
    exit;
}

try {
    $pdo = db();
    if ($correct) {
        $pdo->prepare(
            'INSERT INTO question_stats (exam, question_id, correct, total) VALUES (?, ?, 1, 1)
             ON DUPLICATE KEY UPDATE correct = correct + 1, total = total + 1'
        )->execute([$exam, $qid]);
    } else {
        $pdo->prepare(
            'INSERT INTO question_stats (exam, question_id, correct, total) VALUES (?, ?, 0, 1)
             ON DUPLICATE KEY UPDATE total = total + 1'
        )->execute([$exam, $qid]);
    }
    $stmt = $pdo->prepare('SELECT correct, total FROM question_stats WHERE exam = ? AND question_id = ?');
    $stmt->execute([$exam, $qid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['ok' => true, 'correct' => (int)$row['correct'], 'total' => (int)$row['total']]);
} catch (\Throwable $e) {
    error_log('[stats.php] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'server']);
}
