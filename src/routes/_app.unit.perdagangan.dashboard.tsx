import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUnit } from "@/lib/unit-context";
import { useNavigate } from "@tanstack/react-router";
import { UnitLayout } from "@/shared/layouts/UnitLayout";
import { StatCard, ModuleCard } from "@/shared/components/DashboardCards";
import { ShoppingCart, TrendingUp, BarChart3, Wallet, ArrowRightLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/unit/perdagangan/dashboard")({
  component: PerdaganganDashboard,
});

function PerdaganganDashboard() {
  const { currentUnitKode, setCurrentUnitKode, isConsolidating } = useUnit();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUnitKode !== "DAGANG" && !isConsolidating) {
      setCurrentUnitKode("DAGANG");
    }
  }, [currentUnitKode, setCurrentUnitKode, isConsolidating]);

  return (
    <UnitLayout
      title="Dashboard Unit Perdagangan"
      description="Pantau penjualan dan persediaan toko disini"
      unitKode="DAGANG"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Total Penjualan"
          value="28,500,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={Wallet}
          label="Kas & Bank"
          value="8,750,000"
          unit="IDR"
          variant="default"
        />
        <StatCard
          icon={BarChart3}
          label="Laba Kotor"
          value="7,125,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={FileText}
          label="Transaksi Bulan Ini"
          value="102"
          description="Dokumen tercatat"
          variant="default"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Input Transaksi"
          description="Catat penjualan dan pembelian barang dagangan"
          icon={<FileText className="h-5 w-5" />}
          href="/unit/perdagangan/transaksi"
          onClick={() => navigate({ to: "/unit/perdagangan/transaksi" as any })}
        />
        <ModuleCard
          title="Kelola Persediaan"
          description="Lihat stok dan pindah lokasi barang"
          icon={<ShoppingCart className="h-5 w-5" />}
          href="/unit/perdagangan/persediaan"
          onClick={() => navigate({ to: "/unit/perdagangan/persediaan" as any })}
        />
        <ModuleCard
          title="Laporan Keuangan"
          description="Analisis neraca, laba rugi, dan arus kas"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/unit/perdagangan/laporan"
          onClick={() => navigate({ to: "/unit/perdagangan/laporan" as any })}
        />
        <ModuleCard
          title="Kelola Jurnal"
          description="Edit jurnal dan validasi posting"
          icon={<FileText className="h-5 w-5" />}
          href="/unit/perdagangan/jurnal"
          onClick={() => navigate({ to: "/unit/perdagangan/jurnal" as any })}
        />
        <ModuleCard
          title="Kas & Bank"
          description="Kelola transaksi kas dan bank unit"
          icon={<Wallet className="h-5 w-5" />}
          href="/unit/perdagangan/kas-bank"
          onClick={() => navigate({ to: "/unit/perdagangan/kas-bank" as any })}
        />
        <ModuleCard
          title="Transfer Modal"
          description="Lakukan transfer ke unit lain atau pusat"
          icon={<ArrowRightLeft className="h-5 w-5" />}
          href="/unit/perdagangan/transfer"
          onClick={() => navigate({ to: "/unit/perdagangan/transfer" as any })}
        />
      </div>
    </UnitLayout>
  );
}
