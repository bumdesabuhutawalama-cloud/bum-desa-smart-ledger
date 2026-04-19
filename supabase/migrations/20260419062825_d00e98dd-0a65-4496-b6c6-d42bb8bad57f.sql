-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'bendahara', 'auditor');
CREATE TYPE public.account_type AS ENUM ('ASET','KEWAJIBAN','EKUITAS','PENDAPATAN','BEBAN','HPP','PENDAPATAN_LAIN','BEBAN_LAIN');
CREATE TYPE public.normal_balance AS ENUM ('DEBIT','KREDIT');
CREATE TYPE public.journal_status AS ENUM ('draft','posted');
CREATE TYPE public.receivable_status AS ENUM ('lancar','kurang_lancar','diragukan','macet');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF public.app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- TIMESTAMP TRIGGER FN
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUTO PROFILE + FIRST USER = ADMIN
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles(id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'bendahara');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CHART OF ACCOUNTS
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_akun TEXT NOT NULL UNIQUE,
  nama_akun TEXT NOT NULL,
  tipe_akun public.account_type NOT NULL,
  normal_balance public.normal_balance NOT NULL,
  is_header BOOLEAN NOT NULL DEFAULT false,
  level INT NOT NULL DEFAULT 4,
  parent_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_accounts_kode ON public.accounts(kode_akun);
CREATE INDEX idx_accounts_tipe ON public.accounts(tipe_akun);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accounts read auth" ON public.accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Accounts manage staff" ON public.accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- JOURNALS
CREATE TABLE public.journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_jurnal TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL,
  keterangan TEXT NOT NULL,
  status public.journal_status NOT NULL DEFAULT 'posted',
  source TEXT NOT NULL DEFAULT 'manual',
  source_ref UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_journals_tanggal ON public.journals(tanggal);
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Journals read auth" ON public.journals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Journals manage staff" ON public.journals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_journals_updated BEFORE UPDATE ON public.journals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  kredit NUMERIC(18,2) NOT NULL DEFAULT 0,
  keterangan TEXT,
  line_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (debit >= 0 AND kredit >= 0),
  CHECK (NOT (debit > 0 AND kredit > 0))
);
CREATE INDEX idx_jl_journal ON public.journal_lines(journal_id);
CREATE INDEX idx_jl_account ON public.journal_lines(account_id);
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "JL read auth" ON public.journal_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "JL manage staff" ON public.journal_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'));

-- ASSETS
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  kategori TEXT,
  harga_perolehan NUMERIC(18,2) NOT NULL,
  tanggal_perolehan DATE NOT NULL,
  masa_manfaat_bulan INT NOT NULL,
  nilai_residu NUMERIC(18,2) NOT NULL DEFAULT 0,
  akumulasi_penyusutan NUMERIC(18,2) NOT NULL DEFAULT 0,
  asset_account_id UUID REFERENCES public.accounts(id),
  accum_depr_account_id UUID REFERENCES public.accounts(id),
  depr_expense_account_id UUID REFERENCES public.accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assets read auth" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Assets manage staff" ON public.assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RECEIVABLES
CREATE TABLE public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_debitur TEXT NOT NULL,
  tanggal DATE NOT NULL,
  jumlah NUMERIC(18,2) NOT NULL,
  jatuh_tempo DATE,
  status public.receivable_status NOT NULL DEFAULT 'lancar',
  penyisihan NUMERIC(18,2) NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recv read" ON public.receivables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recv manage" ON public.receivables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_recv_updated BEFORE UPDATE ON public.receivables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PAYABLES
CREATE TABLE public.payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kreditur TEXT NOT NULL,
  tanggal DATE NOT NULL,
  jumlah NUMERIC(18,2) NOT NULL,
  jatuh_tempo DATE,
  klasifikasi TEXT NOT NULL DEFAULT 'jangka_pendek',
  keterangan TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pay read" ON public.payables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pay manage" ON public.payables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_pay_updated BEFORE UPDATE ON public.payables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INVENTORY
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  satuan TEXT,
  stok NUMERIC(18,2) NOT NULL DEFAULT 0,
  harga_perolehan NUMERIC(18,2) NOT NULL DEFAULT 0,
  harga_jual NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inv read" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inv manage" ON public.inventory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  tipe TEXT NOT NULL,
  qty NUMERIC(18,2) NOT NULL,
  harga NUMERIC(18,2) NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "InvMov read" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "InvMov manage" ON public.inventory_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'bendahara'));

-- SEQUENCE
CREATE SEQUENCE IF NOT EXISTS public.journal_seq START 1;