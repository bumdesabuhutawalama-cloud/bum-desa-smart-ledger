import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) nav({ to: "/dashboard" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Akun dibuat. Silakan masuk.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Selamat datang!");
        nav({ to: "/dashboard" });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Terjadi kesalahan");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center"><Building2 className="h-5 w-5" /></div>
          <div className="font-semibold">SI Laporan Keuangan BUM Desa</div>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Akuntansi profesional<br/>untuk Desa.</h1>
          <p className="mt-4 text-sidebar-foreground/80 max-w-md">Berbasis Kepmendesa 136/2022 — double-entry, jurnal cerdas, laporan keuangan otomatis.</p>
        </div>
        <div className="text-xs text-sidebar-foreground/60">© BUM Desa Accounting</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <h2 className="text-2xl font-bold">{mode === "login" ? "Masuk" : "Daftar"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Akses sistem akuntansi BUM Desa." : "User pertama otomatis menjadi Admin."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div><Label htmlFor="fn">Nama Lengkap</Label><Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
            )}
            <div><Label htmlFor="em">Email</Label><Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}</Button>
          </form>
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </Card>
      </div>
    </div>
  );
}
