// Engine untuk menerjemahkan template kegiatan → baris jurnal double-entry.
import { AccountLite, resolveDefault } from "./account-resolver";

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "account" | "select";
  required?: boolean;
  helper?: string;
  options?: { value: string; label: string }[];
  account_filter?: string; // mis. "KAS_BANK", "PENDAPATAN"
};

export type LineRule = {
  side: "debit" | "kredit";
  account: { lookup?: string; from_field?: string };
  amount: { from_field?: string; formula?: string };
  condition?: { field: string; op: ">" | ">=" | "<" | "<=" | "==" | "!="; value: number };
  keterangan?: string;
};

export type ActivityTemplate = {
  id: string;
  business_type: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  is_active: boolean;
  sort_order: number;
  fields: FieldDef[];
  lines: LineRule[];
  keterangan_template: string;
};

export type InputValues = Record<string, string | number>;

export type BuiltLine = {
  account_id: string;
  debit: number;
  kredit: number;
  keterangan?: string;
};

export type BuildResult = {
  ok: boolean;
  keterangan: string;
  lines: BuiltLine[];
  totalDebit: number;
  totalKredit: number;
  errors: string[];
  // Versi untuk preview (dengan nama akun)
  preview: Array<BuiltLine & { kode_akun?: string; nama_akun?: string }>;
};

const num = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

// Parser formula sangat sederhana: hanya + dan - antar field/angka. Tidak mendukung kurung.
// Cukup untuk kasus "pokok + bunga", "a - b".
const evalFormula = (formula: string, values: InputValues): number => {
  // tokenize: split by + or - sambil menjaga tandanya
  const tokens = formula.replace(/\s+/g, "").split(/(?=[+\-])/);
  let total = 0;
  for (const t of tokens) {
    if (!t) continue;
    const sign = t.startsWith("-") ? -1 : 1;
    const body = t.replace(/^[+\-]/, "");
    const v = /^[0-9.]+$/.test(body) ? parseFloat(body) : num(values[body]);
    total += sign * v;
  }
  return total;
};

const interpolate = (tpl: string, values: InputValues): string =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));

const checkCondition = (cond: NonNullable<LineRule["condition"]>, values: InputValues): boolean => {
  const v = num(values[cond.field]);
  switch (cond.op) {
    case ">": return v > cond.value;
    case ">=": return v >= cond.value;
    case "<": return v < cond.value;
    case "<=": return v <= cond.value;
    case "==": return v === cond.value;
    case "!=": return v !== cond.value;
  }
};

export function validateInput(template: ActivityTemplate, values: InputValues): string[] {
  const errors: string[] = [];
  for (const f of template.fields) {
    const v = values[f.key];
    if (f.required && (v === undefined || v === "" || v === null)) {
      errors.push(`${f.label} wajib diisi`);
    }
    if (f.type === "number" && v !== undefined && v !== "" && num(v) < 0) {
      errors.push(`${f.label} tidak boleh negatif`);
    }
  }
  return errors;
}

export function buildJournal(
  template: ActivityTemplate,
  values: InputValues,
  accounts: AccountLite[],
): BuildResult {
  const errors: string[] = [];
  const lines: BuiltLine[] = [];
  const preview: BuildResult["preview"] = [];

  for (const rule of template.lines) {
    if (rule.condition && !checkCondition(rule.condition, values)) continue;

    // Resolve account
    let accountId = "";
    if (rule.account.from_field) {
      accountId = String(values[rule.account.from_field] ?? "");
    } else if (rule.account.lookup) {
      const def = resolveDefault(rule.account.lookup, accounts);
      if (!def) {
        errors.push(`Akun "${rule.account.lookup}" tidak ditemukan di Bagan Akun`);
      } else {
        accountId = def.id;
      }
    }

    // Resolve amount
    let amount = 0;
    if (rule.amount.from_field) {
      amount = num(values[rule.amount.from_field]);
    } else if (rule.amount.formula) {
      amount = evalFormula(rule.amount.formula, values);
    }
    if (amount <= 0) continue; // skip baris bernilai 0

    const ket = rule.keterangan ? interpolate(rule.keterangan, values) : undefined;
    const line: BuiltLine = {
      account_id: accountId,
      debit: rule.side === "debit" ? amount : 0,
      kredit: rule.side === "kredit" ? amount : 0,
      keterangan: ket,
    };
    lines.push(line);

    const acc = accounts.find((a) => a.id === accountId);
    preview.push({
      ...line,
      kode_akun: acc?.kode_akun,
      nama_akun: acc?.nama_akun,
    });
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (lines.length < 2) {
    errors.push("Jurnal minimal harus memiliki 2 baris");
  }
  if (Math.abs(totalDebit - totalKredit) > 0.5) {
    errors.push(`Total Debit (${totalDebit}) tidak sama dengan Total Kredit (${totalKredit})`);
  }

  return {
    ok: errors.length === 0,
    keterangan: interpolate(template.keterangan_template, values) || template.name,
    lines,
    totalDebit,
    totalKredit,
    errors,
    preview,
  };
}

export async function generateNomorJurnal(
  supabaseClient: { from: (t: string) => any },
  tanggal: string,
): Promise<string> {
  const ym = tanggal.slice(0, 7).replace("-", "");
  const prefix = `JR-${ym}-`;
  const { data } = await supabaseClient
    .from("journals")
    .select("nomor_jurnal")
    .ilike("nomor_jurnal", `${prefix}%`)
    .order("nomor_jurnal", { ascending: false })
    .limit(1);
  let next = 1;
  if (data && data[0]?.nomor_jurnal) {
    const last = parseInt(String(data[0].nomor_jurnal).split("-").pop() || "0", 10);
    next = last + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}
