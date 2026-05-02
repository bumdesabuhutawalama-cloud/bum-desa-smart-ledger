import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, CheckCircle2, XCircle, User2, Bot } from "lucide-react";
import { toast } from "sonner";
import { useBusinessUnit } from "@/lib/business-unit-context";
import { AccountLite } from "@/lib/account-resolver";
import {
  ActivityTemplate,
  buildJournal,
  generateNomorJurnal,
  validateInput,
} from "@/lib/activity-engine";
import { formatRp } from "@/lib/format";

export const Route = createFileRoute("/_app/ai-asisten")({
  component: AIAsistenPage,
});

type ChatMsg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; draft?: AnyDraft };

type AnyDraft =
  | { kind: "draft_kegiatan"; template_code: string; values: Record<string, any>; business_unit_id?: string; ringkasan: string }
  | {
      kind: "draft_jurnal_manual";
      tanggal: string;
      keterangan: string;
      lines: { account_kode: string; debit: number; kredit: number; keterangan?: string }[];
      business_unit_id?: string;
      ringkasan: string;
    }
  | {
      kind: "draft_tambah_akun";
      kode_akun: string;
      nama_akun: string;
      tipe_akun: string;
      normal_balance?: "DEBIT" | "KREDIT";
      parent_kode?: string;
      is_header?: boolean;
      description?: string;
      ringkasan: string;
    };

