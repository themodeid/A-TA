-- Write your UP migration here
CREATE TABLE IF NOT EXISTS kontak (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    umur INTEGER,
    hobi VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);