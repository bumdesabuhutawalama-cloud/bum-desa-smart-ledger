import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRp, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/jurnal")({ component: JurnalList });

function JurnalList() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("journals").select("*, journal_lines(debit,kredit)").order("tanggal", { ascending: false }).limit(100)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Jurnal Umum</h1><p className="text-sm text-muted-foreground">Daftar transaksi terbaru</p></div>
        <Link to="/jurnal/baru"><Button><Plus className="h-4 w-4 mr-1" /> Jurnal Baru</Button></Link>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr><th className="px-4 py-2">Nomor</th><th className="px-4 py-2">Tanggal</th><th className="px-4 py-2">Keterangan</th><th className="px-4 py-2 text-right">Total</th></tr>
            </thead>
            <tbody>
              {rows.map((j: any) => {
                const total = (j.journal_lines ?? []).reduce((s: number, l: any) => s + Number(l.debit), 0);
                return (
                  <tr key={j.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{j.nomor_jurnal}</td>
                    <td className="px-4 py-2">{formatDate(j.tanggal)}</td>
                    <td className="px-4 py-2">{j.keterangan}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatRp(total)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Belum ada jurnal.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
