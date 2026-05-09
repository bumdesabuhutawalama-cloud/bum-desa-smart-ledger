
-- Enable RLS pada tabel USP yang belum
ALTER TABLE public.usp_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usp_loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usp_members ENABLE ROW LEVEL SECURITY;

-- Helper drop & create per tabel via DO block
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'journals','accounts','assets','inventory_items','inventory_movements',
    'payables','receivables','purchase_orders','goods_receipts','sales_orders',
    'suppliers','activity_entries','usp_loans','usp_loan_installments','usp_members'
  ];
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop semua policy lama
    FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = ('public.'||t)::regclass LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
    END LOOP;

    -- SELECT policy: super_admin OR business_unit_id sesuai
    EXECUTE format($f$
      CREATE POLICY "unit_select" ON public.%I FOR SELECT TO authenticated
      USING (public.is_super_admin(auth.uid()) OR business_unit_id = public.get_user_business_unit(auth.uid()))
    $f$, t);

    -- ALL (insert/update/delete) policy: sama + harus user_can_edit
    EXECUTE format($f$
      CREATE POLICY "unit_manage" ON public.%I FOR ALL TO authenticated
      USING (public.user_can_edit(auth.uid()) AND (public.is_super_admin(auth.uid()) OR business_unit_id = public.get_user_business_unit(auth.uid())))
      WITH CHECK (public.user_can_edit(auth.uid()) AND (public.is_super_admin(auth.uid()) OR business_unit_id = public.get_user_business_unit(auth.uid())))
    $f$, t);
  END LOOP;
END $$;

-- journal_lines: filter via journal parent
DROP POLICY IF EXISTS "JL manage staff" ON public.journal_lines;
DROP POLICY IF EXISTS "JL read auth" ON public.journal_lines;
CREATE POLICY "jl_select" ON public.journal_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journals j WHERE j.id = journal_id
    AND (public.is_super_admin(auth.uid()) OR j.business_unit_id = public.get_user_business_unit(auth.uid()))));
CREATE POLICY "jl_manage" ON public.journal_lines FOR ALL TO authenticated
  USING (public.user_can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM public.journals j WHERE j.id = journal_id
    AND (public.is_super_admin(auth.uid()) OR j.business_unit_id = public.get_user_business_unit(auth.uid()))))
  WITH CHECK (public.user_can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM public.journals j WHERE j.id = journal_id
    AND (public.is_super_admin(auth.uid()) OR j.business_unit_id = public.get_user_business_unit(auth.uid()))));

-- purchase_order_items via PO parent
DROP POLICY IF EXISTS "POItems manage staff" ON public.purchase_order_items;
DROP POLICY IF EXISTS "POItems read auth" ON public.purchase_order_items;
CREATE POLICY "poi_select" ON public.purchase_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = po_id
    AND (public.is_super_admin(auth.uid()) OR p.business_unit_id = public.get_user_business_unit(auth.uid()))));
CREATE POLICY "poi_manage" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.user_can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = po_id
    AND (public.is_super_admin(auth.uid()) OR p.business_unit_id = public.get_user_business_unit(auth.uid()))))
  WITH CHECK (public.user_can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = po_id
    AND (public.is_super_admin(auth.uid()) OR p.business_unit_id = public.get_user_business_unit(auth.uid()))));

-- sales_order_items via SO parent
DROP POLICY IF EXISTS "SOItems manage staff" ON public.sales_order_items;
DROP POLICY IF EXISTS "SOItems read auth" ON public.sales_order_items;
CREATE POLICY "soi_select" ON public.sales_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales_orders s WHERE s.id = so_id
    AND (public.is_super_admin(auth.uid()) OR s.business_unit_id = public.get_user_business_unit(auth.uid()))));
CREATE POLICY "soi_manage" ON public.sales_order_items FOR ALL TO authenticated
  USING (public.user_can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM public.sales_orders s WHERE s.id = so_id
    AND (public.is_super_admin(auth.uid()) OR s.business_unit_id = public.get_user_business_unit(auth.uid()))))
  WITH CHECK (public.user_can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM public.sales_orders s WHERE s.id = so_id
    AND (public.is_super_admin(auth.uid()) OR s.business_unit_id = public.get_user_business_unit(auth.uid()))));

-- business_units & business_unit_types: read all authenticated, manage hanya super_admin
DROP POLICY IF EXISTS "Units manage admin" ON public.business_units;
DROP POLICY IF EXISTS "Units read auth" ON public.business_units;
CREATE POLICY "bu_read" ON public.business_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "bu_manage" ON public.business_units FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
