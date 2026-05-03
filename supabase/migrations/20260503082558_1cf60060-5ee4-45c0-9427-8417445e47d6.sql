
-- 1) Tag system accounts (RK)
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS is_system_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_manual_input boolean NOT NULL DEFAULT true;

-- Mark all RK accounts as system / non-manual
UPDATE public.accounts
SET is_system_account = true, is_manual_input = false
WHERE (kode_akun LIKE '1.1.99.%' OR kode_akun LIKE '3.1.03.%');

-- 2) Auto-create RK Unit account for each non-default business unit
DO $$
DECLARE
  u RECORD;
  next_seq int;
  new_kode text;
  parent_id_val uuid;
BEGIN
  SELECT id INTO parent_id_val FROM public.accounts WHERE kode_akun = '1.1.99.00';
  IF parent_id_val IS NULL THEN RETURN; END IF;

  FOR u IN
    SELECT bu.id, bu.kode, bu.nama
    FROM public.business_units bu
    WHERE bu.is_default = false
      AND NOT EXISTS (
        SELECT 1 FROM public.accounts a
        WHERE a.kode_akun LIKE '1.1.99.%'
          AND a.is_header = false
          AND a.nama_akun ILIKE '%' || bu.nama || '%'
      )
  LOOP
    SELECT COALESCE(MAX(CAST(split_part(kode_akun,'.',4) AS int)), 0) + 1
      INTO next_seq
    FROM public.accounts
    WHERE kode_akun LIKE '1.1.99.%' AND is_header = false;

    new_kode := '1.1.99.' || lpad(next_seq::text, 2, '0');

    INSERT INTO public.accounts (kode_akun, nama_akun, tipe_akun, normal_balance, is_header, level, parent_id, is_active, is_system_account, is_manual_input, description)
    VALUES (new_kode, 'RK ' || u.nama, 'ASET', 'DEBIT', false, 4, parent_id_val, true, true, false,
            'Akun RK otomatis untuk transfer antar unit (' || u.kode || ')');
  END LOOP;
END $$;

-- 3) Journal flags for transfer
ALTER TABLE public.journals
  ADD COLUMN IF NOT EXISTS is_transfer_transaction boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_unit_id uuid,
  ADD COLUMN IF NOT EXISTS target_unit_id uuid,
  ADD COLUMN IF NOT EXISTS transfer_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_journals_transfer_group ON public.journals(transfer_group_id);
