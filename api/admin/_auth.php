<?php
// Acceso de administración: sesión de Google de una cuenta administradora (Bearer, la misma que usa la app)
// o, como alternativa, el admin_secret de config.php.
// Los administradores se identifican por el SHA-256 del email (así el email no queda escrito en el repositorio).
// Se pueden añadir más en config.php: 'admin_emails' => ['otra@cuenta.com'].
require_once __DIR__ . '/../_db.php';

const ADMIN_EMAIL_HASHES = [
  'fc3005a27c457b74d25de21e13428d39b1c47e19ac6c64240f047c15bf843120',
];

function admin_allowed($pdo, $input){
  $config = app_config();
  $secret = (string)($input['secret'] ?? '');
  if ($secret !== '' && !empty($config['admin_secret']) && hash_equals((string)$config['admin_secret'], $secret)) return true;
  $user = bearer_user($pdo);
  if (!$user) return false;
  $email = strtolower(trim((string)$user['email']));
  if (in_array(hash('sha256', $email), ADMIN_EMAIL_HASHES, true)) return true;
  $extra = array_map(fn($e) => strtolower(trim($e)), (array)($config['admin_emails'] ?? []));
  return in_array($email, $extra, true);
}
