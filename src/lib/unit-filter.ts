// Helper untuk meng-chain filter business_unit_id pada query Supabase.
// Pakai "ALL" untuk skip filter (mode konsolidasi).
export function applyUnitFilter<T extends { eq: (col: string, v: any) => T }>(
  query: T,
  unitId: string,
  column = "business_unit_id",
): T {
  if (!unitId || unitId === "ALL") return query;
  return query.eq(column, unitId);
}
