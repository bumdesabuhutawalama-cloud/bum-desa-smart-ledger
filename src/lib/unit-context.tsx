import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UnitModule, getUnitByKode as getUnitModuleByKode } from "./unit-modules";
import { useAuth } from "./auth-context";

export type BusinessUnit = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  is_active: boolean;
  is_default: boolean;
  is_head_office?: boolean;
};

type Ctx = {
  units: BusinessUnit[];
  defaultUnit: BusinessUnit | null;
  currentUnitId: string;
  currentUnitKode: string | null;
  setCurrentUnitId: (id: string) => void;
  setCurrentUnitKode: (kode: string) => void;
  getUnitById(id: string): BusinessUnit | null;
  getUnitByKode(kode: string): BusinessUnit | null;
  getUnitModule(kode: string): UnitModule | null;
  resolveWriteUnitId: () => string | null;
  isConsolidating: boolean;
  /** True jika user terkunci di satu unit (bukan super admin). */
  isLocked: boolean;
  loading: boolean;
  reload: () => Promise<void>;
};

const UnitContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "bumdes:active_unit";
const STORAGE_UNIT_KODE_KEY = "bumdes:active_unit_kode";

export function UnitProvider({ children }: { children: ReactNode }) {
  const { userUnit, isSuperAdmin } = useAuth();
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUnitId, setCurrentUnitIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "ALL";
    return localStorage.getItem(STORAGE_KEY) ?? "ALL";
  });
  const [currentUnitKode, setCurrentUnitKodeState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_UNIT_KODE_KEY) ?? null;
  });

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("business_units")
      .select("id, kode, nama, jenis, is_active, is_default, is_head_office")
      .order("is_default", { ascending: false })
      .order("nama");
    setUnits((data ?? []) as BusinessUnit[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Lock untuk non-super-admin
  useEffect(() => {
    if (!userUnit) return;
    if (!isSuperAdmin && userUnit.business_unit_id) {
      setCurrentUnitIdState(userUnit.business_unit_id);
      setCurrentUnitKodeState(userUnit.unit_kode ?? null);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, userUnit.business_unit_id);
        if (userUnit.unit_kode) localStorage.setItem(STORAGE_UNIT_KODE_KEY, userUnit.unit_kode);
      }
    }
  }, [userUnit, isSuperAdmin]);

  const setCurrentUnitId = (id: string) => {
    if (!isSuperAdmin && userUnit?.business_unit_id && id !== userUnit.business_unit_id) {
      return; // reject untuk user terkunci
    }
    setCurrentUnitIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  };

  const setCurrentUnitKode = (kode: string) => {
    const unit = units.find((u) => u.kode === kode);
    if (!isSuperAdmin && userUnit?.unit_kode && kode !== userUnit.unit_kode) return;
    setCurrentUnitKodeState(kode);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_UNIT_KODE_KEY, kode);
    if (unit) setCurrentUnitId(unit.id);
  };

  const defaultUnit = useMemo(() => units.find((u) => u.is_default) ?? null, [units]);
  const isConsolidating = useMemo(() => currentUnitId === "ALL", [currentUnitId]);
  const isLocked = !isSuperAdmin && !!userUnit?.business_unit_id;

  const getUnitById = (id: string): BusinessUnit | null => units.find((u) => u.id === id) ?? null;
  const getUnitByKode = (kode: string): BusinessUnit | null => units.find((u) => u.kode === kode) ?? null;
  const getUnitModule = (kode: string): UnitModule | null => getUnitModuleByKode(kode as any);

  const resolveWriteUnitId = () => {
    if (currentUnitId !== "ALL") return currentUnitId;
    return defaultUnit?.id ?? null;
  };

  const value: Ctx = {
    units, defaultUnit, currentUnitId, currentUnitKode,
    setCurrentUnitId, setCurrentUnitKode,
    getUnitById, getUnitByKode, getUnitModule, resolveWriteUnitId,
    isConsolidating, isLocked, loading, reload: load,
  };

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export function useUnit() {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error("useUnit must be used inside UnitProvider");
  return ctx;
}

// Legacy compatibility
export function useBusinessUnit() {
  return useUnit();
}
