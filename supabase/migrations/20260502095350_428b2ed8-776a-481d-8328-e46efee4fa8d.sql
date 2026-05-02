CREATE TABLE public.business_unit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  deskripsi text,
  icon text NOT NULL DEFAULT 'Briefcase',
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_unit_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BUT read auth" ON public.business_unit_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "BUT manage admin" ON public.business_unit_types
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_but_updated_at
  BEFORE UPDATE ON public.business_unit_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.business_unit_types (kode, nama, deskripsi, icon, is_system, sort_order) VALUES
  ('umum', 'Umum / Konsolidasi', 'Untuk transaksi konsolidasi BUM Desa', 'Building2', true, 0),
  ('simpan_pinjam', 'Simpan Pinjam', 'Unit usaha simpan pinjam / lembaga keuangan mikro', 'PiggyBank', true, 10),
  ('perdagangan', 'Perdagangan', 'Toko, sembako, perdagangan retail', 'ShoppingCart', true, 20),
  ('jasa', 'Jasa & Sewa', 'Penyewaan, jasa, layanan', 'Briefcase', true, 30),
  ('air_bersih', 'Air Bersih (PAM)', 'Pengelolaan air bersih / PAMDes', 'Droplets', true, 40),
  ('aset_modal', 'Aset & Modal', 'Pengelolaan aset tetap dan modal', 'Landmark', true, 50);