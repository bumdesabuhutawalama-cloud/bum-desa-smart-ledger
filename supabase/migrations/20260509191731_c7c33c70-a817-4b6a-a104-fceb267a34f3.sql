
-- Tabel mapping
CREATE TABLE IF NOT EXISTS public.user_business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_unit_id UUID REFERENCES public.business_units(id) ON DELETE SET NULL,
  role public.app_role NOT NULL DEFAULT 'staff_unit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_business_units ENABLE ROW LEVEL SECURITY;

-- Helper: cek super admin (tanpa rekursi - langsung query tabel)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_business_units
    WHERE user_id = _user_id AND role = 'super_admin'
  ) OR EXISTS (
    -- Backward compat: legacy admin role di user_roles tetap dianggap super_admin
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_business_unit(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT business_unit_id FROM public.user_business_units WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_unit(_user_id UUID, _unit_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.get_user_business_unit(_user_id) = _unit_id;
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_business_units WHERE user_id = _user_id AND role IN ('admin_unit','staff_unit'))
      OR public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'bendahara'::app_role);
$$;

-- Policies untuk user_business_units
DROP POLICY IF EXISTS "View own mapping" ON public.user_business_units;
CREATE POLICY "View own mapping" ON public.user_business_units FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin manage mapping" ON public.user_business_units;
CREATE POLICY "Super admin manage mapping" ON public.user_business_units FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_ubu_updated_at ON public.user_business_units;
CREATE TRIGGER trg_ubu_updated_at BEFORE UPDATE ON public.user_business_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: jadikan setiap user existing yang punya role admin sebagai super_admin Pusat
INSERT INTO public.user_business_units (user_id, business_unit_id, role)
SELECT DISTINCT ur.user_id,
  (SELECT id FROM public.business_units WHERE kode = 'PUSAT' LIMIT 1),
  'super_admin'::app_role
FROM public.user_roles ur
WHERE ur.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- User non-admin existing → assign ke Pusat sebagai staff_unit (sementara, bisa di-reassign)
INSERT INTO public.user_business_units (user_id, business_unit_id, role)
SELECT DISTINCT u.id,
  (SELECT id FROM public.business_units WHERE kode = 'PUSAT' LIMIT 1),
  'staff_unit'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_business_units WHERE user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- Update handle_new_user trigger agar auto-create mapping
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles(id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    -- User pertama = super admin Pusat
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
    INSERT INTO public.user_business_units(user_id, business_unit_id, role)
      VALUES (NEW.id, (SELECT id FROM public.business_units WHERE kode = 'PUSAT' LIMIT 1), 'super_admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'bendahara');
    -- Default: staff_unit di Pusat (super_admin akan re-assign)
    INSERT INTO public.user_business_units(user_id, business_unit_id, role)
      VALUES (NEW.id, (SELECT id FROM public.business_units WHERE kode = 'PUSAT' LIMIT 1), 'staff_unit');
  END IF;
  RETURN NEW;
END; $$;

-- Pasang trigger handle_new_user kalau belum ada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
