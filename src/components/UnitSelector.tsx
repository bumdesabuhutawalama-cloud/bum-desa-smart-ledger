import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnit } from "@/lib/unit-context";
import { Store } from "lucide-react";

export function UnitSelector({ className = "" }: { className?: string }) {
  const { units, currentUnitId, setCurrentUnitId, loading } = useUnit();
  const active = units.filter((u) => u.is_active);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select value={currentUnitId} onValueChange={setCurrentUnitId} disabled={loading}>
        <SelectTrigger className="h-9 w-[220px]">
          <SelectValue placeholder="Pilih unit usaha…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Semua Unit (Konsolidasi)</SelectItem>
          {active.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.kode} — {u.nama}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
