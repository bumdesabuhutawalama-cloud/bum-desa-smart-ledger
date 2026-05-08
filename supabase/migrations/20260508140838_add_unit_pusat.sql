-- Menambahkan Unit Pusat untuk menerima penyertaan dan mendistribusikan modal

-- Insert unit pusat
INSERT INTO public.business_units (kode, nama, jenis, deskripsi, is_active, is_default)
VALUES
  ('PUSAT', 'Unit Pusat', 'pusat', 'Unit pusat untuk menerima penyertaan modal dan mendistribusikan ke unit-unit usaha', true, false)
ON CONFLICT (kode) DO NOTHING;

-- Tambahkan akun penyertaan modal di ekuitas jika belum ada
INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, description, is_active)
VALUES
  ('3.1.04.01', 'Modal Penyertaan', 'EKUITAS', 'KREDIT', false, 4, 'Akun untuk mencatat penyertaan modal dari luar ke unit pusat', true)
ON CONFLICT (kode_akun) DO NOTHING;

-- Tambahkan akun RK Pusat khusus untuk unit pusat jika belum ada
INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, description, is_active, business_unit_id)
SELECT
  '3.8.01.03',
  'RK Pusat - Unit Pusat',
  'EKUITAS',
  'KREDIT',
  false,
  4,
  'Rekening Koresponden Pusat untuk Unit Pusat',
  true,
  bu.id
FROM public.business_units bu
WHERE bu.kode = 'PUSAT'
ON CONFLICT (kode_akun) DO NOTHING;