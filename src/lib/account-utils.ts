// Helper untuk validasi & inferensi akun (COA) BUMDes.
// Format kode WAJIB 4 segmen: X.X.XX.XX
//   Digit 1 → Golongan, Digit 2 → Bidang, Digit 3 → Kelompok, Digit 4 → Objek
// Level ditentukan oleh berapa segmen non-"00" pertama:
//   1.0.00.00 = Lv1, 1.1.00.00 = Lv2, 1.1.01.00 = Lv3, 1.1.01.01 = Lv4
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

// Pecah kode → 4 segmen string. Pad dengan "00" jika kurang.
function splitSegments(kode: string): [string, string, string, string] {
  const parts = kode.trim().split(".");
  const seg = [parts[0] ?? "0", parts[1] ?? "0", parts[2] ?? "00", parts[3] ?? "00"];
  return [seg[0], seg[1], seg[2], seg[3]] as [string, string, string, string];
}

// Format strict 4 segmen: 1 digit . 1 digit . 2 digit . 2 digit
const KODE_REGEX = /^\d\.\d\.\d{2}\.\d{2}$/;
export function isValidKode(kode: string): boolean {
  return KODE_REGEX.test(kode.trim());
}

// Level berdasar trailing "00":
// 1.0.00.00 → 1; 1.1.00.00 → 2; 1.1.01.00 → 3; 1.1.01.01 → 4
export function levelFromKode(kode: string): number {
  const [, b, c, d] = splitSegments(kode);
  if (d !== "00") return 4;
  if (c !== "00") return 3;
  if (b !== "0") return 2;
  return 1;
}

export function isLeafLevel(kode: string): boolean {
  return levelFromKode(kode) === 4;
}

// Generate kode anak berdasarkan parent.
// Parent harus level 1-3. Lempar Error jika level 4.
export function generateKodeAkun(parentKode: string, daftarKode: string[]): string {
  const lvl = levelFromKode(parentKode);
  if (lvl >= 4) {
    throw new Error("Akun level terakhir tidak bisa memiliki turunan");
  }
  const [a, b, c] = splitSegments(parentKode);
  const childLevel = lvl + 1;
  // segmen yang akan diincrement = childLevel
  const siblings = daftarKode.filter((k) => {
    if (!isValidKode(k)) return false;
    if (levelFromKode(k) !== childLevel) return false;
    const [ka, kb, kc] = splitSegments(k);
    if (childLevel === 2) return ka === a;
    if (childLevel === 3) return ka === a && kb === b;
    if (childLevel === 4) return ka === a && kb === b && kc === c;
    return false;
  });
  const nums = siblings.map((k) => {
    const [ka, kb, kc, kd] = splitSegments(k);
    if (childLevel === 2) return parseInt(kb, 10);
    if (childLevel === 3) return parseInt(kc, 10);
    return parseInt(kd, 10);
  }).filter((n) => Number.isFinite(n));
  const next = (nums.length === 0 ? 0 : Math.max(...nums)) + 1;
  if (childLevel === 2) {
    if (next > 9) throw new Error("Bidang penuh (maks 9)");
    return `${a}.${next}.00.00`;
  }
  if (childLevel === 3) {
    if (next > 99) throw new Error("Kelompok penuh (maks 99)");
    return `${a}.${b}.${String(next).padStart(2, "0")}.00`;
  }
  if (next > 99) throw new Error("Objek penuh (maks 99)");
  return `${a}.${b}.${c}.${String(next).padStart(2, "0")}`;
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
  if (!kode) errs.push("Kode akun wajib di-generate");
  else if (!isValidKode(kode)) errs.push("Format kode akun harus X.X.XX.XX (contoh: 1.1.01.06)");
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
      if (isLeafLevel(parent.kode_akun)) errs.push("Akun level terakhir tidak bisa memiliki turunan");
      if (levelFromKode(kode) !== levelFromKode(parent.kode_akun) + 1) {
        errs.push("Level anak harus tepat satu di bawah parent");
      }
    }
  } else {
    // Tanpa parent hanya untuk level 1 (golongan), umumnya sudah ada by system
    if (levelFromKode(kode) !== 1) errs.push("Akun non-golongan wajib memilih parent");
  }
  return errs;
}

// Backward compat (dipakai AI tool / tempat lain)
export function suggestNextKode(parentKode: string, accounts: AccountLite[]): string {
  return generateKodeAkun(parentKode, accounts.map((a) => a.kode_akun));
}

export function validateParentKode(parentKode: string, childKode: string): string | null {
  if (isLeafLevel(parentKode)) return "Akun level terakhir tidak bisa memiliki turunan";
  if (levelFromKode(childKode) !== levelFromKode(parentKode) + 1) {
    return "Level anak harus tepat satu di bawah parent";
  }
  return null;
}
