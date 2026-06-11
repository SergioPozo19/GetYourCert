<?php
// IMPORTANTE: este archivo debe colocarse como "config.php" UN NIVEL POR
// ENCIMA de public_html (es decir, fuera de la carpeta que despliega git),
// para que los despliegues automáticos no lo borren ni lo sobreescriban.
// Rellena con tus credenciales reales de la base de datos MySQL creada en
// hPanel. config.php NO se sube a git.
return [
  'host' => 'localhost',
  'db'   => 'uXXXXXXXX_earnyourcert',
  'user' => 'uXXXXXXXX_eyc',
  'pass' => 'CHANGE_ME',
  // Google OAuth Client ID (Cloud Console -> Credentials -> OAuth client ID -> Web application)
  'google_client_id' => 'CHANGE_ME.apps.googleusercontent.com',
  // Clave secreta para conceder/revocar Pro manualmente desde api/admin/grant-pro.html
  // Genera una cadena aleatoria larga, ej: bin2hex(random_bytes(24))
  'admin_secret' => 'CHANGE_ME',
  // Secreto del webhook de Patreon (Creators -> Settings -> Webhooks)
  'patreon_webhook_secret' => 'CHANGE_ME',
];
