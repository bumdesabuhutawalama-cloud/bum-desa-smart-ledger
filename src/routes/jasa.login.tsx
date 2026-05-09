import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Briefcase, AlertCircle } from "lucide-react";
import { useUnit } from "@/lib/unit-context";

export const Route = createFileRoute("/jasa/login")({
  component: JasaLogin,
});

function JasaLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const { setCurrentUnitKode } = useUnit();
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
            await signIn(email, password);
      // Verifikasi akses unit
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data: ubu } = await (supabase as any)
          .from("user_business_units")
          .select("role, business_units(kode, is_head_office)")
          .eq("user_id", u.id)
          .maybeSingle();
        const isSuper = ubu?.role === "super_admin" || ubu?.business_units?.is_head_office === true;
        const userKode = ubu?.business_units?.kode;
        if (!isSuper && userKode && userKode !== "JASA") {
          await supabase.auth.signOut();
          throw new Error(`Akun Anda terdaftar di unit ${userKode}, bukan JASA. Silakan login lewat halaman unit Anda.`);
        }
        if (!isSuper && !userKode) {
          await supabase.auth.signOut();
          throw new Error("Akun Anda belum terhubung ke unit usaha. Hubungi admin Pusat.");
        }
      }
      nav({ to: "/jasa/dashboard" });
    } catch (err: any) {
      setError(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Unit Jasa</CardTitle>
          <CardDescription>
            Masuk ke sistem Unit Jasa BUM Desa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@bumdesa.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Masuk..." : "Masuk ke Unit Jasa"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Sistem Keuangan BUM Desa — Unit Jasa & Sewa
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}