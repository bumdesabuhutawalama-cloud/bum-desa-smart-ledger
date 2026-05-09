import { 
  BarChart3, 
  ShoppingCart, 
  Briefcase, 
  PiggyBank, 
  Leaf,
  LucideIcon 
} from "lucide-react";

export type UnitCode = "PANGAN" | "DAGANG" | "JASA" | "SP";
export type UnitType = "ketahanan_pangan" | "perdagangan" | "jasa" | "simpan_pinjam";

export interface UnitModule {
  kode: UnitCode;
  nama: string;
  jenis: UnitType;
  slug: string;
  icon: LucideIcon;
  warna: string;
  deskripsi: string;
  subMenus: SubMenu[];
}

export interface SubMenu {
  label: string;
  href: string;
  icon?: LucideIcon;
}

export const UNIT_MODULES: Record<UnitCode, UnitModule> = {
  PANGAN: {
    kode: "PANGAN",
    nama: "Unit Ketahanan Pangan",
    jenis: "ketahanan_pangan",
    slug: "pangan",
    icon: Leaf,
    warna: "bg-green-50",
    deskripsi: "Pengelolaan pertanian, pangan, dan ketahanan pangan desa",
    subMenus: [
      { label: "Dashboard", href: "/unit/pangan/dashboard" },
      { label: "Transaksi", href: "/unit/pangan/transaksi" },
      { label: "Jurnal", href: "/unit/pangan/jurnal" },
      { label: "Kas & Bank", href: "/unit/pangan/kas-bank" },
      { label: "Penjualan", href: "/unit/pangan/penjualan" },
      { label: "Pembelian", href: "/unit/pangan/pembelian" },
      { label: "Persediaan", href: "/unit/pangan/persediaan" },
      { label: "Laporan", href: "/unit/pangan/laporan" },
      { label: "Buku Besar", href: "/unit/pangan/buku-besar" },
      { label: "Neraca", href: "/unit/pangan/neraca" },
      { label: "Laba Rugi", href: "/unit/pangan/laba-rugi" },
    ],
  },
  DAGANG: {
    kode: "DAGANG",
    nama: "Unit Perdagangan",
    jenis: "perdagangan",
    slug: "perdagangan",
    icon: ShoppingCart,
    warna: "bg-blue-50",
    deskripsi: "Toko, kios, dan usaha perdagangan",
    subMenus: [
      { label: "Dashboard", href: "/unit/perdagangan/dashboard" },
      { label: "Transaksi", href: "/unit/perdagangan/transaksi" },
      { label: "Jurnal", href: "/unit/perdagangan/jurnal" },
      { label: "Kas & Bank", href: "/unit/perdagangan/kas-bank" },
      { label: "Penjualan", href: "/unit/perdagangan/penjualan" },
      { label: "Pembelian", href: "/unit/perdagangan/pembelian" },
      { label: "Persediaan", href: "/unit/perdagangan/persediaan" },
      { label: "Laporan", href: "/unit/perdagangan/laporan" },
      { label: "Buku Besar", href: "/unit/perdagangan/buku-besar" },
      { label: "Neraca", href: "/unit/perdagangan/neraca" },
      { label: "Laba Rugi", href: "/unit/perdagangan/laba-rugi" },
    ],
  },
  JASA: {
    kode: "JASA",
    nama: "Unit Jasa",
    jenis: "jasa",
    slug: "jasa",
    icon: Briefcase,
    warna: "bg-purple-50",
    deskripsi: "Layanan jasa dan sewa alat/gedung",
    subMenus: [
      { label: "Dashboard", href: "/unit/jasa/dashboard" },
      { label: "Transaksi", href: "/unit/jasa/transaksi" },
      { label: "Jurnal", href: "/unit/jasa/jurnal" },
      { label: "Kas & Bank", href: "/unit/jasa/kas-bank" },
      { label: "Penjualan Jasa", href: "/unit/jasa/penjualan" },
      { label: "Biaya", href: "/unit/jasa/biaya" },
      { label: "Laporan", href: "/unit/jasa/laporan" },
      { label: "Buku Besar", href: "/unit/jasa/buku-besar" },
      { label: "Neraca", href: "/unit/jasa/neraca" },
      { label: "Laba Rugi", href: "/unit/jasa/laba-rugi" },
    ],
  },
  SP: {
    kode: "SP",
    nama: "Unit Simpan Pinjam",
    jenis: "simpan_pinjam",
    slug: "sp",
    icon: PiggyBank,
    warna: "bg-orange-50",
    deskripsi: "Layanan simpanan dan pinjaman masyarakat",
    subMenus: [
      { label: "Dashboard", href: "/unit/sp/dashboard" },
      { label: "Transaksi", href: "/unit/sp/transaksi" },
      { label: "Jurnal", href: "/unit/sp/jurnal" },
      { label: "Kas & Bank", href: "/unit/sp/kas-bank" },
      { label: "Pinjaman", href: "/unit/sp/pinjaman" },
      { label: "Simpanan", href: "/unit/sp/simpanan" },
      { label: "Laporan", href: "/unit/sp/laporan" },
      { label: "Buku Besar", href: "/unit/sp/buku-besar" },
      { label: "Neraca", href: "/unit/sp/neraca" },
      { label: "Laba Rugi", href: "/unit/sp/laba-rugi" },
    ],
  },
};

export function getUnitBySlug(slug: string): UnitModule | null {
  return Object.values(UNIT_MODULES).find((u) => u.slug === slug) || null;
}

export function getUnitByKode(kode: UnitCode): UnitModule | null {
  return UNIT_MODULES[kode] || null;
}
