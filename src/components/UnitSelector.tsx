import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnit } from "@/lib/unit-context";
import { useAuth } from "@/lib/auth-context";
import { Store, Lock } from "lucide-react";

export function UnitSelector({ className = "" }: { className?: string }) {
  const { units, currentUnitId, setCurrentUnitId, loading, isLocked } = useUnit();
  const { isSuperAdmin, userUnit } = useAuth();
  const active = units.filter((u) => u.is_active);

  // User terkunci: tampilkan label statis
  if (isLocked || !isSuperAdmin) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Lock className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          {userUnit?.unit_nama ?? "Unit Anda"}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select value={currentUnitId} onValueChange={setCurrentUnitId} disabled={loading}>
        <SelectTrigger className="h-9 w-[260px]">
          <SelectValue placeholder="Pilih unit usaha…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Konsolidasi Semua Unit</SelectItem>
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
