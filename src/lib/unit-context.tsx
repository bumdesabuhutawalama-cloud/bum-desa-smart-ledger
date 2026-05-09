import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UnitModule, getUnitByKode } from "./unit-modules";

export type BusinessUnit = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  is_active: boolean;
  is_default: boolean;
};

type Ctx = {
  // Data
  units: BusinessUnit[];
  defaultUnit: BusinessUnit | null;
  
  // Current unit state
  currentUnitId: string;
  currentUnitKode: string | null;
  setCurrentUnitId: (id: string) => void;
  setCurrentUnitKode: (kode: string) => void;
  
  // Helpers
  getUnitById(id: string): BusinessUnit | null;
  getUnitByKode(kode: string): BusinessUnit | null;
  getUnitModule(kode: string): UnitModule | null;
  resolveWriteUnitId: () => string | null;
  isConsolidating: boolean;
  
  // Utils
  loading: boolean;
  reload: () => Promise<void>;
};

const UnitContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "bumdes:active_unit";
const STORAGE_UNIT_KODE_KEY = "bumdes:active_unit_kode";

export function UnitProvider({ children }: { children: ReactNode }) {
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
      .select("id, kode, nama, jenis, is_active, is_default")
      .order("is_default", { ascending: false })
      .order("nama");
    setUnits((data ?? []) as BusinessUnit[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setCurrentUnitId = (id: string) => {
    setCurrentUnitIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  };

  const setCurrentUnitKode = (kode: string) => {
    setCurrentUnitKodeState(kode);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_UNIT_KODE_KEY, kode);
    
    // Auto set current unit id
    const unit = units.find((u) => u.kode === kode);
    if (unit) setCurrentUnitId(unit.id);
  };

  const defaultUnit = useMemo(() => units.find((u) => u.is_default) ?? null, [units]);
  const isConsolidating = useMemo(() => currentUnitId === "ALL", [currentUnitId]);

  const getUnitById = (id: string): BusinessUnit | null => {
    return units.find((u) => u.id === id) ?? null;
  };

  const getUnitByKode = (kode: string): BusinessUnit | null => {
    return units.find((u) => u.kode === kode) ?? null;
  };

  const getUnitModule = (kode: string): UnitModule | null => {
    return getUnitByKode(kode as any);
  };

  const resolveWriteUnitId = () => {
    if (currentUnitId !== "ALL") return currentUnitId;
    return defaultUnit?.id ?? null;
  };

  const value: Ctx = {
    units,
    defaultUnit,
    currentUnitId,
    currentUnitKode,
    setCurrentUnitId,
    setCurrentUnitKode,
    getUnitById,
    getUnitByKode,
    getUnitModule,
    resolveWriteUnitId,
    isConsolidating,
    loading,
    reload: load,
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
