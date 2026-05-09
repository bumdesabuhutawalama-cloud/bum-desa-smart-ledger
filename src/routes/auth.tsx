import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Leaf, Briefcase, PiggyBank, Building2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: UnitSelection,
});

function UnitSelection() {
  const nav = useNavigate();

  const units = [
    {
      id: "dagang",
      name: "Unit Perdagangan",
      description: "Toko, kios, dan usaha perdagangan BUM Desa",
      icon: ShoppingCart,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-900",
      loginPath: "/dagang/login"
    },
    {
      id: "pangan",
      name: "Unit Ketahanan Pangan",
      description: "Pengelolaan pertanian, pangan, dan ketahanan pangan desa",
      icon: Leaf,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-900",
      loginPath: "/pangan/login"
    },
    {
      id: "jasa",
      name: "Unit Jasa",
      description: "Layanan jasa dan sewa alat/gedung BUM Desa",
      icon: Briefcase,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-900",
      loginPath: "/jasa/login"
    },
    {
      id: "sp",
      name: "Unit Simpan Pinjam",
      description: "Layanan simpanan dan pinjaman masyarakat",
      icon: PiggyBank,
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-900",
      loginPath: "/sp/login"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            BUM Desa Smart Ledger
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Sistem Keuangan Terintegrasi BUM Desa — Pilih Unit Usaha Anda
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {units.map((unit) => {
            const Icon = unit.icon;
            return (
              <Card
                key={unit.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${unit.bgColor} ${unit.borderColor} border-2`}
                onClick={() => nav({ to: unit.loginPath })}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto mb-4 h-12 w-12 rounded-lg ${unit.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className={`text-xl ${unit.textColor}`}>
                    {unit.name}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {unit.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    className={`w-full ${unit.color} hover:opacity-90`}
                    onClick={(e) => {
                      e.stopPropagation();
                      nav({ to: unit.loginPath });
                    }}
                  >
                    Masuk ke {unit.name}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Sistem ERP Multi-Unit
            </h3>
            <p className="text-slate-600 text-sm">
              Setiap unit memiliki dashboard, transaksi, dan laporan terpisah namun tetap terintegrasi
              dalam satu sistem keuangan BUM Desa yang komprehensif.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