function AIAsistenPage() {
  const { units, currentUnitId, defaultUnit, resolveWriteUnitId } = useBusinessUnit();
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Halo! Saya AI Asisten Keuangan BUM Desa. Tulis perintah seperti:\n• \"Catatkan ada uang masuk penyertaan desa Rp 10.000.000 hari ini\"\n• \"Catat penjualan tunai 500.000 untuk PAM\"\n• \"Berapa saldo kas?\"\n\nSaya akan menyiapkan draf jurnalnya — Anda yang menekan tombol Posting.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("accounts")
      .select("id, kode_akun, nama_akun, normal_balance, is_active, is_header, tipe_akun")
      .eq("is_active", true)
      .order("kode_akun");
    setAccounts((data ?? []) as AccountLite[]);
  };

  useEffect(() => {
    (async () => {
      const tpl = await (supabase as any)
        .from("activity_templates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setTemplates((tpl.data ?? []) as ActivityTemplate[]);
      await loadAccounts();
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const activeUnit = useMemo(() => {
    if (currentUnitId === "ALL") return null;
    return units.find((u) => u.id === currentUnitId) ?? null;
  }, [currentUnitId, units]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const newMsgs: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setBusy(true);
    try {
      const ctxAccounts = accounts.map((a) => ({
        kode_akun: a.kode_akun,
        nama_akun: a.nama_akun,
        tipe_akun: a.tipe_akun,
        is_header: a.is_header,
      }));
      const ctxTemplates = templates.map((t: any) => ({
        code: t.code,
        name: t.name,
        business_type: t.business_type,
        description: t.description,
        fields: t.fields,
      }));
      const { data, error } = await supabase.functions.invoke("ai-asisten", {
        body: {
          messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
          context: {
            active_unit: activeUnit,
            units: units.map((u) => ({
              id: u.id,
              kode: u.kode,
              nama: u.nama,
              jenis: u.jenis,
              is_default: u.is_default,
            })),
            templates: ctxTemplates,
            accounts: ctxAccounts,
          },
        },
      });
      if (error) throw error;
      const action = data?.action;
      if (!action) throw new Error("Respons kosong");

      if (action.kind === "answer") {
        setMessages((m) => [...m, { role: "assistant", content: action.text || "..." }]);
      } else {
        const ringkasan = action.ringkasan || "Draf transaksi siap.";
        setMessages((m) => [
          ...m,
          { role: "assistant", content: ringkasan, draft: action as AnyDraft },
        ]);
      }
    } catch (e: any) {
      toast.error(e?.message || "Gagal memanggil AI");
      setMessages((m) => [...m, { role: "assistant", content: "Maaf, terjadi kesalahan: " + (e?.message ?? "unknown") }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI Asisten Keuangan</h1>
          <p className="text-xs text-muted-foreground">
            Unit aktif: {activeUnit ? `${activeUnit.kode} — ${activeUnit.nama}` : "Konsolidasi (semua unit)"}
          </p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                msg={m}
                templates={templates}
                accounts={accounts}
                units={units}
                resolveWriteUnitId={resolveWriteUnitId}
                onPosted={(label) => {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: `✅ ${label} berhasil diposting.` },
                  ]);
                }}
              />
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Menyusun jawaban…
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-3 flex gap-2">
          <Input
            placeholder="Tulis perintah, contoh: catat penyertaan desa Rp 10 juta hari ini"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={busy}
          />
          <Button onClick={send} disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({
  msg,
  templates,
  accounts,
  units,
  resolveWriteUnitId,
  onPosted,
}: {
  msg: ChatMsg;
  templates: ActivityTemplate[];
  accounts: AccountLite[];
  units: { id: string; kode: string; nama: string }[];
  resolveWriteUnitId: () => string | null;
  onPosted: (label: string) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? <User2 className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex-1 ${isUser ? "items-end text-right" : ""}`}>
        <div
          className={`inline-block rounded-lg px-3 py-2 text-sm whitespace-pre-wrap max-w-[90%] ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          {msg.content}
        </div>
        {!isUser && msg.draft && (
          <div className="mt-2">
            <DraftPreview
              draft={msg.draft}
              templates={templates}
              accounts={accounts}
              units={units}
              resolveWriteUnitId={resolveWriteUnitId}
              onPosted={onPosted}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DraftPreview({
  draft,
  templates,
  accounts,
  units,
  resolveWriteUnitId,
  onPosted,
}: {
  draft: AnyDraft;
  templates: ActivityTemplate[];
  accounts: AccountLite[];
  units: { id: string; kode: string; nama: string }[];
  resolveWriteUnitId: () => string | null;
  onPosted: (label: string) => void;
}) {
  const [posted, setPosted] = useState(false);
  const [posting, setPosting] = useState(false);

  // Resolve unit (tidak relevan untuk draft_tambah_akun)
  const unitId =
    draft.kind === "draft_tambah_akun"
      ? ""
      : (draft.business_unit_id || resolveWriteUnitId() || "");
  const unit = units.find((u) => u.id === unitId);

  // Build preview
  let preview: {
    tanggal: string;
    keterangan: string;
    lines: { kode_akun: string; nama_akun: string; debit: number; kredit: number; keterangan?: string }[];
    totalDebit: number;
    totalKredit: number;
    errors: string[];
    label: string;
    posted_handler: () => Promise<void>;
  } | null = null;

  if (draft.kind === "draft_kegiatan") {
    const tpl = templates.find((t) => t.code === draft.template_code);
    if (!tpl) {
      preview = makeError("Template tidak ditemukan: " + draft.template_code);
    } else {
      const valErrs = validateInput(tpl, draft.values as any);
      const built = buildJournal(tpl, draft.values as any, accounts);
      const tanggalField = tpl.fields.find((f) => f.type === "date");
      const tanggal = (tanggalField ? String(draft.values[tanggalField.key]) : new Date().toISOString().slice(0, 10)) || new Date().toISOString().slice(0, 10);
      preview = {
        tanggal,
        keterangan: built.keterangan,
        lines: built.preview.map((l) => ({
          kode_akun: l.kode_akun ?? "?",
          nama_akun: l.nama_akun ?? "(akun tak ditemukan)",
          debit: l.debit,
          kredit: l.kredit,
          keterangan: l.keterangan,
        })),
        totalDebit: built.totalDebit,
        totalKredit: built.totalKredit,
        errors: [...valErrs, ...built.errors, ...(unitId ? [] : ["Unit usaha belum dipilih"])],
        label: tpl.name,
        posted_handler: async () => {
          if (!unitId) throw new Error("Unit belum dipilih");
          const nomor = await generateNomorJurnal(supabase, tanggal);
          const { data: { user } } = await supabase.auth.getUser();
          const { data: jurnal, error: errJ } = await (supabase as any)
            .from("journals")
            .insert({
              nomor_jurnal: nomor,
              tanggal,
              keterangan: built.keterangan,
              status: "posted",
              source: "ai-asisten",
              created_by: user?.id ?? null,
              business_unit_id: unitId,
            })
            .select("id")
            .single();
          if (errJ || !jurnal) throw errJ ?? new Error("Gagal membuat jurnal");
          const linesPayload = built.lines.map((l, i) => ({
            journal_id: jurnal.id,
            account_id: l.account_id,
            debit: l.debit,
            kredit: l.kredit,
            keterangan: l.keterangan ?? null,
            line_order: i,
          }));
          const { error: errL } = await supabase.from("journal_lines").insert(linesPayload);
          if (errL) throw errL;
          await (supabase as any).from("activity_entries").insert({
            template_id: tpl.id,
            journal_id: jurnal.id,
            input_data: draft.values,
            business_unit_id: unitId,
          });
        },
      };
    }
  } else if (draft.kind === "draft_jurnal_manual") {
    const errors: string[] = [];
    const lines = draft.lines.map((l) => {
      const acc = accounts.find((a) => a.kode_akun === l.account_kode);
      if (!acc) errors.push(`Akun ${l.account_kode} tidak ditemukan`);
      return {
        account_id: acc?.id ?? "",
        kode_akun: l.account_kode,
        nama_akun: acc?.nama_akun ?? "(tak ditemukan)",
        debit: Number(l.debit) || 0,
        kredit: Number(l.kredit) || 0,
        keterangan: l.keterangan,
      };
    });
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);
    if (lines.length < 2) errors.push("Minimal 2 baris");
    if (Math.abs(totalDebit - totalKredit) > 0.5) errors.push(`Debit ${totalDebit} ≠ Kredit ${totalKredit}`);
    if (!unitId) errors.push("Unit usaha belum dipilih");
    preview = {
      tanggal: draft.tanggal,
      keterangan: draft.keterangan,
      lines,
      totalDebit,
      totalKredit,
      errors,
      label: "Jurnal Manual",
      posted_handler: async () => {
        const nomor = await generateNomorJurnal(supabase, draft.tanggal);
        const { data: { user } } = await supabase.auth.getUser();
        const { data: jurnal, error: errJ } = await (supabase as any)
          .from("journals")
          .insert({
            nomor_jurnal: nomor,
            tanggal: draft.tanggal,
            keterangan: draft.keterangan,
            status: "posted",
            source: "ai-asisten",
            created_by: user?.id ?? null,
            business_unit_id: unitId,
          })
          .select("id")
          .single();
        if (errJ || !jurnal) throw errJ ?? new Error("Gagal membuat jurnal");
        const linesPayload = lines.map((l, i) => ({
          journal_id: jurnal.id,
          account_id: l.account_id,
          debit: l.debit,
          kredit: l.kredit,
          keterangan: l.keterangan ?? null,
          line_order: i,
        }));
        const { error: errL } = await supabase.from("journal_lines").insert(linesPayload);
        if (errL) throw errL;
      },
    };
  }

  if (!preview) return null;

  const valid = preview.errors.length === 0;

  const handlePost = async () => {
    setPosting(true);
    try {
      await preview!.posted_handler();
      setPosted(true);
      toast.success("Jurnal diposting");
      onPosted(preview!.label);
    } catch (e: any) {
      toast.error(e?.message || "Gagal posting");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card className="p-3 mt-1 border-primary/30 max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary">{preview.label}</Badge>
          <span className="text-muted-foreground">{preview.tanggal}</span>
          {unit && <Badge variant="outline">{unit.kode}</Badge>}
        </div>
        {valid ? (
          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Seimbang
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> {preview.errors.length} masalah
          </Badge>
        )}
      </div>
      <div className="text-xs font-medium mb-2">{preview.keterangan}</div>
      <div className="rounded border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-2 py-1">Akun</th>
              <th className="text-right px-2 py-1">Debit</th>
              <th className="text-right px-2 py-1">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {preview.lines.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1">
                  <div className="font-mono text-[10px] text-muted-foreground">{l.kode_akun}</div>
                  <div>{l.nama_akun}</div>
                </td>
                <td className="px-2 py-1 text-right tabular-nums">{l.debit ? formatRp(l.debit) : "—"}</td>
                <td className="px-2 py-1 text-right tabular-nums">{l.kredit ? formatRp(l.kredit) : "—"}</td>
              </tr>
            ))}
            <tr className="border-t bg-muted/30 font-medium">
              <td className="px-2 py-1">Total</td>
              <td className="px-2 py-1 text-right tabular-nums">{formatRp(preview.totalDebit)}</td>
              <td className="px-2 py-1 text-right tabular-nums">{formatRp(preview.totalKredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {preview.errors.length > 0 && (
        <ul className="mt-2 text-xs text-destructive list-disc pl-5">
          {preview.errors.map((er, i) => (
            <li key={i}>{er}</li>
          ))}
        </ul>
      )}
      <div className="flex justify-end gap-2 mt-3">
        {posted ? (
          <Badge className="bg-emerald-500/15 text-emerald-700">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Sudah diposting
          </Badge>
        ) : (
          <Button size="sm" disabled={!valid || posting} onClick={handlePost}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Posting Jurnal"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function makeError(msg: string) {
  return {
    tanggal: new Date().toISOString().slice(0, 10),
    keterangan: "",
    lines: [],
    totalDebit: 0,
    totalKredit: 0,
    errors: [msg],
    label: "Error",
    posted_handler: async () => {},
  };
}
