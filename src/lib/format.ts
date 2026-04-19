export const formatRp = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  if (!Number.isFinite(v)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
};

export const formatNum = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("id-ID").format(v);
};

export const formatDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
