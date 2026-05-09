import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUnit } from "@/lib/unit-context";
import { useNavigate } from "@tanstack/react-router";
import { UnitLayout } from "@/shared/layouts/UnitLayout";
import { StatCard, ModuleCard } from "@/shared/components/DashboardCards";
import { Leaf, TrendingUp, BarChart3, Wallet, ArrowRightLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/unit/pangan/dashboard")({
  component: PanganDashboard,
});

function PanganDashboard() {
  const { currentUnitKode, setCurrentUnitKode, isConsolidating } = useUnit();
  const navigate = useNavigate();

  // Otomatis set unit ke PANGAN saat masuk halaman ini
  useEffect(() => {
    if (currentUnitKode !== "PANGAN" && !isConsolidating) {
      setCurrentUnitKode("PANGAN");
    }
  }, [currentUnitKode, setCurrentUnitKode, isConsolidating]);

  return (
    <UnitLayout
      title="Dashboard Unit Ketahanan Pangan"
      description="Pantau kinerja finansial unit pangan disini"
      unitKode="PANGAN"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Total Penjualan"
          value="12,500,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={Wallet}
          label="Kas & Bank"
          value="5,250,000"
          unit="IDR"
          variant="default"
        />
        <StatCard
          icon={BarChart3}
          label="Laba Kotor"
          value="3,125,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={FileText}
          label="Transaksi Bulan Ini"
          value="45"
          description="Dokumen tercatat"
          variant="default"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Input Transaksi"
          description="Catat penjualan, pembelian, dan transaksi lainnya"
          icon={<FileText className="h-5 w-5" />}
          href="/unit/pangan/transaksi"
          onClick={() => navigate({ to: "/unit/pangan/transaksi" })}
        />
        <ModuleCard
          title="Kelola Persediaan"
          description="Gunakan dan catat persediaan pangan"
          icon={<Leaf className="h-5 w-5" />}
          href="/unit/pangan/persediaan"
          onClick={() => navigate({ to: "/unit/pangan/persediaan" })}
        />
        <ModuleCard
          title="Laporan Keuangan"
          description="Lihat neraca, laba rugi, dan laporan lainnya"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/unit/pangan/laporan"
          onClick={() => navigate({ to: "/unit/pangan/laporan" })}
        />
        <ModuleCard
          title="Kelola Jurnal"
          description="Edit jurnal dan lihat posting transaksi"
          icon={<FileText className="h-5 w-5" />}
          href="/unit/pangan/jurnal"
          onClick={() => navigate({ to: "/unit/pangan/jurnal" })}
        />
        <ModuleCard
          title="Kas & Bank"
          description="Kelola kas masuk dan kas keluar unit"
          icon={<Wallet className="h-5 w-5" />}
          href="/unit/pangan/kas-bank"
          onClick={() => navigate({ to: "/unit/pangan/kas-bank" })}
        />
        <ModuleCard
          title="Transfer Antar Unit"
          description="Lakukan transfer atau distribusi modal"
          icon={<ArrowRightLeft className="h-5 w-5" />}
          href="/unit/pangan/transfer"
          onClick={() => navigate({ to: "/unit/pangan/transfer" })}
        />
      </div>
    </UnitLayout>
  );
}
