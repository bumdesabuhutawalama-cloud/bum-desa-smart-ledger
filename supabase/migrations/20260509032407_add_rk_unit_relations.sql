-- Add RK relationship columns to accounts for inter-unit lookup
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS is_inter_unit_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_pair_id uuid REFERENCES public.business_units(id);

-- Backfill existing RK accounts based on known patterns
UPDATE public.accounts
SET is_inter_unit_account = true
WHERE kode_akun LIKE '1.1.99.%' OR kode_akun LIKE '3.8.01.%';

-- For legacy RK accounts, infer unit_pair_id from known business unit names if possible.
-- This is best-effort only and will not break if names differ.
UPDATE public.accounts a
SET unit_pair_id = bu.id
FROM public.business_units bu
WHERE a.is_inter_unit_account = true
  AND a.unit_pair_id IS NULL
  AND lower(a.nama_akun) LIKE '%' || lower(bu.nama) || '%';