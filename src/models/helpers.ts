import { IRDI } from "./IRDI";

/**
 * Parsing helpers shared across entity types. Ported from the subset of
 * Cdd::ParseHelpers used by the entity accessors.
 */

export function parseIrdiList(raw: unknown): IRDI[] {
  if (!raw) return [];
  const s = String(raw).trim();
  if (!s) return [];
  return unwrapDelimiters(s)
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((part) => IRDI.parse(part))
    .filter((irdi): irdi is IRDI => irdi !== null);
}

function unwrapDelimiters(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}"))
    return trimmed.slice(1, -1);
  if (trimmed.startsWith("(") && trimmed.endsWith(")"))
    return trimmed.slice(1, -1);
  return trimmed;
}

export function parseStringList(raw: unknown): string[] {
  if (!raw) return [];
  const s = unwrapDelimiters(String(raw).trim());
  if (!s) return [];
  return s
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseIntegerList(raw: unknown): number[] | undefined {
  if (!raw) return undefined;
  let s = String(raw).trim();
  if (!s) return undefined;
  if (s.startsWith("(") && s.endsWith(")")) {
    s = s.slice(1, -1);
  }
  const parts = s
    .split(",")
    .map((x) => {
      const n = parseInt(x.trim(), 10);
      return Number.isNaN(n) ? null : n;
    })
    .filter((n): n is number => n !== null);
  return parts.length > 0 ? parts : undefined;
}
