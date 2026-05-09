// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUnit } from "@/lib/unit-context";
import { useNavigate } from "@tanstack/react-router";
import { UnitLayout } from "@/shared/layouts/UnitLayout";
import { StatCard, ModuleCard } from "@/shared/components/DashboardCards";
import { Leaf, TrendingUp, BarChart3, Wallet, ArrowRightLeft, FileText, Package, Receipt, Users } from "lucide-react";

export const Route = createFileRoute("/pangan/dashboard")({
  component: PanganDashboard,
});

function PanganDashboard() {
  const { currentUnitKode, setCurrentUnitKode, isConsolidating } = useUnit();
  const navigate = useNavigate();

  // Auto set unit ke PANGAN saat masuk dashboard
  useEffect(() => {
    if (currentUnitKode !== "PANGAN" && !isConsolidating) {
      setCurrentUnitKode("PANGAN");
    }
  }, [currentUnitKode, setCurrentUnitKode, isConsolidating]);

  return (
    <UnitLayout
      title="Dashboard Unit Ketahanan Pangan"
      description="Kelola pertanian, pangan, dan ketahanan pangan desa"
      unitKode="PANGAN"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Penjualan Pangan"
          value="1,850,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={Wallet}
          label="Kas Unit"
          value="950,000"
          unit="IDR"
          variant="default"
        />
        <StatCard
          icon={Package}
          label="Stok Pangan"
          value="234"
          description="Item tersedia"
          variant="default"
        />
        <StatCard
          icon={Users}
          label="Petani Mitra"
          value="45"
          description="Aktif bulan ini"
          variant="default"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Penjualan Pangan"
          description="Catat penjualan hasil pertanian"
          icon={<Receipt className="h-5 w-5" />}
          href="/pangan/penjualan"
          onClick={() => navigate({ to: "/pangan/penjualan" })}
        />
        <ModuleCard
          title="Pembelian Bahan"
          description="Catat pembelian bibit dan bahan pertanian"
          icon={<Leaf className="h-5 w-5" />}
          href="/pangan/pembelian"
          onClick={() => navigate({ to: "/pangan/pembelian" })}
        />
        <ModuleCard
          title="Persediaan"
          description="Kelola stok pangan dan bahan baku"
          icon={<Package className="h-5 w-5" />}
          href="/pangan/persediaan"
          onClick={() => navigate({ to: "/pangan/persediaan" })}
        />
        <ModuleCard
          title="Kas & Bank"
          description="Kelola transaksi kas dan bank unit"
          icon={<Wallet className="h-5 w-5" />}
          href="/pangan/kas-bank"
          onClick={() => navigate({ to: "/pangan/kas-bank" })}
        />
        <ModuleCard
          title="Jurnal"
          description="Kelola jurnal dan posting transaksi"
          icon={<FileText className="h-5 w-5" />}
          href="/pangan/jurnal"
          onClick={() => navigate({ to: "/pangan/jurnal" })}
        />
        <ModuleCard
          title="Laporan"
          description="Lihat laporan pertanian dan keuangan"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/pangan/laporan"
          onClick={() => navigate({ to: "/pangan/laporan" })}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">Fitur Unit Ketahanan Pangan</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Manajemen hasil pertanian</li>
            <li>• Kontrol stok pangan pokok</li>
            <li>• Pelacakan petani mitra</li>
            <li>• Laporan ketahanan pangan</li>
            <li>• Integrasi dengan program desa</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">Aktivitas Hari Ini</h3>
          <div className="space-y-2 text-sm text-amber-800">
            <p>• 8 ton beras tersedia di gudang</p>
            <p>• 15 petani telah menyetor hasil panen</p>
            <p>• 3 jenis bibit perlu diisi ulang</p>
            <p>• Laporan bulanan siap untuk review</p>
          </div>
        </div>
      </div>
    </UnitLayout>
  );
}