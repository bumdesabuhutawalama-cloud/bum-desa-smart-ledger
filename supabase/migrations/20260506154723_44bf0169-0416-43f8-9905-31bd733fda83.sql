-- 1. Tambah kolom ke inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS kategori_barang text,
  ADD COLUMN IF NOT EXISTS tipe_barang text NOT NULL DEFAULT 'dagangan',
  ADD COLUMN IF NOT EXISTS unit_usaha_id uuid REFERENCES public.business_units(id),
  ADD COLUMN IF NOT EXISTS harga_beli_default numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS harga_jual_default numeric NOT NULL DEFAULT 0;

-- 2. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_supplier text NOT NULL,
  alamat text,
  telepon text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  business_unit_id uuid REFERENCES public.business_units(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers read auth" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Suppliers manage staff" ON public.suppliers FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_po text NOT NULL UNIQUE,
  tanggal date NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  business_unit_id uuid NOT NULL REFERENCES public.business_units(id),
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft | dikirim | selesai | batal
  catatan text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PO read auth" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "PO manage staff" ON public.purchase_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  qty numeric NOT NULL,
  harga numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "POItems read auth" ON public.purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "POItems manage staff" ON public.purchase_order_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'));

-- 4. Goods Receipts (BAST)
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_bast text NOT NULL UNIQUE,
  tanggal date NOT NULL,
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id),
  metode_bayar text NOT NULL, -- 'tunai' | 'kredit'
  kas_account_id uuid REFERENCES public.accounts(id),
  total numeric NOT NULL DEFAULT 0,
  journal_id uuid,
  business_unit_id uuid NOT NULL REFERENCES public.business_units(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "GR read auth" ON public.goods_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "GR manage staff" ON public.goods_receipts FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_gr_updated BEFORE UPDATE ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Sales Orders
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_so text NOT NULL UNIQUE,
  tanggal date NOT NULL,
  pelanggan text,
  metode_bayar text NOT NULL DEFAULT 'tunai', -- 'tunai' | 'piutang'
  kas_account_id uuid REFERENCES public.accounts(id),
  total numeric NOT NULL DEFAULT 0,
  total_hpp numeric NOT NULL DEFAULT 0,
  journal_id uuid,
  business_unit_id uuid NOT NULL REFERENCES public.business_units(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SO read auth" ON public.sales_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "SO manage staff" ON public.sales_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'));
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  so_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  qty numeric NOT NULL,
  harga_jual numeric NOT NULL,
  hpp_per_unit numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SOItems read auth" ON public.sales_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "SOItems manage staff" ON public.sales_order_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'bendahara'));

-- 6. Auto-create akun standar perdagangan (idempotent)
DO $$
DECLARE v_parent uuid;
BEGIN
  -- Persediaan Barang Dagang (1.1.04.01) — pastikan parent 1.1.04 ada
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE kode_akun='1.1.04') THEN
    SELECT id INTO v_parent FROM public.accounts WHERE kode_akun='1.1.00.00' LIMIT 1;
    INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id)
    VALUES('1.1.04','Persediaan','ASET','DEBIT',true,3,v_parent);
  END IF;
  SELECT id INTO v_parent FROM public.accounts WHERE kode_akun='1.1.04' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE kode_akun='1.1.04.01') THEN
    INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id,is_system_account,is_manual_input)
    VALUES('1.1.04.01','Persediaan Barang Dagang','ASET','DEBIT',false,4,v_parent,true,false);
  END IF;

  -- Hutang Usaha Supplier (2.1.01.02) — pastikan parent ada
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE kode_akun='2.1.01') THEN
    SELECT id INTO v_parent FROM public.accounts WHERE kode_akun='2.1.00.00' LIMIT 1;
    IF v_parent IS NULL THEN
      INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id)
      VALUES('2.1.00.00','Kewajiban Jangka Pendek','KEWAJIBAN','KREDIT',true,2,NULL) RETURNING id INTO v_parent;
    END IF;
    INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id)
    VALUES('2.1.01','Hutang Usaha','KEWAJIBAN','KREDIT',true,3,v_parent);
  END IF;
  SELECT id INTO v_parent FROM public.accounts WHERE kode_akun='2.1.01' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE kode_akun='2.1.01.02') THEN
    INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id,is_system_account,is_manual_input)
    VALUES('2.1.01.02','Hutang Usaha — Supplier','KEWAJIBAN','KREDIT',false,4,v_parent,true,false);
  END IF;

  -- Pendapatan Penjualan Barang Dagang (4.1.01.01)
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE kode_akun='4.1.01') THEN
    SELECT id INTO v_parent FROM public.accounts WHERE kode_akun='4.1.00.00' LIMIT 1;
    IF v_parent IS NULL THEN
      INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id)
      VALUES('4.1.00.00','Pendapatan Usaha','PENDAPATAN','KREDIT',true,2,NULL) RETURNING id INTO v_parent;
    END IF;
    INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id)
    VALUES('4.1.01','Pendapatan Penjualan','PENDAPATAN','KREDIT',true,3,v_parent);
  END IF;
  SELECT id INTO v_parent FROM public.accounts WHERE kode_akun='4.1.01' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE kode_akun='4.1.01.01') THEN
    INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id,is_system_account,is_manual_input)
    VALUES('4.1.01.01','Pendapatan Penjualan Barang Dagang','PENDAPATAN','KREDIT',false,4,v_parent,true,false);
  END IF;

  -- HPP (5.1.01.01)
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE kode_akun='5.1.01') THEN
    SELECT id INTO v_parent FROM public.accounts WHERE kode_akun='5.1.00.00' LIMIT 1;
    IF v_parent IS NULL THEN
      INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id)
      VALUES('5.1.00.00','Beban Pokok Penjualan','BEBAN','DEBIT',true,2,NULL) RETURNING id INTO v_parent;
    END IF;
    INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id)
    VALUES('5.1.01','Harga Pokok Penjualan','BEBAN','DEBIT',true,3,v_parent);
  END IF;
  SELECT id INTO v_parent FROM public.accounts WHERE kode_akun='5.1.01' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE kode_akun='5.1.01.01') THEN
    INSERT INTO public.accounts(kode_akun,nama_akun,tipe_akun,normal_balance,is_header,level,parent_id,is_system_account,is_manual_input)
    VALUES('5.1.01.01','Harga Pokok Penjualan (HPP)','BEBAN','DEBIT',false,4,v_parent,true,false);
  END IF;
END $$;