// Helper untuk validasi & inferensi akun (COA).
import { AccountLite } from "./account-resolver";

export type AccountType =
  | "ASET"
  | "KEWAJIBAN"
  | "EKUITAS"
  | "PENDAPATAN"
  | "BEBAN"
  | "HPP"
  | "PENDAPATAN_LAIN"
  | "BEBAN_LAIN";

export const ACCOUNT_TYPES: AccountType[] = [
  "ASET",
  "KEWAJIBAN",
  "EKUITAS",
  "PENDAPATAN",
  "BEBAN",
  "HPP",
  "PENDAPATAN_LAIN",
  "BEBAN_LAIN",
];

export type NormalBalance = "DEBIT" | "KREDIT";

// Saldo normal default berdasarkan tipe akun.
// Catatan: akun kontra (mis. Penyisihan Piutang yang tipe=ASET tapi normal=KREDIT)
// boleh override manual.
export function defaultNormalBalance(tipe: AccountType): NormalBalance {
  switch (tipe) {
    case "ASET":
    case "BEBAN":
    case "HPP":
    case "BEBAN_LAIN":
      return "DEBIT";
    case "KEWAJIBAN":
    case "EKUITAS":
    case "PENDAPATAN":
    case "PENDAPATAN_LAIN":
      return "KREDIT";
  }
}

// Format kode akun: 1, 1.1, 1.1.01, 1.1.01.01 (1-4 segmen, segmen angka)
const KODE_REGEX = /^\d+(\.\d+){0,3}$/;

export function isValidKode(kode: string): boolean {
  return KODE_REGEX.test(kode.trim());
}

export function levelFromKode(kode: string): number {
  return kode.trim().split(".").length;
}

// Validasi parent: kode anak harus diawali kode parent (tanpa segmen "00" trailing).
// Contoh: parent "1.1.01.00" → anak harus diawali "1.1.01."
export function validateParentKode(parentKode: string, childKode: string): string | null {
  const parentClean = parentKode.replace(/(\.0+)+$/, "");
  if (!childKode.startsWith(parentClean + ".")) {
    return `Kode anak harus diawali "${parentClean}."`;
  }
  if (levelFromKode(childKode) <= levelFromKode(parentKode)) {
    return "Level anak harus lebih dalam dari parent";
  }
  return null;
}

// Saran kode berikutnya yang belum dipakai dalam grup parent.
export function suggestNextKode(parentKode: string, accounts: AccountLite[]): string {
  const parentClean = parentKode.replace(/(\.0+)+$/, "");
  const childPrefix = parentClean + ".";
  const targetLevel = levelFromKode(parentKode) + 1;
  const existing = accounts
    .filter((a) => a.kode_akun.startsWith(childPrefix) && levelFromKode(a.kode_akun) === targetLevel)
    .map((a) => {
      const last = a.kode_akun.slice(childPrefix.length).split(".")[0];
      return parseInt(last, 10);
    })
    .filter((n) => Number.isFinite(n));
  const next = (existing.length === 0 ? 0 : Math.max(...existing)) + 1;
  return childPrefix + String(next).padStart(2, "0");
}

export type AccountDraft = {
  kode_akun: string;
  nama_akun: string;
  tipe_akun: AccountType;
  normal_balance?: NormalBalance;
  parent_kode?: string;
  is_header?: boolean;
  description?: string;
};

export function validateAccountDraft(
  draft: AccountDraft,
  accounts: AccountLite[],
): string[] {
  const errs: string[] = [];
  const kode = draft.kode_akun.trim();
  if (!kode) errs.push("Kode akun wajib diisi");
  else if (!isValidKode(kode)) errs.push("Format kode akun tidak valid (contoh: 1.1.01.06)");
  if (!draft.nama_akun.trim()) errs.push("Nama akun wajib diisi");
  if (!ACCOUNT_TYPES.includes(draft.tipe_akun)) errs.push("Tipe akun tidak valid");

  if (accounts.some((a) => a.kode_akun === kode)) {
    errs.push(`Kode "${kode}" sudah dipakai`);
  }
  if (draft.parent_kode) {
    const parent = accounts.find((a) => a.kode_akun === draft.parent_kode);
    if (!parent) errs.push(`Parent ${draft.parent_kode} tidak ditemukan`);
    else {
      if (!parent.is_header) errs.push("Parent harus akun header");
      const e = validateParentKode(parent.kode_akun, kode);
      if (e) errs.push(e);
    }
  }
  return errs;
}
