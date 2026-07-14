/**
 * FieldRegistry — declarative metadata for CDD entity fields.
 *
 * One source of truth for "what semantic name maps to which wire-format
 * property ID, with which value kind." Without this, every Entity
 * subclass hardcodes the mapping in its own getters; adding a new
 * field means finding every place that references the wire ID.
 *
 * Ported from Ruby's Entity::FieldRegistry concept (TODO.impl/26).
 *
 * Consumers:
 *   - Entity.field(name, lang) — generic typed reader
 *   - YamlEntity — bidirectional YAML ↔ wire mapping
 *   - DatabaseSerializer — alias lookup for output
 *   - Validators — value-kind dispatch
 *
 * Field value kinds (the `valueKind` discriminator):
 *
 *   - "string"      — plain string value
 *   - "ml_string"   — multilingual; stored as `<pid>.<lang>`
 *   - "irdi"        — single IRDI reference
 *   - "set_of_refs" — `{irdi,irdi,...}` collection
 *   - "class_ref"   — `CLASS_REFERENCE(...)` reference
 *   - "condition"   — Condition expression
 *   - "data_type"   — DataType value (parsed)
 *   - "value_format"— ValueFormat code
 *   - "class_type"  — ClassType value
 *   - "relation_type" — RelationType value
 *   - "integer"     — numeric value stored as string
 *   - "boolean"     — boolean stored as string
 *
 * Adding a new kind = adding a variant + dispatch in the relevant
 * consumer. MECE — each kind lives in exactly one place.
 */

import type { EntityType } from "./MetaClasses.generated";

export type FieldValueKind =
  | "string"
  | "ml_string"
  | "irdi"
  | "set_of_refs"
  | "class_ref"
  | "condition"
  | "data_type"
  | "value_format"
  | "class_type"
  | "relation_type"
  | "integer"
  | "boolean";

export interface FieldSpec {
  readonly name: string;
  readonly propertyId: string;
  readonly valueKind: FieldValueKind;
}

type FieldTable = readonly FieldSpec[];

const COMMON_FIELDS: FieldTable = [
  { name: "guid", propertyId: "MDC_P066", valueKind: "string" },
  { name: "version", propertyId: "MDC_P002_1", valueKind: "string" },
  { name: "revision", propertyId: "MDC_P002_2", valueKind: "string" },
  {
    name: "original_definition_date",
    propertyId: "MDC_P003_1",
    valueKind: "string",
  },
  {
    name: "current_version_date",
    propertyId: "MDC_P003_2",
    valueKind: "string",
  },
  {
    name: "current_revision_date",
    propertyId: "MDC_P003_3",
    valueKind: "string",
  },
  { name: "preferred_name", propertyId: "MDC_P004", valueKind: "ml_string" },
  { name: "short_name", propertyId: "MDC_P005", valueKind: "ml_string" },
  { name: "definition", propertyId: "MDC_P006", valueKind: "ml_string" },
  { name: "note", propertyId: "MDC_P008", valueKind: "ml_string" },
  { name: "remark", propertyId: "MDC_P009", valueKind: "ml_string" },
  { name: "description", propertyId: "MDC_P112", valueKind: "ml_string" },
];

const CLASS_FIELDS: FieldTable = [
  { name: "class_type", propertyId: "MDC_P011", valueKind: "class_type" },
  { name: "superclass", propertyId: "MDC_P010", valueKind: "irdi" },
  { name: "superclass_alt", propertyId: "MDC_P010_1", valueKind: "irdi" },
  { name: "is_case_of", propertyId: "MDC_P013", valueKind: "set_of_refs" },
  {
    name: "applicable_properties",
    propertyId: "MDC_P014",
    valueKind: "set_of_refs",
  },
  {
    name: "imported_properties",
    propertyId: "MDC_P090",
    valueKind: "set_of_refs",
  },
  {
    name: "sub_class_selection",
    propertyId: "MDC_P016",
    valueKind: "set_of_refs",
  },
];

