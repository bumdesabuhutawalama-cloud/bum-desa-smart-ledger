import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUnit } from "@/lib/unit-context";
import { useNavigate } from "@tanstack/react-router";
import { UnitLayout } from "@/shared/layouts/UnitLayout";
import { StatCard, ModuleCard } from "@/shared/components/DashboardCards";
import { Briefcase, TrendingUp, BarChart3, Wallet, ArrowRightLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/unit/jasa/dashboard")({
  component: JasaDashboard,
});

function JasaDashboard() {
  const { currentUnitKode, setCurrentUnitKode, isConsolidating } = useUnit();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUnitKode !== "JASA" && !isConsolidating) {
      setCurrentUnitKode("JASA");
    }
  }, [currentUnitKode, setCurrentUnitKode, isConsolidating]);

  return (
    <UnitLayout
      title="Dashboard Unit Jasa"
      description="Kelola pendapatan jasa dan sewa disini"
      unitKode="JASA"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Pendapatan Jasa"
          value="15,250,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={Wallet}
          label="Kas & Bank"
          value="6,500,000"
          unit="IDR"
          variant="default"
        />
        <StatCard
          icon={BarChart3}
          label="Laba Bersih"
          value="4,825,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={FileText}
          label="Invoice Aktif"
          value="8"
          description="Belum lunas"
          variant="default"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Input Transaksi"
          description="Catat penjualan jasa dan biaya operasional"
          icon={<FileText className="h-5 w-5" />}
          href="/unit/jasa/transaksi"
          onClick={() => navigate({ to: "/unit/jasa/transaksi" as any })}
        />
        <ModuleCard
          title="Invoice Jasa"
          description="Kelola invoice dan piutang layanan"
          icon={<Briefcase className="h-5 w-5" />}
          href="/unit/jasa/penjualan"
          onClick={() => navigate({ to: "/unit/jasa/penjualan" as any })}
        />
        <ModuleCard
          title="Laporan Keuangan"
          description="Lihat laporan hingga laba rugi unit"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/unit/jasa/laporan"
          onClick={() => navigate({ to: "/unit/jasa/laporan" as any })}
        />
        <ModuleCard
          title="Kelola Jurnal"
          description="Edit dan validasi jurnal unit jasa"
          icon={<FileText className="h-5 w-5" />}
          href="/unit/jasa/jurnal"
          onClick={() => navigate({ to: "/unit/jasa/jurnal" as any })}
        />
        <ModuleCard
          title="Kas & Bank"
          description="Kelola transaksi kas dan solatran bank"
          icon={<Wallet className="h-5 w-5" />}
          href="/unit/jasa/kas-bank"
          onClick={() => navigate({ to: "/unit/jasa/kas-bank" as any })}
        />
        <ModuleCard
          title="Transfer Modal"
          description="Lakukan transfer antar unit usaha"
          icon={<ArrowRightLeft className="h-5 w-5" />}
          href="/unit/jasa/transfer"
          onClick={() => navigate({ to: "/unit/jasa/transfer" as any })}
        />
      </div>
    </UnitLayout>
  );
}
