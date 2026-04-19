import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
export const Route = createFileRoute("/_app/utang")({ component: () => (
  <div className="space-y-3"><h1 className="text-2xl font-bold">Utang</h1>
    <Card className="p-6 text-sm text-muted-foreground">Klasifikasi jangka pendek/panjang menyusul.</Card></div>
) });
