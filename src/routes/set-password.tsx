import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/set-password")({
  head: () => ({ meta: [{ title: "Buat Password — BUM Desa" }] }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase places tokens in URL hash for invite/recovery links.
    // Calling getSession() lets the client pick them up.
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setHasSession(!!s);
    });
    init();
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Password minimal 8 karakter.");
    if (pw !== pw2) return setError("Konfirmasi password tidak cocok.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setDone(true);
      setTimeout(() => nav({ to: "/" }), 1500);
    } catch (err: any) {
      setError(err?.message ?? "Gagal menyimpan password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-emerald-700" />
          </div>
          <CardTitle className="text-2xl">Buat Password Anda</CardTitle>
          <CardDescription>
            Selesaikan undangan dengan menyetel password untuk akun Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="text-center text-sm text-muted-foreground">Memuat…</div>
          ) : !hasSession ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tautan undangan tidak valid atau sudah kedaluwarsa. Mintalah Admin Pusat
                mengirim ulang undangan.
              </AlertDescription>
            </Alert>
          ) : done ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription>
                Password berhasil disimpan. Mengarahkan ke halaman utama…
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="pw">Password Baru</Label>
                <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">Konfirmasi Password</Label>
                <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Menyimpan…" : "Simpan Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
