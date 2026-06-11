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
