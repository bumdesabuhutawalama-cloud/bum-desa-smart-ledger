
-- =========================================================
-- 1) Tabel business_units
-- =========================================================
CREATE TABLE IF NOT EXISTS public.business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text NOT NULL UNIQUE,
  nama text NOT NULL,
  jenis text NOT NULL DEFAULT 'umum',
  deskripsi text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Units read auth"
  ON public.business_units FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Units manage admin"
  ON public.business_units FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_business_units_updated_at
  BEFORE UPDATE ON public.business_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pastikan hanya 1 default
CREATE UNIQUE INDEX IF NOT EXISTS uniq_business_units_default
  ON public.business_units ((is_default)) WHERE is_default = true;

-- Seed default + beberapa unit umum BUMDes
INSERT INTO public.business_units (kode, nama, jenis, deskripsi, is_default)
VALUES
  ('UMUM',  'Unit Umum / Konsolidasi', 'umum',          'Unit default untuk transaksi umum & konsolidasi', true),
  ('SP',    'Unit Simpan Pinjam',      'simpan_pinjam', 'Layanan pinjaman & simpanan masyarakat',          false),
  ('PAM',   'Unit Air Bersih (PAM)',   'air_bersih',    'Pengelolaan air bersih desa',                      false),
  ('DAGANG','Unit Perdagangan',        'perdagangan',   'Toko / kios / sembako',                            false),
  ('JASA',  'Unit Jasa & Sewa',        'jasa',          'Jasa, sewa alat / gedung',                         false)
ON CONFLICT (kode) DO NOTHING;

-- =========================================================
-- 2) Tambah kolom business_unit_id (nullable dulu)
-- =========================================================
ALTER TABLE public.journals             ADD COLUMN IF NOT EXISTS business_unit_id uuid;
ALTER TABLE public.activity_entries     ADD COLUMN IF NOT EXISTS business_unit_id uuid;
ALTER TABLE public.receivables          ADD COLUMN IF NOT EXISTS business_unit_id uuid;
ALTER TABLE public.payables             ADD COLUMN IF NOT EXISTS business_unit_id uuid;
ALTER TABLE public.assets               ADD COLUMN IF NOT EXISTS business_unit_id uuid;
ALTER TABLE public.inventory_items      ADD COLUMN IF NOT EXISTS business_unit_id uuid;
ALTER TABLE public.inventory_movements  ADD COLUMN IF NOT EXISTS business_unit_id uuid;

-- =========================================================
-- 3) Backfill ke unit default
-- =========================================================
DO $$
DECLARE def_id uuid;
BEGIN
  SELECT id INTO def_id FROM public.business_units WHERE is_default = true LIMIT 1;
  IF def_id IS NULL THEN
    RAISE EXCEPTION 'Default business unit tidak ditemukan';
  END IF;

  UPDATE public.journals            SET business_unit_id = def_id WHERE business_unit_id IS NULL;
  UPDATE public.activity_entries    SET business_unit_id = def_id WHERE business_unit_id IS NULL;
  UPDATE public.receivables         SET business_unit_id = def_id WHERE business_unit_id IS NULL;
  UPDATE public.payables            SET business_unit_id = def_id WHERE business_unit_id IS NULL;
  UPDATE public.assets              SET business_unit_id = def_id WHERE business_unit_id IS NULL;
  UPDATE public.inventory_items     SET business_unit_id = def_id WHERE business_unit_id IS NULL;
  UPDATE public.inventory_movements SET business_unit_id = def_id WHERE business_unit_id IS NULL;

  -- Set NOT NULL + default agar insert baru tanpa unit tetap aman
  EXECUTE format('ALTER TABLE public.journals            ALTER COLUMN business_unit_id SET DEFAULT %L', def_id);
  EXECUTE format('ALTER TABLE public.activity_entries    ALTER COLUMN business_unit_id SET DEFAULT %L', def_id);
  EXECUTE format('ALTER TABLE public.receivables         ALTER COLUMN business_unit_id SET DEFAULT %L', def_id);
  EXECUTE format('ALTER TABLE public.payables            ALTER COLUMN business_unit_id SET DEFAULT %L', def_id);
  EXECUTE format('ALTER TABLE public.assets              ALTER COLUMN business_unit_id SET DEFAULT %L', def_id);
  EXECUTE format('ALTER TABLE public.inventory_items     ALTER COLUMN business_unit_id SET DEFAULT %L', def_id);
  EXECUTE format('ALTER TABLE public.inventory_movements ALTER COLUMN business_unit_id SET DEFAULT %L', def_id);
END $$;

ALTER TABLE public.journals            ALTER COLUMN business_unit_id SET NOT NULL;
ALTER TABLE public.activity_entries    ALTER COLUMN business_unit_id SET NOT NULL;
ALTER TABLE public.receivables         ALTER COLUMN business_unit_id SET NOT NULL;
ALTER TABLE public.payables            ALTER COLUMN business_unit_id SET NOT NULL;
ALTER TABLE public.assets              ALTER COLUMN business_unit_id SET NOT NULL;
ALTER TABLE public.inventory_items     ALTER COLUMN business_unit_id SET NOT NULL;
ALTER TABLE public.inventory_movements ALTER COLUMN business_unit_id SET NOT NULL;

-- =========================================================
-- 4) Index performa
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_journals_unit_tanggal     ON public.journals(business_unit_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal     ON public.journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_receivables_unit          ON public.receivables(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_payables_unit             ON public.payables(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_assets_unit               ON public.assets(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_unit      ON public.inventory_items(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_unit  ON public.inventory_movements(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_activity_entries_unit     ON public.activity_entries(business_unit_id);

-- =========================================================
-- 5) applicable_units pada template kegiatan
-- =========================================================
ALTER TABLE public.activity_templates
  ADD COLUMN IF NOT EXISTS applicable_units text[] DEFAULT NULL;
COMMENT ON COLUMN public.activity_templates.applicable_units IS
  'Daftar jenis unit usaha yang boleh memakai template ini. NULL = berlaku untuk semua jenis unit.';
