-- Seed Akun Pengguna Bawaan (Default Demo Accounts)
INSERT INTO tb_pengguna (username, password, role)
VALUES
  ('admin', '$2b$10$yDCulPd3OYV1oR2u/3bYmO7rjeWYhh.YoCULvM4iafd2TZGQ9RJ3e', 'Admin'),
  ('absensi', '$2b$10$hDmFVclmsdrtfxjjTQyzUOTA8E5yM2ArPDaRm.vfG2P43Sw12KawG', 'Petugas Absensi'),
  ('approver', '$2b$10$DpaT7A562hrYKcx.xZREweQtZw2niTl3GvyZxwS8FaLuAkgifMeAi', 'Approver'),
  ('gaji', '$2b$10$8DEW7zg/YYvF7IFqiD7D/OP09cEoy93eWrrper8BlOzAK95kGiQDi', 'Staf Gaji')
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = EXCLUDED.role, deleted_at = NULL;