const PROPERTY_FIELDS: FieldTable = [
  { name: "data_type", propertyId: "MDC_P022", valueKind: "data_type" },
  { name: "value_format", propertyId: "MDC_P024", valueKind: "value_format" },
  { name: "definition_class", propertyId: "MDC_P021", valueKind: "irdi" },
  { name: "unit", propertyId: "MDC_P041", valueKind: "irdi" },
  { name: "condition", propertyId: "MDC_P028", valueKind: "condition" },
  {
    name: "property_data_element_type",
    propertyId: "MDC_P020",
    valueKind: "string",
  },
];

const UNIT_FIELDS: FieldTable = [
  { name: "unit_structure", propertyId: "MDC_P023", valueKind: "string" },
  { name: "unit_text", propertyId: "MDC_P023_1", valueKind: "string" },
];

const VALUE_LIST_FIELDS: FieldTable = [
  { name: "list_type", propertyId: "MDC_P046", valueKind: "string" },
  { name: "code_list", propertyId: "MDC_P044", valueKind: "set_of_refs" },
  { name: "term_irdis", propertyId: "MDC_P043", valueKind: "set_of_refs" },
];

const VALUE_TERM_FIELDS: FieldTable = [
  { name: "enumeration_code", propertyId: "MDC_P044", valueKind: "string" },
];

const RELATION_FIELDS: FieldTable = [
  { name: "relation_type", propertyId: "MDC_P200", valueKind: "relation_type" },
  { name: "domain", propertyId: "MDC_P201", valueKind: "set_of_refs" },
  {
    name: "domain_of_function",
    propertyId: "MDC_P202",
    valueKind: "set_of_refs",
  },
  { name: "codomain", propertyId: "MDC_P203", valueKind: "irdi" },
  { name: "formula", propertyId: "MDC_P204", valueKind: "string" },
  { name: "formula_language", propertyId: "MDC_P205", valueKind: "string" },
  { name: "external_solver", propertyId: "MDC_P206", valueKind: "string" },
  { name: "trigger_event", propertyId: "MDC_P207", valueKind: "string" },
  { name: "domain_element_type", propertyId: "MDC_P208", valueKind: "string" },
  {
    name: "codomain_element_type",
    propertyId: "MDC_P209",
    valueKind: "string",
  },
  { name: "role", propertyId: "MDC_P210", valueKind: "string" },
  { name: "segment", propertyId: "MDC_P211", valueKind: "string" },
  { name: "super_relation", propertyId: "MDC_P212", valueKind: "irdi" },
];

const VIEW_CONTROL_FIELDS: FieldTable = [
  {
    name: "controlled_classes",
    propertyId: "EXT_P002",
    valueKind: "set_of_refs",
  },
  {
    name: "shown_properties",
    propertyId: "EXT_P003",
    valueKind: "set_of_refs",
  },
];

export const FIELDS: Readonly<Record<EntityType, readonly FieldSpec[]>> =
  Object.freeze({
    class: freezeList([...COMMON_FIELDS, ...CLASS_FIELDS]),
    property: freezeList([...COMMON_FIELDS, ...PROPERTY_FIELDS]),
    unit: freezeList([...COMMON_FIELDS, ...UNIT_FIELDS]),
    value_list: freezeList([...COMMON_FIELDS, ...VALUE_LIST_FIELDS]),
    value_term: freezeList([...COMMON_FIELDS, ...VALUE_TERM_FIELDS]),
    relation: freezeList([...COMMON_FIELDS, ...RELATION_FIELDS]),
    view_control: freezeList([...COMMON_FIELDS, ...VIEW_CONTROL_FIELDS]),
  });

export function fieldFor(
  type: EntityType,
  name: string,
): FieldSpec | undefined {
  const fields = FIELDS[type];
  if (!fields) return undefined;
  return fields.find((f) => f.name === name);
}

export function fieldsForType(type: EntityType): readonly FieldSpec[] {
  return FIELDS[type] ?? EMPTY;
}

const EMPTY: readonly FieldSpec[] = Object.freeze([]);

function freezeList<T>(list: readonly T[]): readonly T[] {
  return Object.freeze(list);
}
