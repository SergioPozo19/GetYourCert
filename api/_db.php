<?php
function db(){
  static $pdo = null;
  if($pdo === null){
    $config = require __DIR__ . '/config.php';
    $pdo = new PDO(
      "mysql:host={$config['host']};dbname={$config['db']};charset=utf8mb4",
      $config['user'],
      $config['pass'],
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
  }
  return $pdo;
}

// Returns the users row for a valid, non-expired Bearer session token, or null.
function bearer_user($pdo){
  $headers = function_exists('getallheaders') ? getallheaders() : [];
  $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
  if(!preg_match('/^Bearer\s+([A-Za-z0-9]+)$/', trim($auth), $m)) return null;
  $token = $m[1];

  $stmt = $pdo->prepare(
    'SELECT u.* FROM users u
     INNER JOIN sessions s ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > NOW()'
  );
  $stmt->execute([$token]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}
