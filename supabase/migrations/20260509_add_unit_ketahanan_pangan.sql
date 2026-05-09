-- Tambah Unit Ketahanan Pangan ke business_units
INSERT INTO public.business_units (kode, nama, jenis, deskripsi, is_active)
VALUES ('PANGAN', 'Unit Ketahanan Pangan', 'ketahanan_pangan', 'Usaha pengelolaan pangan & pertanian', true)
ON CONFLICT (kode) DO NOTHING;
