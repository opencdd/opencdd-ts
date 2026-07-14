/**
 * Shared helpers for validator rules. Kept here (not in models/) because
 * these predicates encode "what counts as empty for validation purposes"
 * — a rule-layer concern, not a model-layer one.
 */

export function isEmpty(value: unknown): boolean {
  return (
    value === null || value === undefined || String(value).trim().length === 0
  );
}

export function isBlank(value: unknown): boolean {
  return isEmpty(value);
}

/**
 * Mirrors Ruby's `Object#inspect` for the value kinds validator rules
 * receive. Ruby emits `nil` for null and double-quotes strings;
 * `JSON.stringify` matches the string form but emits `"null"` for null
 * and returns the bare value `undefined` for undefined. Using this helper
 * keeps violation messages byte-for-byte identical to the Ruby gem.
 */
export function rubyInspect(value: unknown): string {
  if (value === null || value === undefined) return "nil";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}
