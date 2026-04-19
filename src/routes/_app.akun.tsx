import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Acc = { id: string; kode_akun: string; nama_akun: string; tipe_akun: string; normal_balance: string; is_header: boolean; level: number };

export const Route = createFileRoute("/_app/akun")({ component: AkunPage });

function AkunPage() {
  const [rows, setRows] = useState<Acc[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    supabase.from("accounts").select("*").order("kode_akun").then(({ data }) => setRows((data as any) ?? []));
  }, []);
  const filtered = rows.filter(r => !q || r.kode_akun.includes(q) || r.nama_akun.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bagan Akun</h1>
          <p className="text-sm text-muted-foreground">{rows.length} akun (Kepmendesa 136/2022)</p>
        </div>
        <Input placeholder="Cari kode/nama..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Kode</th>
                <th className="px-4 py-2 font-medium">Nama Akun</th>
                <th className="px-4 py-2 font-medium">Tipe</th>
                <th className="px-4 py-2 font-medium">Saldo Normal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className={r.is_header ? "bg-muted/30 font-semibold" : "border-t"}>
                  <td className="px-4 py-2 font-mono text-xs" style={{ paddingLeft: `${r.level * 12 + 8}px` }}>{r.kode_akun}</td>
                  <td className="px-4 py-2">{r.nama_akun}</td>
                  <td className="px-4 py-2"><Badge variant="secondary">{r.tipe_akun}</Badge></td>
                  <td className="px-4 py-2">
                    <span className={r.normal_balance === "DEBIT" ? "text-debit" : "text-kredit"}>{r.normal_balance}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
