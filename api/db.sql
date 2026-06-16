CREATE TABLE pro_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  max_uses INT NOT NULL DEFAULT 3,
  uses INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ejemplo: insertar un código para un mecenas de Patreon
INSERT INTO pro_codes (code, max_uses, note) VALUES ('EYC-XXXX-XXXX', 3, 'Patreon supporter batch 1');

-- ===== Cuentas con Google + sincronización de progreso =====

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_sub VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NULL,
  avatar_url VARCHAR(500) NULL,
  is_pro TINYINT(1) NOT NULL DEFAULT 0,
  pro_code VARCHAR(32) NULL,
  data MEDIUMTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  token CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE pro_codes ADD COLUMN email VARCHAR(255) NULL;

-- ===== Suscripciones de Patreon =====

ALTER TABLE users ADD COLUMN patreon_member_id VARCHAR(64) NULL;

-- Estado de mecenas de Patreon, indexado por email, para vincular
-- automáticamente cuando el usuario inicie sesión con Google usando
-- el mismo correo (independientemente de qué ocurra primero).
CREATE TABLE patreon_pledges (
  member_id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_patreon_pledges_email ON patreon_pledges (email);

-- ===== Estadísticas comunitarias por pregunta =====
CREATE TABLE question_stats (
  exam VARCHAR(32) NOT NULL,
  question_id INT NOT NULL,
  correct INT UNSIGNED NOT NULL DEFAULT 0,
  total INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (exam, question_id)
);

-- ===== Discusiones por pregunta =====
CREATE TABLE question_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam VARCHAR(32) NOT NULL,
  question_id INT NOT NULL,
  user_id INT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_q (exam, question_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE question_comment_likes (
  comment_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (comment_id, user_id),
  FOREIGN KEY (comment_id) REFERENCES question_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===== Reseñas de usuarios =====
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  body TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY one_per_user (user_id)
);
