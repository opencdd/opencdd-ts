/**
 * YamlEntity — semantic CDD YAML model for one entity.
 *
 * Ported from Ruby's Opencdd::Entity::Yaml (lib/opencdd/entity/yaml.rb).
 * Uses CDD-native attribute names (preferred_name, superclass,
 * class_type) — NOT wire-format keys (MDC_P004, MDC_P010). Multilingual
 * fields are nested {lang: text} hashes; sets are arrays. Unknown
 * properties fall through to `extra` for lossless round-trip.
 *
 * Architecture: extraction and population are fully driven by the
 * FieldRegistry (src/models/FieldRegistry.ts). Each value kind has a
 * pair of generic extractors/populators. Adding a new field = adding
 * a FieldSpec entry — no edits to this file. Adding a new entity type
 * = adding fieldsForType entry. No switch statements (OCP/MECE).
 */

import { Entity } from "../models/Entity";
import { IRDI } from "../models/IRDI";
import { ENTITY_CONSTRUCTORS } from "../models/entityConstructors";
import {
  FIELDS,
  fieldsForType,
  type FieldSpec,
  type FieldValueKind,
} from "../models/FieldRegistry";
import type { EntityType } from "../models/MetaClasses.generated";

export interface YamlEntityData {
  irdi: string | null;
  type: string | null;
  code: string | null;
  [field: string]: unknown;
}

const TYPE_TO_META_CLASS: Readonly<Record<string, string>> = {
  class: "MDC_C002",
  property: "MDC_C003",
  value_list: "MDC_C005",
  unit: "MDC_C009",
  value_term: "MDC_C010",
  relation: "MDC_C011",
  view_control: "EXT_C001",
  list_of_unit: "MDC_C0100",
  det_classification: "MDC_C0101",
};

const KIND_EXTRACTORS: Readonly<
  Record<FieldValueKind, (entity: Entity, spec: FieldSpec) => unknown>
> = {
  string: extractRawString,
  ml_string: extractMl,
  irdi: extractRawString,
  set_of_refs: extractSetOfRefs,
  class_ref: extractRawString,
  condition: extractRawString,
  data_type: extractRawString,
  value_format: extractRawString,
  class_type: extractRawString,
  relation_type: extractRawString,
  integer: extractRawString,
  boolean: extractRawString,
};

const KIND_POPULATORS: Readonly<
  Record<
    FieldValueKind,
    (props: Record<string, unknown>, spec: FieldSpec, value: unknown) => void
  >
> = {
  string: populateRawString,
  ml_string: populateMl,
  irdi: populateRawString,
  set_of_refs: populateSetOfRefs,
  class_ref: populateRawString,
  condition: populateRawString,
  data_type: populateRawString,
  value_format: populateRawString,
  class_type: populateRawString,
  relation_type: populateRawString,
  integer: populateRawString,
  boolean: populateRawString,
};

export function yamlEntityFromEntity(entity: Entity): YamlEntityData {
  const data: YamlEntityData = {
    irdi: entity.irdi?.toString() ?? null,
    type: entity.type ?? null,
    code: entity.code ?? null,
  };
  if (!entity.type) return data;

  for (const spec of fieldsForType(entity.type)) {
    const extract = KIND_EXTRACTORS[spec.valueKind];
    const value = extract(entity, spec);
    if (
      value !== undefined &&
      value !== null &&
      // Empty arrays are meaningful for set_of_refs (present-but-empty
      // set); for every other kind they carry nothing.
      !(
        Array.isArray(value) &&
        value.length === 0 &&
        spec.valueKind !== "set_of_refs"
      ) &&
      !(
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0
      )
    ) {
      data[spec.name] = value;
    }
  }

  const extra = extractExtra(entity, entity.type ?? "class");
  if (extra) data.extra = extra;

  return data;
}

export function entityFromYamlEntity(data: YamlEntityData): Entity {
  const props: Record<string, unknown> = {};
  const type = (data.type ?? "class") as EntityType;

  for (const [yamlKey, yamlValue] of Object.entries(data)) {
    if (
      yamlKey === "irdi" ||
      yamlKey === "type" ||
      yamlKey === "code" ||
      yamlKey === "extra"
    )
      continue;
    const spec = findFieldByYamlName(type, yamlKey);
    if (!spec) continue;
    const populate = KIND_POPULATORS[spec.valueKind];
    populate(props, spec, yamlValue);
  }

  if (data.extra) {
    for (const [k, v] of Object.entries(data.extra)) props[k] = v;
  }

  const ctor = ENTITY_CONSTRUCTORS[type] ?? ENTITY_CONSTRUCTORS.MDC_C002;
  const metaIrdi = TYPE_TO_META_CLASS[type] ?? "MDC_C002";
  const irdi = data.irdi ? IRDI.parse(data.irdi) : null;
  return new ctor(irdi, props, metaIrdi);
}

