<?php
header('Content-Type: application/json');
require __DIR__ . '/_db.php';

try {
    $pdo = db();
} catch (\Throwable $e) {
    error_log('[reviews.php] db: ' . $e->getMessage());
    // Reviews are non-essential: GET degrades to an empty list instead of 500
    // so the homepage reviews section never errors if the DB is unreachable.
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(['ok' => true, 'reviews' => []]);
    } else {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'db']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query(
            'SELECT r.rating, r.body, UNIX_TIMESTAMP(r.updated_at) AS ts,
                    u.name, u.avatar_url
             FROM reviews r
             INNER JOIN users u ON u.id = r.user_id
             ORDER BY r.updated_at DESC'
        );
        echo json_encode(['ok' => true, 'reviews' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (\Throwable $e) {
        error_log('[reviews.php] GET: ' . $e->getMessage());
        echo json_encode(['ok' => true, 'reviews' => []]);
    }
    exit;
}

$user = bearer_user($pdo);
if (!$user) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    rate_limit_or_429('review_post', 10, 3600);
    $input = read_json_body(4096);
    if ($input === null) {
        echo json_encode(['ok' => false, 'error' => 'invalid']);
        exit;
    }

    $rating = isset($input['rating']) ? (int)$input['rating'] : 0;
    if ($rating < 1 || $rating > 5) {
        echo json_encode(['ok' => false, 'error' => 'invalid_rating']);
        exit;
    }

    $body = isset($input['body']) ? substr(trim((string)$input['body']), 0, 1000) : null;
    if ($body === '') $body = null;

    $data = json_decode($user['data'] ?? '{}', true) ?: [];
    $answered = count($data['srs'] ?? []);
    if ($answered < 10) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'need_more_questions', 'answered' => $answered]);
        exit;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO reviews (user_id, rating, body) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), body = VALUES(body), updated_at = NOW()'
    );
    $stmt->execute([$user['id'], $rating, $body]);
    echo json_encode(['ok' => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $stmt = $pdo->prepare('DELETE FROM reviews WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method']);
