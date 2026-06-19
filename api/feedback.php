<?php
header('Content-Type: application/json');
require __DIR__ . '/_db.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method']);
  exit;
}

// Throttle feedback submissions: max 10 per hour per IP.
rate_limit_or_429('feedback', 10, 3600);

$input = read_json_body(8192);
if($input === null){
  echo json_encode(['ok' => false, 'error' => 'invalid']);
  exit;
}

$code = isset($input['code']) ? substr(trim((string)$input['code']), 0, 30) : '';
$qid = isset($input['qid']) ? (int)$input['qid'] : 0;
$cat = isset($input['cat']) ? substr(trim((string)$input['cat']), 0, 30) : '';
$comment = isset($input['comment']) ? substr(trim((string)$input['comment']), 0, 2000) : '';

if($code === '' || $qid <= 0 || $cat === ''){
  echo json_encode(['ok' => false, 'error' => 'invalid']);
  exit;
}

$to = 'soporte@earnyourcert.com';
$subject = 'Feedback sobre pregunta · ' . $code . ' · #' . $qid;

$body = "Nuevo comentario recibido desde la app:\n\n"
  . "Examen: " . $code . "\n"
  . "ID de la pregunta: " . $qid . "\n"
  . "Tipo: " . $cat . "\n\n"
  . "Comentario:\n" . ($comment !== '' ? $comment : '-') . "\n";

$headers = "From: EarnYourCert <noreply@earnyourcert.com>\r\n"
  . "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = @mail($to, $subject, $body, $headers);

echo json_encode(['ok' => (bool)$sent]);
