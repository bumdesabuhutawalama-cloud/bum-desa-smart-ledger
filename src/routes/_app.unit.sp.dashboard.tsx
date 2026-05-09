import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUnit } from "@/lib/unit-context";
import { useNavigate } from "@tanstack/react-router";
import { UnitLayout } from "@/shared/layouts/UnitLayout";
import { StatCard, ModuleCard } from "@/shared/components/DashboardCards";
import { PiggyBank, TrendingUp, BarChart3, Wallet, ArrowRightLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/unit/sp/dashboard")({
  component: SPDashboard,
});

function SPDashboard() {
  const { currentUnitKode, setCurrentUnitKode, isConsolidating } = useUnit();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUnitKode !== "SP" && !isConsolidating) {
      setCurrentUnitKode("SP");
    }
  }, [currentUnitKode, setCurrentUnitKode, isConsolidating]);

  return (
    <UnitLayout
      title="Dashboard Unit Simpan Pinjam"
      description="Kelola layanan simpanan dan pinjaman masyarakat"
      unitKode="SP"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={PiggyBank}
          label="Dana Simpanan"
          value="45,000,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={Wallet}
          label="Dana Pinjam Beredar"
          value="38,500,000"
          unit="IDR"
          variant="default"
        />
        <StatCard
          icon={TrendingUp}
          label="Pendapatan Bunga"
          value="2,250,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={FileText}
          label="Anggota Aktif"
          value="156"
          description="Peminjam & penabung"
          variant="default"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Input Transaksi"
          description="Catat pinjaman, simpanan, dan bunga"
          icon={<FileText className="h-5 w-5" />}
          href="/unit/sp/transaksi"
          onClick={() => navigate({ to: "/unit/sp/transaksi" as any })}
        />
        <ModuleCard
          title="Kelola Pinjaman"
          description="Cek status, cicilan, dan piutang bunga"
          icon={<Wallet className="h-5 w-5" />}
          href="/unit/sp/pinjaman"
          onClick={() => navigate({ to: "/unit/sp/pinjaman" as any })}
        />
        <ModuleCard
          title="Kelola Simpanan"
          description="Lihat rekening simpanan anggota"
          icon={<PiggyBank className="h-5 w-5" />}
          href="/unit/sp/simpanan"
          onClick={() => navigate({ to: "/unit/sp/simpanan" as any })}
        />
        <ModuleCard
          title="Laporan Keuangan"
          description="Analisis kesehatan finansial unit"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/unit/sp/laporan"
          onClick={() => navigate({ to: "/unit/sp/laporan" as any })}
        />
        <ModuleCard
          title="Kelola Jurnal"
          description="Edit jurnal dan posting transaksi"
          icon={<FileText className="h-5 w-5" />}
          href="/unit/sp/jurnal"
          onClick={() => navigate({ to: "/unit/sp/jurnal" as any })}
        />
        <ModuleCard
          title="Transfer Modal"
          description="Lakukan transfer ke unit pusat"
          icon={<ArrowRightLeft className="h-5 w-5" />}
          href="/unit/sp/transfer"
          onClick={() => navigate({ to: "/unit/sp/transfer" as any })}
        />
      </div>
    </UnitLayout>
  );
}
