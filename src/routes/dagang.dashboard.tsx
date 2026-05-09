// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUnit } from "@/lib/unit-context";
import { useNavigate } from "@tanstack/react-router";
import { UnitLayout } from "@/shared/layouts/UnitLayout";
import { StatCard, ModuleCard } from "@/shared/components/DashboardCards";
import { ShoppingCart, TrendingUp, BarChart3, Wallet, ArrowRightLeft, FileText, Package, Receipt, Users } from "lucide-react";

export const Route = createFileRoute("/dagang/dashboard")({
  component: DagangDashboard,
});

function DagangDashboard() {
  const { currentUnitKode, setCurrentUnitKode, isConsolidating } = useUnit();
  const navigate = useNavigate();

  // Auto set unit ke DAGANG saat masuk dashboard
  useEffect(() => {
    if (currentUnitKode !== "DAGANG" && !isConsolidating) {
      setCurrentUnitKode("DAGANG");
    }
  }, [currentUnitKode, setCurrentUnitKode, isConsolidating]);

  return (
    <UnitLayout
      title="Dashboard Unit Perdagangan"
      description="Kelola toko, kios, dan usaha perdagangan BUM Desa"
      unitKode="DAGANG"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Penjualan Hari Ini"
          value="2,450,000"
          unit="IDR"
          variant="success"
        />
        <StatCard
          icon={Wallet}
          label="Kas Toko"
          value="1,250,000"
          unit="IDR"
          variant="default"
        />
        <StatCard
          icon={Package}
          label="Stok Barang"
          value="156"
          description="Item tersedia"
          variant="default"
        />
        <StatCard
          icon={Users}
          label="Pelanggan Aktif"
          value="89"
          description="Bulan ini"
          variant="default"
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Penjualan"
          description="Catat penjualan barang dagangan"
          icon={<Receipt className="h-5 w-5" />}
          href="/dagang/penjualan"
          onClick={() => navigate({ to: "/dagang/penjualan" })}
        />
        <ModuleCard
          title="Pembelian"
          description="Catat pembelian barang ke supplier"
          icon={<ShoppingCart className="h-5 w-5" />}
          href="/dagang/pembelian"
          onClick={() => navigate({ to: "/dagang/pembelian" })}
        />
        <ModuleCard
          title="Persediaan"
          description="Kelola stok dan inventori barang"
          icon={<Package className="h-5 w-5" />}
          href="/dagang/persediaan"
          onClick={() => navigate({ to: "/dagang/persediaan" })}
        />
        <ModuleCard
          title="Kas & Bank"
          description="Kelola transaksi kas dan bank toko"
          icon={<Wallet className="h-5 w-5" />}
          href="/dagang/kas-bank"
          onClick={() => navigate({ to: "/dagang/kas-bank" as any })}
        />
        <ModuleCard
          title="Jurnal"
          description="Kelola jurnal dan posting transaksi"
          icon={<FileText className="h-5 w-5" />}
          href="/dagang/jurnal"
          onClick={() => navigate({ to: "/dagang/jurnal" })}
        />
        <ModuleCard
          title="Laporan"
          description="Lihat laporan penjualan dan keuangan"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/dagang/laporan"
          onClick={() => navigate({ to: "/dagang/laporan" })}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Fitur Unit Perdagangan</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Manajemen penjualan dan pembelian</li>
            <li>• Kontrol persediaan barang</li>
            <li>• Pelacakan pelanggan dan supplier</li>
            <li>• Laporan penjualan harian/mingguan</li>
            <li>• Integrasi dengan sistem kasir</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">Aktivitas Hari Ini</h3>
          <div className="space-y-2 text-sm text-green-800">
            <p>• 12 transaksi penjualan tercatat</p>
            <p>• 3 pembelian baru dari supplier</p>
            <p>• 5 item stok perlu diisi ulang</p>
            <p>• Laporan harian siap untuk review</p>
          </div>
        </div>
      </div>
    </UnitLayout>
  );
}