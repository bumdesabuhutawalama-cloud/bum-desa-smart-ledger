-- Menambahkan akun untuk modal unit internal dan investasi unit pusat

-- Hapus akun yang mungkin sudah ada dengan kode yang akan digunakan
DELETE FROM accounts WHERE kode_akun IN ('3.2.01.01', '3.2.01.02', '3.2.01.03', '3.2.01.04');
DELETE FROM accounts WHERE kode_akun IN ('1.2.01.01', '1.2.01.02', '1.2.01.03', '1.2.01.04');

-- Akun modal unit internal (untuk setiap unit non-pusat)
INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, business_unit_id, description)
SELECT
  '3.2.01.' || RIGHT('00' || ROW_NUMBER() OVER (ORDER BY bu.id)::TEXT, 2),
  'Modal Unit ' || bu.nama,
  'EKUITAS',
  'KREDIT',
  false,
  4,
  (SELECT id FROM accounts WHERE kode_akun = '3.2.01.00'),
  true,
  true,
  false,
  bu.id,
  'Modal internal unit ' || bu.nama || ' dari Unit Pusat'
FROM business_units bu
WHERE bu.kode != 'PUSAT' AND bu.is_active = true
ORDER BY bu.id;

-- Akun investasi unit pusat (untuk unit pusat)
INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, business_unit_id, description)
SELECT
  '1.2.01.' || RIGHT('00' || ROW_NUMBER() OVER (ORDER BY bu.id)::TEXT, 2),
  'Investasi ke ' || bu.nama,
  'ASET',
  'DEBIT',
  false,
  4,
  (SELECT id FROM accounts WHERE kode_akun = '1.2.01.00'),
  true,
  true,
  false,
  (SELECT id FROM business_units WHERE kode = 'PUSAT'),
  'Investasi Unit Pusat ke ' || bu.nama
FROM business_units bu
WHERE bu.kode != 'PUSAT' AND bu.is_active = true
ORDER BY bu.id;