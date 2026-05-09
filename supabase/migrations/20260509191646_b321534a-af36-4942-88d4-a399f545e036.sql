
-- 1. Tambah is_head_office
ALTER TABLE public.business_units ADD COLUMN IF NOT EXISTS is_head_office BOOLEAN NOT NULL DEFAULT false;
UPDATE public.business_units SET is_head_office = true WHERE kode = 'PUSAT';

-- 2. Tambah role baru
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_unit';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff_unit';
