-- Tambah kolom journal_id & metode
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS journal_id uuid REFERENCES public.journals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metode text NOT NULL DEFAULT 'garis_lurus';

-- Unique: 1 jurnal -> 1 aset (boleh NULL untuk aset legacy)
CREATE UNIQUE INDEX IF NOT EXISTS assets_journal_id_unique
  ON public.assets(journal_id) WHERE journal_id IS NOT NULL;

-- Trigger: cegah ubah harga_perolehan setelah tersimpan
CREATE OR REPLACE FUNCTION public.assets_lock_cost()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.harga_perolehan <> OLD.harga_perolehan THEN
    RAISE EXCEPTION 'Harga perolehan tidak boleh diubah setelah aset tersimpan';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assets_lock_cost ON public.assets;
CREATE TRIGGER trg_assets_lock_cost
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assets_lock_cost();