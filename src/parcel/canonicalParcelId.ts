const PARCEL_VARIANT_TO_CANONICAL: Readonly<Record<string, string>> = {
  MDC_P004_1: "MDC_P004",
  MDC_P004_2: "MDC_P007",
  MDC_P004_3: "MDC_P005",
  MDC_P005: "MDC_P006",
  MDC_P007_1: "MDC_P008",
  MDC_P007_2: "MDC_P009",
};

export function canonicalParcelId(
  rawId: string | null | undefined,
): string | null {
  if (rawId === null || rawId === undefined) return null;
  const s = String(rawId).trim();
  if (s.length === 0) return null;
  const m = s.match(/\.(?<lang>[A-Za-z0-9-]+)$/);
  const base = m ? s.slice(0, s.length - m[0].length) : s;
  const lang = m?.[1];
  const canonical = PARCEL_VARIANT_TO_CANONICAL[base] ?? base;
  return lang ? `${canonical}.${lang}` : canonical;
}
