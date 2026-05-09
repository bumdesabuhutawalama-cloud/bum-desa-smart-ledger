-- Perbaikan akun RK untuk transfer antar unit
-- RK Unit sekarang di KEWAJIBAN (hutang ke pusat), bukan di EKUITAS

-- Hapus akun RK Unit yang salah (di ekuitas)
DELETE FROM accounts WHERE kode_akun LIKE '1.1.99.%';

-- Hapus semua akun RK yang sudah ada di kewajiban
DELETE FROM accounts WHERE kode_akun LIKE '2.1.02.%';

-- Buat ulang header untuk RK Unit jika belum ada
INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, description, is_active)
VALUES
  ('2.1.02.00', 'Rekening Koresponden Unit', 'KEWAJIBAN', 'KREDIT', true, 3, 'Header untuk rekening koresponden unit ke pusat', true)
ON CONFLICT (kode_akun) DO NOTHING;

-- Buat akun RK Unit di KEWAJIBAN untuk setiap unit
INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, business_unit_id, description)
SELECT
  '2.1.02.' || RIGHT('00' || ROW_NUMBER() OVER (ORDER BY bu.id)::TEXT, 2),
  'RK Unit - ' || bu.nama,
  'KEWAJIBAN',
  'KREDIT',
  false,
  4,
  (SELECT id FROM accounts WHERE kode_akun = '2.1.02.00'),
  true,
  true,
  false,
  bu.id,
  'Rekening Koresponden untuk hutang unit ' || bu.nama || ' ke Unit Pusat'
FROM business_units bu
WHERE bu.kode != 'PUSAT' AND bu.is_active = true
ORDER BY bu.id;

-- Update akun RK Pusat untuk Unit Pusat (di EKUITAS)
UPDATE accounts
SET business_unit_id = (SELECT id FROM business_units WHERE kode = 'PUSAT')
WHERE kode_akun = '3.8.01.03';