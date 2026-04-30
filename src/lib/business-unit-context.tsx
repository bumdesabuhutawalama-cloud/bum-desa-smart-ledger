import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BusinessUnit = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  is_active: boolean;
  is_default: boolean;
};

type Ctx = {
  units: BusinessUnit[];
  defaultUnit: BusinessUnit | null;
  /** "ALL" = konsolidasi (semua unit). Selain itu = id unit. */
  currentUnitId: string;
  setCurrentUnitId: (id: string) => void;
  /** Helper: id unit aktif untuk pengisian form (jika ALL → default unit). */
  resolveWriteUnitId: () => string | null;
  loading: boolean;
  reload: () => Promise<void>;
};

const BusinessUnitContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "bumdes:active_unit";

export function BusinessUnitProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUnitId, setCurrentUnitIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "ALL";
    return localStorage.getItem(STORAGE_KEY) ?? "ALL";
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

  const defaultUnit = useMemo(() => units.find((u) => u.is_default) ?? null, [units]);

  const resolveWriteUnitId = () => {
    if (currentUnitId !== "ALL") return currentUnitId;
    return defaultUnit?.id ?? null;
  };

  const value: Ctx = {
    units,
    defaultUnit,
    currentUnitId,
    setCurrentUnitId,
    resolveWriteUnitId,
    loading,
    reload: load,
  };

  return <BusinessUnitContext.Provider value={value}>{children}</BusinessUnitContext.Provider>;
}

export function useBusinessUnit() {
  const ctx = useContext(BusinessUnitContext);
  if (!ctx) throw new Error("useBusinessUnit must be used inside BusinessUnitProvider");
  return ctx;
}
