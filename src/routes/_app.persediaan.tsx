import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
export const Route = createFileRoute("/_app/persediaan")({ component: () => (
  <div className="space-y-3"><h1 className="text-2xl font-bold">Persediaan</h1>
    <Card className="p-6 text-sm text-muted-foreground">Stok masuk/keluar dengan penilaian terendah antara harga perolehan & jual menyusul.</Card></div>
) });
