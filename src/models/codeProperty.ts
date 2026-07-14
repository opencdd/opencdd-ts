import * as Pids from "./PropertyIds.generated";

const CODE_PROPERTY_BY_META_CLASS: Readonly<Record<string, string>> = {
  MDC_C002: Pids.MDC_P001_5,
  MDC_C003: Pids.MDC_P001_6,
  MDC_C005: Pids.MDC_P001_12,
  MDC_C009: Pids.MDC_P001_10,
  MDC_C010: Pids.MDC_P001_11,
  MDC_C011: Pids.MDC_P001_13,
  EXT_C001: Pids.EXT_P001,
};

export const CODE_PROPERTY_CANDIDATES: readonly string[] = [
  ...Object.values(CODE_PROPERTY_BY_META_CLASS),
  Pids.MDC_P001,
];

export function codePropertyIdFor(
  metaClassIrdi: string | null | undefined,
): string | undefined {
  if (!metaClassIrdi) return undefined;
  return CODE_PROPERTY_BY_META_CLASS[metaClassIrdi];
}
