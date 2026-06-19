<?php
header('Content-Type: application/json');
require __DIR__ . '/_db.php';

$pdo = db();
$user = bearer_user($pdo);

if(!$user){
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'unauthorized']);
  exit;
}

if($_SERVER['REQUEST_METHOD'] === 'GET'){
  echo json_encode([
    'ok' => true,
    'is_pro' => (bool)$user['is_pro'],
    'pro_code' => $user['pro_code'],
    'data' => $user['data'] ? json_decode($user['data']) : null,
  ]);
  exit;
}

if($_SERVER['REQUEST_METHOD'] === 'POST'){
  // Cap the stored payload so a single account cannot bloat the DB.
  $input = read_json_body(262144); // 256 KB
  if($input === null){
    echo json_encode(['ok' => false, 'error' => 'invalid']);
    exit;
  }

  $allowed = ['history', 'srs', 'bookmarks', 'lang', 'theme', 'achievements'];
  $data = [];
  foreach($allowed as $key){
    if(array_key_exists($key, $input)) $data[$key] = $input[$key];
  }

  $stmt = $pdo->prepare('UPDATE users SET data = ? WHERE id = ?');
  $stmt->execute([json_encode($data), $user['id']]);

  echo json_encode(['ok' => true]);
  exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method']);
