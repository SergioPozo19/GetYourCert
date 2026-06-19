<?php
header('Content-Type: application/json');
require __DIR__ . '/_db.php';

try {
    $pdo = db();
} catch (\Throwable $e) {
    error_log('[comments.php] db: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'db']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $exam = $_GET['exam'] ?? '';
    $qid  = (int)($_GET['qid'] ?? 0);
    if (!$exam || !$qid) {
        echo json_encode(['ok' => false, 'error' => 'invalid']);
        exit;
    }
    $me    = bearer_user($pdo);
    $me_id = $me ? (int)$me['id'] : 0;
    try {
        $stmt = $pdo->prepare(
            'SELECT c.id, c.body, UNIX_TIMESTAMP(c.created_at) AS ts,
                    u.name, u.avatar_url, c.user_id,
                    (SELECT COUNT(*) FROM question_comment_likes l WHERE l.comment_id = c.id) AS likes,
                    (SELECT COUNT(*) FROM question_comment_likes l WHERE l.comment_id = c.id AND l.user_id = ?) AS liked_by_me
             FROM question_comments c
             INNER JOIN users u ON u.id = c.user_id
             WHERE c.exam = ? AND c.question_id = ?
             ORDER BY c.created_at ASC'
        );
        $stmt->execute([$me_id, $exam, $qid]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$c) {
            $c['likes']       = (int)$c['likes'];
            $c['liked_by_me'] = (bool)$c['liked_by_me'];
            $c['is_mine']     = $me_id && (int)$c['user_id'] === $me_id;
            unset($c['user_id']);
        }
        echo json_encode(['ok' => true, 'comments' => $rows]);
    } catch (\Throwable $e) {
        error_log('[comments.php] GET: ' . $e->getMessage());
        echo json_encode(['ok' => true, 'comments' => []]);
    }
    exit;
}

$user = bearer_user($pdo);
if (!$user) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']);
    exit;
}

if ($method === 'POST') {
    $input = read_json_body(8192);
    if ($input === null) {
        echo json_encode(['ok' => false, 'error' => 'invalid']);
        exit;
    }
    $action = $input['action'] ?? 'post';
    // Throttle new comments (likes are cheap and idempotent, so they are exempt).
    if ($action === 'post') {
        rate_limit_or_429('comment_post', 20, 3600);
    }

    if ($action === 'like') {
        $comment_id = (int)($input['id'] ?? 0);
        if (!$comment_id) { echo json_encode(['ok' => false, 'error' => 'invalid']); exit; }
        try {
            $check = $pdo->prepare('SELECT 1 FROM question_comment_likes WHERE comment_id = ? AND user_id = ?');
            $check->execute([$comment_id, $user['id']]);
            if ($check->fetchColumn()) {
                $pdo->prepare('DELETE FROM question_comment_likes WHERE comment_id = ? AND user_id = ?')->execute([$comment_id, $user['id']]);
                $liked = false;
            } else {
                $pdo->prepare('INSERT INTO question_comment_likes (comment_id, user_id) VALUES (?, ?)')->execute([$comment_id, $user['id']]);
                $liked = true;
            }
            $cnt = $pdo->prepare('SELECT COUNT(*) FROM question_comment_likes WHERE comment_id = ?');
            $cnt->execute([$comment_id]);
            echo json_encode(['ok' => true, 'liked' => $liked, 'likes' => (int)$cnt->fetchColumn()]);
        } catch (\Throwable $e) {
            error_log('[comments.php] like: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'server']);
        }
        exit;
    }

    // action === 'post'
    $exam = trim($input['exam'] ?? '');
    $qid  = (int)($input['qid'] ?? 0);
    $body = trim($input['body'] ?? '');
    if (!$exam || !$qid || !$body) {
        echo json_encode(['ok' => false, 'error' => 'invalid']);
        exit;
    }
    $body = substr($body, 0, 2000);
    try {
        $stmt = $pdo->prepare('INSERT INTO question_comments (exam, question_id, user_id, body) VALUES (?, ?, ?, ?)');
        $stmt->execute([$exam, $qid, $user['id'], $body]);
        $new_id = (int)$pdo->lastInsertId();
        echo json_encode([
            'ok' => true,
            'comment' => [
                'id'          => $new_id,
                'body'        => $body,
                'ts'          => time(),
                'name'        => $user['name'],
                'avatar_url'  => $user['avatar_url'],
                'likes'       => 0,
                'liked_by_me' => false,
                'is_mine'     => true,
            ],
        ]);
    } catch (\Throwable $e) {
        error_log('[comments.php] post: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'server']);
    }
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['ok' => false, 'error' => 'invalid']); exit; }
    try {
        $pdo->prepare('DELETE FROM question_comments WHERE id = ? AND user_id = ?')->execute([$id, $user['id']]);
        echo json_encode(['ok' => true]);
    } catch (\Throwable $e) {
        error_log('[comments.php] delete: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'server']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method']);
