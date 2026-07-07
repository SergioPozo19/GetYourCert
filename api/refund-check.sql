-- =====================================================================
-- Comprobación antifraude para solicitudes de reembolso
-- Uso: sustituye 'correo@ejemplo.com' por el email del usuario en las
-- 3 consultas y ejecútalas en phpMyAdmin / tu cliente MySQL.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Estado de la cuenta y del pledge de Patreon
--    Responde: ¿llegó a tener is_pro=1? ¿hay un pledge activo/inactivo
--    a su nombre? ¿cuándo se actualizó por última vez?
-- ---------------------------------------------------------------------
SELECT
  u.id, u.email, u.is_pro, u.pro_code, u.patreon_member_id,
  u.created_at   AS account_created,
  u.updated_at   AS account_last_updated,
  p.member_id    AS patreon_member_id_pledge,
  p.active       AS patreon_pledge_active,
  p.updated_at   AS patreon_pledge_last_updated
FROM users u
LEFT JOIN patreon_pledges p ON p.email = u.email
WHERE u.email = 'correo@ejemplo.com';

-- ---------------------------------------------------------------------
-- B) Historial de inicios de sesión (sessions no se borran al crear
--    una nueva, así que esto es de facto un log de accesos)
--    Responde: ¿entró a la app después de la fecha del pago?
-- ---------------------------------------------------------------------
SELECT s.created_at AS login_at, s.expires_at
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE u.email = 'correo@ejemplo.com'
ORDER BY s.created_at DESC;

-- ---------------------------------------------------------------------
-- C) Uso real: nº de exámenes hechos, preguntas totales respondidas,
--    y rango de fechas de actividad (extraído del JSON users.data.history)
--    Requiere MySQL 8.0.4+. Si el usuario no tiene historial, no
--    devuelve fila (JOIN vacío = no ha hecho ningún examen logueado).
-- ---------------------------------------------------------------------
SELECT
  u.email,
  u.is_pro,
  COUNT(jt.total)                              AS intentos_examen,
  SUM(jt.total)                                AS preguntas_respondidas,
  FROM_UNIXTIME(MIN(jt.date_ms)/1000)          AS primera_actividad,
  FROM_UNIXTIME(MAX(jt.date_ms)/1000)          AS ultima_actividad
FROM users u
JOIN JSON_TABLE(
  u.data, '$.history[*]'
  COLUMNS(
    total   INT    PATH '$.total',
    date_ms BIGINT PATH '$.date'
  )
) AS jt
WHERE u.email = 'correo@ejemplo.com'
GROUP BY u.email, u.is_pro;

-- ---------------------------------------------------------------------
-- D) Diagnóstico manual (fuera de SQL): busca en
--    api/patreon-webhook.log las líneas de esa fecha/email para ver
--    si el webhook llegó y si extrajo el email correctamente.
--    En Hostinger vía SSH/terminal de archivos:
--      grep -i "correo@ejemplo.com" api/patreon-webhook.log
--    Si aparece "NO_EMAIL" cerca de la fecha del pago, es un caso
--    legítimo de bug (Patreon no compartió el email), no fraude:
--    lo correcto es conceder Pro manualmente vía
--    api/admin/grant-pro.html, no reembolsar.
-- ---------------------------------------------------------------------

-- Cómo interpretar los resultados:
--  1. is_pro=0 y ningún pledge activo en (A), y NO_EMAIL en el log (D)
--     -> Reclamación legítima: el pago no se vinculó por un fallo del
--        webhook. Concede Pro manualmente y considera esto una excepción,
--        no un reembolso.
--  2. is_pro=1 (o lo fue) y hay logins tras el pago (B) y uso real (C)
--     con preguntas_respondidas > 0 usando cuota ilimitada / exportando
--     PDF -> Ha usado Pro. Rechazar o negociar el reembolso.
--  3. is_pro=0, sin pledge en absoluto (A) -> El pago de Patreon nunca
--     llegó a este sistema (webhook no disparado, o email de Patreon
--     distinto al de Google) -> pide el email exacto con el que paga en
--     Patreon y repite la consulta con ese email antes de decidir.