function findFieldByYamlName(
  type: EntityType,
  name: string,
): FieldSpec | undefined {
  for (const spec of fieldsForType(type)) {
    if (spec.name === name) return spec;
  }
  return undefined;
}

function extractRawString(entity: Entity, spec: FieldSpec): string | undefined {
  const raw = entity.get<unknown>(spec.propertyId);
  if (raw === undefined || raw === null) return undefined;
  return String(raw);
}

function extractMl(
  entity: Entity,
  spec: FieldSpec,
): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  const prefix = `${spec.propertyId}.`;
  entity.eachProperty((key, value) => {
    if (!key.startsWith(prefix)) return;
    const lang = key.slice(prefix.length);
    if (value !== undefined && value !== null) result[lang] = String(value);
  });
  return Object.keys(result).length > 0 ? result : undefined;
}

function extractSetOfRefs(
  entity: Entity,
  spec: FieldSpec,
): string[] | string | undefined {
  // Read the raw wire string, not entity.get() — the field reader
  // coerces set_of_refs to an already-parsed array, which erases the
  // inner whitespace this extractor exists to preserve.
  const raw = entity.properties.get(spec.propertyId);
  if (raw === undefined || raw === null) return undefined;
  const rawStr = String(raw);
  if (rawStr.trim() === "") return undefined;
  // Lossless split: element whitespace is preserved so that
  // populateSetOfRefs reproduces the source wire string byte-for-byte
  // (IEC data carries stray inner spaces, e.g. "{A,STAYPUT ,B}" —
  // trim here and the round-trip silently rewrites IEC data).
  const elements = splitTopLevelLossless(rawStr);
  // Present-but-empty sets ("()", "{}") carry meaning in the wire
  // data; emit an empty array (a bare "{}"/"()" scalar would be
  // reparsed as a YAML flow collection). finalize() canonicalizes the
  // restored parens form, so both sides converge.
  if (elements.length === 0) return [];
  return elements;
}

function splitTopLevelLossless(value: string): string[] {
  let s = value.trim();
  if (
    (s.startsWith("{") && s.endsWith("}")) ||
    (s.startsWith("(") && s.endsWith(")"))
  ) {
    s = s.slice(1, -1);
  }
  const out: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of s) {
    if (ch === "{" || ch === "(") depth += 1;
    if (ch === "}" || ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || out.length > 0) out.push(current);
  return out;
}

function populateRawString(
  props: Record<string, unknown>,
  spec: FieldSpec,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  props[spec.propertyId] = String(value);
}

function populateMl(
  props: Record<string, unknown>,
  spec: FieldSpec,
  value: unknown,
): void {
  // Plain string → default to source language (en). Some JSON shapes
  // (oceanrunner) carry ml fields as bare strings rather than {lang: text}
  // hashes. Accept both.
  if (typeof value === "string") {
    if (value.length > 0) props[`${spec.propertyId}.en`] = value;
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [lang, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined && v !== null)
      props[`${spec.propertyId}.${lang}`] = String(v);
  }
}

function populateSetOfRefs(
  props: Record<string, unknown>,
  spec: FieldSpec,
  value: unknown,
): void {
  // Quoted raw literal (interop with hand-written YAML).
  if (typeof value === "string") {
    props[spec.propertyId] = value;
    return;
  }
  if (!Array.isArray(value)) return;
  // Empty array = present-but-empty set; finalize() canonicalizes the
  // parens form to braces, matching the linker's normalization.
  props[spec.propertyId] =
    value.length === 0 ? "()" : "{" + value.map(String).join(",") + "}";
}

const KNOWN_WIRE_BASES_BY_TYPE: Readonly<
  Record<EntityType, ReadonlySet<string>>
> = computeKnownWireBasesByType();

function computeKnownWireBasesByType(): Readonly<
  Record<EntityType, ReadonlySet<string>>
> {
  const out: Record<string, Set<string>> = {};
  for (const [type, fields] of Object.entries(FIELDS)) {
    const set = new Set<string>();
    for (const spec of fields) set.add(spec.propertyId);
    out[type] = set;
  }
  return Object.freeze(out) as Readonly<
    Record<EntityType, ReadonlySet<string>>
  >;
}

function extractExtra(
  entity: Entity,
  type: EntityType,
): Record<string, unknown> | undefined {
  const extra: Record<string, unknown> = {};
  const known = KNOWN_WIRE_BASES_BY_TYPE[type] ?? new Set<string>();
  entity.eachProperty((key, value) => {
    if (key === "__row_index__") return;
    const base = key.split(".", 1)[0];
    if (known.has(base)) return;
    extra[key] = value;
  });
  return Object.keys(extra).length > 0 ? extra : undefined;
}
