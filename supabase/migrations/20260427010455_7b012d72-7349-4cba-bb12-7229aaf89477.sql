-- Add correction-related columns to journals
ALTER TABLE public.journals
  ADD COLUMN IF NOT EXISTS correction_type text,
  ADD COLUMN IF NOT EXISTS is_correction boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS correction_group_id uuid;

-- Validation: correction_type must be one of the allowed values when set
ALTER TABLE public.journals
  DROP CONSTRAINT IF EXISTS journals_correction_type_check;
ALTER TABLE public.journals
  ADD CONSTRAINT journals_correction_type_check
  CHECK (correction_type IS NULL OR correction_type IN ('reversal','reklasifikasi','nominal','periode'));

-- Helpful indexes for lookups & grouping
CREATE INDEX IF NOT EXISTS idx_journals_correction_group ON public.journals(correction_group_id);
CREATE INDEX IF NOT EXISTS idx_journals_is_correction ON public.journals(is_correction);
CREATE INDEX IF NOT EXISTS idx_journals_source_ref ON public.journals(source_ref);