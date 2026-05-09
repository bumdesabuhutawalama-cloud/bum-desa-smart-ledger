-- Create business_unit_types table
CREATE TABLE IF NOT EXISTS public.business_unit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text NOT NULL UNIQUE,
  nama text NOT NULL,
  deskripsi text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_unit_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business unit types read auth"
  ON public.business_unit_types FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Business unit types manage admin"
  ON public.business_unit_types FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_business_unit_types_updated_at
  BEFORE UPDATE ON public.business_unit_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default types (sesuai dengan yang ada di business_units)
INSERT INTO public.business_unit_types (kode, nama, deskripsi, sort_order)
VALUES
  ('umum',          'Umum / Konsolidasi',    'Unit default untuk transaksi umum & konsolidasi',  1),
  ('simpan_pinjam', 'Simpan Pinjam',        'Layanan pinjaman & simpanan masyarakat',            2),
  ('air_bersih',    'Air Bersih (PAM)',     'Pengelolaan air bersih desa',                        3),
  ('perdagangan',   'Perdagangan',          'Toko / kios / sembako',                              4),
  ('jasa',          'Jasa & Sewa',          'Jasa, sewa alat / gedung',                           5),
  ('pangan',        'Ketahanan Pangan',     'Unit ketahanan pangan / pertanian',                  6)
ON CONFLICT (kode) DO NOTHING;
