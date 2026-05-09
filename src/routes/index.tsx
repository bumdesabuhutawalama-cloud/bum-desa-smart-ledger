import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ShoppingCart, Leaf, Briefcase, PiggyBank } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BUM Desa Smart Ledger — Pilih Unit Usaha" },
      { name: "description", content: "Sistem keuangan terintegrasi BUM Desa multi-unit usaha." },
    ],
  }),
  component: LandingPage,
});

const units = [
  {
    to: "/dagang/login",
    title: "Unit Perdagangan",
    desc: "Toko, kios, dan usaha perdagangan BUM Desa",
    icon: ShoppingCart,
    iconBg: "bg-blue-500",
    cardBg: "bg-blue-50/60 border-blue-200",
    btnBg: "bg-blue-600 hover:bg-blue-700",
    titleColor: "text-blue-700",
  },
  {
    to: "/pangan/login",
    title: "Unit Ketahanan Pangan",
    desc: "Pengelolaan pertanian, pangan, dan ketahanan pangan desa",
    icon: Leaf,
    iconBg: "bg-emerald-500",
    cardBg: "bg-emerald-50/60 border-emerald-200",
    btnBg: "bg-emerald-600 hover:bg-emerald-700",
    titleColor: "text-emerald-700",
  },
  {
    to: "/jasa/login",
    title: "Unit Jasa",
    desc: "Layanan jasa dan sewa alat/gedung BUM Desa",
    icon: Briefcase,
    iconBg: "bg-purple-500",
    cardBg: "bg-purple-50/60 border-purple-200",
    btnBg: "bg-purple-600 hover:bg-purple-700",
    titleColor: "text-purple-700",
  },
  {
    to: "/sp/login",
    title: "Unit Simpan Pinjam",
    desc: "Layanan simpanan dan pinjaman masyarakat",
    icon: PiggyBank,
    iconBg: "bg-orange-500",
    cardBg: "bg-orange-50/60 border-orange-200",
    btnBg: "bg-orange-600 hover:bg-orange-700",
    titleColor: "text-orange-700",
  },
] as const;

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto h-14 w-14 rounded-full bg-slate-900 grid place-items-center mb-5">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">BUM Desa Smart Ledger</h1>
          <p className="mt-2 text-slate-600">
            Sistem Keuangan Terintegrasi BUM Desa — Pilih Unit Usaha Anda
          </p>
        </div>

        {/* Grid 4 unit — seluruh card clickable */}
        <div className="grid sm:grid-cols-2 gap-5">
          {units.map((u) => {
            const Icon = u.icon;
            return (
              <Link
                key={u.to}
                to={u.to}
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 rounded-xl"
              >
                <Card
                  className={`${u.cardBg} border p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg`}
                >
                  <div className={`h-12 w-12 rounded-lg ${u.iconBg} grid place-items-center mb-4 transition-transform group-hover:scale-110`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h2 className={`text-lg font-semibold ${u.titleColor}`}>{u.title}</h2>
                  <p className="mt-1 text-sm text-slate-600 min-h-[2.5rem]">{u.desc}</p>
                  <span
                    className={`mt-5 w-full rounded-md ${u.btnBg} text-white text-sm font-medium py-2.5 transition-colors inline-block`}
                  >
                    Masuk ke {u.title}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Footer info */}
        <Card className="mt-8 p-6 text-center bg-white">
          <h3 className="font-semibold text-slate-900">Sistem ERP Multi-Unit</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto">
            Setiap unit memiliki dashboard, transaksi, dan laporan terpisah namun tetap terintegrasi
            dalam satu sistem keuangan BUM Desa yang komprehensif.
          </p>
        </Card>
      </div>
    </div>
  );
}
