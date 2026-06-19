<?php
// config.php vive FUERA de public_html (un nivel por encima) para que los
// despliegues por git (que solo tocan public_html) nunca lo borren ni lo sobreescriban.
function app_config(){
  static $config = null;
  if($config === null){
    $config = require __DIR__ . '/../../config.php';
  }
  return $config;
}

function db(){
  static $pdo = null;
  if($pdo === null){
    $config = app_config();
    $pdo = new PDO(
      "mysql:host={$config['host']};dbname={$config['db']};charset=utf8mb4",
      $config['user'],
      $config['pass'],
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
  }
  return $pdo;
}

// Reads the raw request body, enforcing a maximum size. On overflow it sends a
// 413 response and terminates. Returns the decoded array (or null on bad JSON).
function read_json_body($maxBytes = 262144){
  $raw = file_get_contents('php://input');
  if(strlen($raw) > $maxBytes){
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'too_large']);
    exit;
  }
  $data = json_decode($raw, true);
  return is_array($data) ? $data : null;
}

// Simple file-based rate limiter for shared hosting (no Redis). Returns true if
// the action is allowed, false if the client IP exceeded $max hits in $window
// seconds. Hit timestamps are stored per action+IP in a temp directory.
function rate_limit($action, $max, $window){
  $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
  $dir = sys_get_temp_dir() . '/eyc_rl';
  if(!is_dir($dir)) @mkdir($dir, 0700, true);
  $file = $dir . '/' . preg_replace('/[^a-z0-9_]/i', '', $action) . '_' . md5($ip) . '.json';
  $now  = time();
  $hits = [];
  if(is_file($file)){
    $raw  = @file_get_contents($file);
    $hits = $raw ? (json_decode($raw, true) ?: []) : [];
  }
  // Discard hits older than the window.
  $hits = array_values(array_filter($hits, function($t) use ($now, $window){ return $t > $now - $window; }));
  if(count($hits) >= $max) return false;
  $hits[] = $now;
  @file_put_contents($file, json_encode($hits), LOCK_EX);
  return true;
}

// Sends a 429 response and terminates when the given limit is exceeded.
function rate_limit_or_429($action, $max, $window){
  if(!rate_limit($action, $max, $window)){
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'rate_limited']);
    exit;
  }
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
