import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRp, formatDate, todayISO } from "@/lib/format";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/buku-besar")({ component: BukuBesar });

type Acc = { id: string; kode_akun: string; nama_akun: string; normal_balance: "DEBIT" | "KREDIT" };
type Row = {
  id: string;
  debit: number;
  kredit: number;
  keterangan: string | null;
  journals: { tanggal: string; nomor_jurnal: string; keterangan: string } | null;
};

function BukuBesar() {
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [accId, setAccId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const firstDay = new Date();
  firstDay.setDate(1);
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10));
  const [to, setTo] = useState(todayISO());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id,kode_akun,nama_akun,normal_balance")
        .eq("is_header", false)
        .eq("is_active", true)
        .order("kode_akun");
      if (error) toast.error(error.message);
      setAccounts((data as Acc[]) ?? []);
    })();
  }, []);

  const acc = useMemo(() => accounts.find((a) => a.id === accId), [accounts, accId]);

  useEffect(() => {
    if (!accId) {
      setRows([]);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("journal_lines")
        .select("id,debit,kredit,keterangan,journals!inner(tanggal,nomor_jurnal,keterangan,status)")
        .eq("account_id", accId)
        .gte("journals.tanggal", from)
        .lte("journals.tanggal", to)
        .eq("journals.status", "posted")
        .order("tanggal", { referencedTable: "journals", ascending: true });
      if (error) toast.error(error.message);
      setRows((data as unknown as Row[]) ?? []);
      setLoading(false);
    })();
  }, [accId, from, to]);

  const computed = useMemo(() => {
    if (!acc) return { items: [] as Array<Row & { saldo: number }>, totalD: 0, totalK: 0, saldo: 0 };
    let saldo = 0;
    const items = rows.map((r) => {
      const delta = acc.normal_balance === "DEBIT" ? r.debit - r.kredit : r.kredit - r.debit;
      saldo += delta;
      return { ...r, saldo };
    });
    const totalD = rows.reduce((s, r) => s + Number(r.debit), 0);
    const totalK = rows.reduce((s, r) => s + Number(r.kredit), 0);
    return { items, totalD, totalK, saldo };
  }, [rows, acc]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Buku Besar</h1>
        <p className="text-sm text-muted-foreground">Mutasi & saldo berjalan per akun</p>
      </div>

      <Card className="p-4 grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Label>Akun</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between mt-1 font-normal">
                {acc ? `${acc.kode_akun} — ${acc.nama_akun}` : "Pilih akun…"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari akun…" />
                <CommandList>
                  <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    {accounts.map((a) => (
                      <CommandItem
                        key={a.id}
                        value={`${a.kode_akun} ${a.nama_akun}`}
                        onSelect={() => { setAccId(a.id); setOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", accId === a.id ? "opacity-100" : "opacity-0")} />
                        <span className="font-mono text-xs mr-2">{a.kode_akun}</span>
                        {a.nama_akun}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label>Dari</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Sampai</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : !acc ? (
          <div className="p-10 text-center text-muted-foreground">Pilih akun untuk melihat mutasi.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Tanggal</TableHead>
                <TableHead className="w-32">No. Jurnal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right w-32">Debit</TableHead>
                <TableHead className="text-right w-32">Kredit</TableHead>
                <TableHead className="text-right w-36">Saldo ({acc.normal_balance === "DEBIT" ? "D" : "K"})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {computed.items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada transaksi pada periode ini.</TableCell></TableRow>
              )}
              {computed.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.journals!.tanggal)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.journals!.nomor_jurnal}</TableCell>
                  <TableCell>{r.keterangan || r.journals!.keterangan}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.debit) ? formatRp(r.debit) : "-"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.kredit) ? formatRp(r.kredit) : "-"}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatRp(r.saldo)}</TableCell>
                </TableRow>
              ))}
              {computed.items.length > 0 && (
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(computed.totalD)}</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(computed.totalK)}</TableCell>
                  <TableCell className="text-right font-mono">{formatRp(computed.saldo)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
