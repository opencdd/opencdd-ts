/**
 * Minimal YAML emitter for the exporter pipeline.
 *
 * Handles the value shapes produced by JsonExporter.buildNodes:
 *   - arrays of records (top-level shape)
 *   - records with string / number / boolean / string-array leaves
 *
 * Not a general-purpose YAML implementation. External callers should use
 * a real library (js-yaml, yaml) for arbitrary structures.
 */

type Scalar = string | number | boolean | null;
type YamlRecord = Record<string, unknown>;

const RESERVED_FIRST_CHAR = /^[-?:,[\]{}#&*!|>'"%@`]/;
const BOOL_NULL_LIKE = /^(true|false|null|~|yes|no|on|off)$/i;
const NUMERIC_LIKE = /^-?\d/;
const TRAILING_COLON = /:$/;
const COLON_SPACE = /:\s/;
const HASH_AFTER_SPACE = /(^|\s)#/;

export function emitYaml(nodes: readonly YamlRecord[]): string {
  const lines: string[] = ["---"];
  for (const node of nodes) {
    lines.push(...emitRecord(node, 0, true));
  }
  return lines.join("\n") + "\n";
}

function emitRecord(
  record: YamlRecord,
  indent: number,
  asSequenceItem: boolean,
): string[] {
  const entries = Object.entries(record);
  if (entries.length === 0) return asSequenceItem ? ["{}"] : [];
  const prefix = " ".repeat(indent);
  const lines: string[] = [];
  let first = true;
  for (const [key, value] of entries) {
    const dash = asSequenceItem && first ? "- " : "  ";
    lines.push(`${prefix}${dash}${key}:${renderInlineAfterKey(value)}`);
    first = false;
    lines.push(...renderMultilineValue(value, indent + 2));
  }
  return lines;
}

function renderInlineAfterKey(value: unknown): string {
  if (value === null || value === undefined) return " null";
  if (typeof value === "string") return ` ${quoteString(value)}`;
  if (typeof value === "number" || typeof value === "boolean")
    return ` ${String(value)}`;
  return "";
}

function renderMultilineValue(value: unknown, childIndent: number): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    return value.flatMap((item) => {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        return emitRecord(item as YamlRecord, childIndent, true);
      }
      return [`${" ".repeat(childIndent)}- ${quoteScalar(item as Scalar)}`];
    });
  }
  if (value !== null && typeof value === "object") {
    return emitRecord(value as YamlRecord, childIndent, false);
  }
  return [];
}

function quoteString(s: string): string {
  return needsQuoting(s) ? JSON.stringify(s) : s;
}

function quoteScalar(s: Scalar): string {
  if (s === null) return "null";
  if (typeof s === "string") return quoteString(s);
  return String(s);
}

function needsQuoting(s: string): boolean {
  if (s.length === 0) return true;
  if (s.includes("\n")) return true;
  if (RESERVED_FIRST_CHAR.test(s)) return true;
  if (BOOL_NULL_LIKE.test(s)) return true;
  if (NUMERIC_LIKE.test(s)) return true;
  if (TRAILING_COLON.test(s) || COLON_SPACE.test(s)) return true;
  if (HASH_AFTER_SPACE.test(s)) return true;
  if (/^\s|\s$/.test(s)) return true;
  return false;
}
