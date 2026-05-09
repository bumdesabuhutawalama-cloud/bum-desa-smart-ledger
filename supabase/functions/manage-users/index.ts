// Edge function untuk Super Admin: kelola user unit (list/create/update/delete/suspend)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    // Verifikasi caller adalah super admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: isSuperRow } = await admin.rpc("is_super_admin", { _user_id: callerId });
    if (!isSuperRow) return json({ error: "Forbidden: Super Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data: ubu, error: e1 } = await admin
        .from("user_business_units")
        .select("id, user_id, business_unit_id, role, is_suspended, created_at, business_units(kode, nama)")
        .order("created_at", { ascending: false });
      if (e1) throw e1;
      const ids = (ubu ?? []).map((r: any) => r.user_id);
      const profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await admin.from("profiles").select("id, full_name").in("id", ids);
        for (const p of profs ?? []) profilesMap[p.id] = { full_name: p.full_name, email: null };
        // Fetch emails via admin
        const { data: pageData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        for (const u of pageData?.users ?? []) {
          if (profilesMap[u.id]) profilesMap[u.id].email = u.email ?? null;
          else profilesMap[u.id] = { full_name: null, email: u.email ?? null };
        }
      }
      const rows = (ubu ?? []).map((r: any) => ({
        ...r,
        email: profilesMap[r.user_id]?.email ?? null,
        full_name: profilesMap[r.user_id]?.full_name ?? null,
      }));
      return json({ users: rows });
    }

    if (action === "create") {
      const { email, password, full_name, business_unit_id, role } = body;
      if (!email || !password || !business_unit_id || !role) {
        return json({ error: "email, password, business_unit_id, role wajib diisi" }, 400);
      }
      const { data: created, error: e1 } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (e1) throw e1;
      const newId = created.user!.id;
      // Update / replace mapping (trigger handle_new_user sudah membuat default mapping ke PUSAT)
      await admin.from("user_business_units").delete().eq("user_id", newId);
      const { error: e2 } = await admin
        .from("user_business_units")
        .insert({ user_id: newId, business_unit_id, role, is_suspended: false });
      if (e2) throw e2;
      if (full_name) await admin.from("profiles").update({ full_name }).eq("id", newId);
      return json({ ok: true, user_id: newId });
    }

    if (action === "update") {
      const { user_id, email, password, full_name, business_unit_id, role, is_suspended } = body;
      if (!user_id) return json({ error: "user_id wajib" }, 400);
      const attrs: any = {};
      if (email) attrs.email = email;
      if (password) attrs.password = password;
      if (Object.keys(attrs).length) {
        const { error: e1 } = await admin.auth.admin.updateUserById(user_id, attrs);
        if (e1) throw e1;
      }
      if (full_name !== undefined) {
        await admin.from("profiles").update({ full_name }).eq("id", user_id);
      }
      const ubuPatch: any = {};
      if (business_unit_id !== undefined) ubuPatch.business_unit_id = business_unit_id;
      if (role !== undefined) ubuPatch.role = role;
      if (is_suspended !== undefined) ubuPatch.is_suspended = is_suspended;
      if (Object.keys(ubuPatch).length) {
        const { error: e2 } = await admin
          .from("user_business_units")
          .update(ubuPatch)
          .eq("user_id", user_id);
        if (e2) throw e2;
      }
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id wajib" }, 400);
      if (user_id === callerId) return json({ error: "Tidak bisa menghapus akun sendiri" }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("manage-users error", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
