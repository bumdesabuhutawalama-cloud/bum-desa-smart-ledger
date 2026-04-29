// Helper untuk memetakan "lookup symbol" → akun di tabel accounts.
// Tujuan: template kegiatan tidak perlu hardcode UUID akun.

export type AccountLite = {
  id: string;
  kode_akun: string;
  nama_akun: string;
  normal_balance: "DEBIT" | "KREDIT";
  is_active: boolean;
  is_header: boolean;
  tipe_akun: string;
};

// Aturan lookup: prefix kode akun + filter opsional (nama mengandung keyword)
type LookupRule = {
  prefix?: string | string[];
  nameIncludes?: string | string[];
  tipe_akun?: string | string[];
};

export const ACCOUNT_LOOKUPS: Record<string, LookupRule> = {
  KAS: { prefix: ["1.1.01."] },
  BANK: { prefix: ["1.1.01.02", "1.1.01.03", "1.1.01.04", "1.1.01.05"] },
  KAS_BANK: { prefix: ["1.1.01."] }, // gabungan untuk filter dropdown
  PIUTANG_USAHA: { prefix: ["1.1.03.01"] },
  PENYISIHAN_PIUTANG: { prefix: ["1.1.04.01"] },
  PERSEDIAAN_DAGANG: { prefix: ["1.1.05.01"] },
  SEWA_DITERIMA_DIMUKA: { prefix: ["2.1."], nameIncludes: ["sewa diterima dimuka", "pendapatan diterima dimuka"] },
  PENDAPATAN_BUNGA: { nameIncludes: ["bunga"], tipe_akun: ["PENDAPATAN", "PENDAPATAN_LAIN"] },
  PENDAPATAN: { tipe_akun: ["PENDAPATAN", "PENDAPATAN_LAIN"] },
  BEBAN: { tipe_akun: ["BEBAN", "BEBAN_LAIN"] },
  ASET_TETAP: { prefix: ["1.3."] },
  EKUITAS: { tipe_akun: ["EKUITAS"] },
};

const matchesRule = (acc: AccountLite, rule: LookupRule): boolean => {
  if (!acc.is_active || acc.is_header) return false;
  if (rule.prefix) {
    const prefixes = Array.isArray(rule.prefix) ? rule.prefix : [rule.prefix];
    if (!prefixes.some((p) => acc.kode_akun.startsWith(p))) return false;
  }
  if (rule.tipe_akun) {
    const types = Array.isArray(rule.tipe_akun) ? rule.tipe_akun : [rule.tipe_akun];
    if (!types.includes(acc.tipe_akun)) return false;
  }
  if (rule.nameIncludes) {
    const keywords = Array.isArray(rule.nameIncludes) ? rule.nameIncludes : [rule.nameIncludes];
    const lower = acc.nama_akun.toLowerCase();
    if (!keywords.some((k) => lower.includes(k.toLowerCase()))) return false;
  }
  return true;
};

export function resolveCandidates(lookup: string, accounts: AccountLite[]): AccountLite[] {
  const rule = ACCOUNT_LOOKUPS[lookup];
  if (!rule) return [];
  return accounts.filter((a) => matchesRule(a, rule));
}

export function resolveDefault(lookup: string, accounts: AccountLite[]): AccountLite | null {
  const cands = resolveCandidates(lookup, accounts);
  if (cands.length === 0) return null;
  // Prefer akun non-header dengan kode terpendek (paling spesifik untuk transaksi sehari-hari)
  return cands.sort((a, b) => a.kode_akun.localeCompare(b.kode_akun))[0];
}

export function filterAccountsForField(filter: string, accounts: AccountLite[]): AccountLite[] {
  return resolveCandidates(filter, accounts);
}
