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
