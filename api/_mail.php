<?php
// Utilidades de correo saliente (recordatorios de renovación, encuesta de baja).
// Usa mail() de Hostinger, igual que feedback.php. El remitente debe ser un
// buzón del propio dominio para que no acabe en spam.
require_once __DIR__ . '/_db.php';

const SITE_URL = 'https://earnyourcert.com';

// Firma HMAC para enlaces de un solo propósito (baja de correos, encuesta).
// Usa 'mail_secret' de config.php si existe; si no, 'admin_secret'.
function mail_token($email, $purpose){
  $config = app_config();
  $secret = $config['mail_secret'] ?? ($config['admin_secret'] ?? '');
  if($secret === '' || $secret === 'CHANGE_ME') throw new RuntimeException('mail_secret not configured');
  return substr(hash_hmac('sha256', $purpose . '|' . strtolower(trim($email)), $secret), 0, 32);
}

function mail_token_ok($email, $purpose, $token){
  try { return hash_equals(mail_token($email, $purpose), (string)$token); }
  catch (\Throwable $e) { return false; }
}

function unsubscribe_url($email){
  return SITE_URL . '/api/unsubscribe.php?e=' . rawurlencode($email) . '&t=' . mail_token($email, 'unsub');
}

// Envía un correo de texto plano. $unsub = URL de baja (añade List-Unsubscribe).
function send_mail($to, $subject, $text, $unsub = null){
  $config = app_config();
  $from = $config['mail_from'] ?? 'noreply@earnyourcert.com';
  $headers = "From: EarnYourCert <{$from}>\r\n"
    . "Reply-To: soporte@earnyourcert.com\r\n"
    . "MIME-Version: 1.0\r\n"
    . "Content-Type: text/plain; charset=UTF-8\r\n"
    . "Content-Transfer-Encoding: 8bit\r\n";
  if($unsub){
    $headers .= "List-Unsubscribe: <{$unsub}>\r\n"
      . "List-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n";
  }
  $encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
  return @mail($to, $encSubject, $text, $headers, '-f' . $from);
}
