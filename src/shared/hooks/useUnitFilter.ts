import { useMemo } from "react";
import { useUnit } from "@/lib/unit-context";

/**
 * Hook untuk otomatis filter query berdasarkan unit aktif
 * Gunakan di setiap query untuk memastikan data per-unit terfilter otomatis
 */
export function useUnitFilter() {
  const { currentUnitId, isConsolidating } = useUnit();

  const unitIdFilter = useMemo(() => {
    if (isConsolidating) return null; // ALL units (no filter)
    return currentUnitId;
  }, [currentUnitId, isConsolidating]);

  return {
    unitIdFilter,
    isConsolidating,
    hasFilter: unitIdFilter !== null,
  };
}

/**
 * Helper untuk menambahkan filter WHERE ke Supabase query
 * @example
 * const { whereUnit } = useUnitQueryFilter();
 * supabase.from('journals').select('*').match({ ...whereUnit() })
 */
export function useUnitQueryFilter() {
  const { currentUnitId, isConsolidating } = useUnit();

  const whereUnit = () => {
    if (isConsolidating) return {};
    return { business_unit_id: currentUnitId };
  };

  return { whereUnit, isConsolidating };
}
