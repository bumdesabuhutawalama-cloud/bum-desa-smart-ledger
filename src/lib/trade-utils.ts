// Helpers khusus modul Unit Perdagangan.
// Tidak mengubah logika modul lain — hanya konsumsi tabel existing (accounts, journals, journal_lines, inventory_items, inventory_movements).

import { supabase } from "@/integrations/supabase/client";

export const TRADE_ACCOUNT_CODES = {
  PERSEDIAAN: "1.1.05.01",
  HUTANG_SUPPLIER: "2.1.01.02",
  PENJUALAN: "4.1.01.01",
  HPP: "5.1.01.01",
} as const;

export type TradeAccountKey = keyof typeof TRADE_ACCOUNT_CODES;

export async function fetchTradeAccounts() {
  const codes = Object.values(TRADE_ACCOUNT_CODES);
  const { data, error } = await supabase
    .from("accounts")
    .select("id, kode_akun, nama_akun, tipe_akun, normal_balance")
    .in("kode_akun", codes);
  if (error) throw error;
  const map: Record<string, { id: string; kode_akun: string; nama_akun: string }> = {};
  (data ?? []).forEach((a: any) => (map[a.kode_akun] = a));
  return {
    persediaan: map[TRADE_ACCOUNT_CODES.PERSEDIAAN],
    hutang: map[TRADE_ACCOUNT_CODES.HUTANG_SUPPLIER],
    penjualan: map[TRADE_ACCOUNT_CODES.PENJUALAN],
    hpp: map[TRADE_ACCOUNT_CODES.HPP],
  };
}

export async function fetchKasAccounts() {
  // Akun Kas (1.1.01.*) — sama dengan modul existing
  const { data } = await supabase
    .from("accounts")
    .select("id, kode_akun, nama_akun")
    .like("kode_akun", "1.1.01.%")
    .eq("is_header", false)
    .order("kode_akun");
  return (data ?? []) as { id: string; kode_akun: string; nama_akun: string }[];
}

export async function generateDocNumber(prefix: string, table: string, column: string, tanggal: string) {
  const ym = tanggal.slice(0, 7).replace("-", "");
  const fullPrefix = `${prefix}-${ym}-`;
  const { data } = await (supabase as any)
    .from(table)
    .select(column)
    .ilike(column, `${fullPrefix}%`)
    .order(column, { ascending: false })
    .limit(1);
  let next = 1;
  if (data && data[0]?.[column]) {
    const last = parseInt(String(data[0][column]).split("-").pop() || "0", 10);
    next = last + 1;
  }
  return `${fullPrefix}${String(next).padStart(4, "0")}`;
}

export async function generateNomorJurnal(tanggal: string) {
  return generateDocNumber("JR", "journals", "nomor_jurnal", tanggal);
}

export type JournalLineInput = {
  account_id: string;
  debit: number;
  kredit: number;
  keterangan?: string;
};

/** Posting jurnal balance. Throw kalau debit≠kredit. Return journal_id. */
export async function postJournal(opts: {
  tanggal: string;
  keterangan: string;
  business_unit_id: string;
  source: string;
  source_ref?: string;
  lines: JournalLineInput[];
  user_id?: string;
}) {
  const td = opts.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const tk = opts.lines.reduce((s, l) => s + (l.kredit || 0), 0);
  if (Math.abs(td - tk) > 0.5) {
    throw new Error(`Jurnal tidak balance: debit ${td} ≠ kredit ${tk}`);
  }
  if (opts.lines.length < 2) throw new Error("Jurnal minimal 2 baris");
  const nomor = await generateNomorJurnal(opts.tanggal);
  const { data: j, error } = await supabase
    .from("journals")
    .insert({
      nomor_jurnal: nomor,
      tanggal: opts.tanggal,
      keterangan: opts.keterangan,
      status: "posted",
      source: opts.source,
      source_ref: opts.source_ref ?? null,
      business_unit_id: opts.business_unit_id,
      created_by: opts.user_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const linesPayload = opts.lines.map((l, idx) => ({
    journal_id: j.id,
    account_id: l.account_id,
    debit: l.debit || 0,
    kredit: l.kredit || 0,
    keterangan: l.keterangan ?? null,
    line_order: idx,
  }));
  const { error: e2 } = await supabase.from("journal_lines").insert(linesPayload);
  if (e2) {
    await supabase.from("journals").delete().eq("id", j.id);
    throw e2;
  }
  return j.id as string;
}

/** Tambah stok + update harga_perolehan rata-rata tertimbang (moving average). */
export async function addStockMovingAvg(itemId: string, qty: number, harga: number, tanggal: string, ket: string) {
  const { data: it, error } = await supabase
    .from("inventory_items")
    .select("stok, harga_perolehan")
    .eq("id", itemId)
    .single();
  if (error) throw error;
  const oldQty = Number(it.stok) || 0;
  const oldCost = Number(it.harga_perolehan) || 0;
  const newQty = oldQty + qty;
  const newCost = newQty > 0 ? (oldQty * oldCost + qty * harga) / newQty : harga;
  await supabase.from("inventory_movements").insert({
    item_id: itemId,
    tanggal,
    tipe: "masuk",
    qty,
    harga,
    keterangan: ket,
  });
  await supabase
    .from("inventory_items")
    .update({ stok: newQty, harga_perolehan: newCost })
    .eq("id", itemId);
  return newCost;
}

/** Kurangi stok dengan harga rata-rata saat ini sebagai HPP. Return hpp_per_unit. */
export async function reduceStock(itemId: string, qty: number, hargaJual: number, tanggal: string, ket: string) {
  const { data: it, error } = await supabase
    .from("inventory_items")
    .select("stok, harga_perolehan")
    .eq("id", itemId)
    .single();
  if (error) throw error;
  if (Number(it.stok) < qty) throw new Error("Stok tidak cukup");
  const hpp = Number(it.harga_perolehan) || 0;
  const newQty = Number(it.stok) - qty;
  await supabase.from("inventory_movements").insert({
    item_id: itemId,
    tanggal,
    tipe: "keluar",
    qty,
    harga: hargaJual,
    keterangan: ket,
  });
  await supabase.from("inventory_items").update({ stok: newQty }).eq("id", itemId);
  return hpp;
}
