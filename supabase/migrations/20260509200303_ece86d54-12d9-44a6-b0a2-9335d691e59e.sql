ALTER TABLE public.user_business_units
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ubu_user ON public.user_business_units(user_id);
CREATE INDEX IF NOT EXISTS idx_ubu_unit ON public.user_business_units(business_unit_id);