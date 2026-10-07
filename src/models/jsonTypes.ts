/**
 * JSON wire shapes produced by `Cdd::Exporters::Json` (Ruby) and
 * consumed by the browser, editor, and any other tool that reads
 * CDD JSON. These are plain interfaces (no class instances) — the
 * model classes in the parent package wrap these for interactive use.
 *
 * This is the single source of truth for the JSON format. The browser
 * imports from here instead of maintaining its own parallel types.
 */

export type EntityType =
  | "class"
  | "property"
  | "unit"
  | "value_list"
  | "value_term"
  | "relation"
  | "view_control"
  | "list_of_unit"
  | "det_classification";

export interface Synonym {
  lang: string | null;
  name: string;
}

export interface EntityDates {
  original_definition?: string;
  current_version?: string;
  current_revision?: string;
}

export type MultilingualText = Record<string, string>;

export interface VersionHistoryEntry {
  version: string | null;
  revision: string | null;
  status: string | null;
  timestamp: string | null;
  user: string | null;
  change_request_id: string | null;
  unid: string | null;
  is_current: boolean;
}

export interface EntityMetadata {
  irdi: string;
  code?: string;
  preferred_name?: string;
  preferred_name_ml?: MultilingualText;
  short_name?: string;
  short_name_ml?: MultilingualText;
  definition?: string;
  definition_ml?: MultilingualText;
  synonyms?: Synonym[];
  note?: string;
  note_ml?: MultilingualText;
  remark?: string;
  remark_ml?: MultilingualText;
  description?: string;
  description_ml?: MultilingualText;
  example?: string;
  source_document?: string;
  guid?: string;
  version?: string;
  revision?: string;
  time_stamp?: string;
  dates?: EntityDates;
  raw_properties?: Record<string, unknown>;
  version_history?: VersionHistoryEntry[];
  status_level?: string;
  publisher?: string;
  published_in?: string;
  responsible_committee?: string;
  change_request_id?: string;
}

export interface BaseNode extends EntityMetadata {
  type: EntityType;
}

export interface ClassNode extends BaseNode {
  type: "class";
  class_type?: string;
  superclass?: string;
  is_case_of?: string[];
  applicable_properties?: string[];
  imported_properties?: string[];
  sub_class_selection?: string[];
}

export interface PropertyNode extends BaseNode {
  type: "property";
  data_type?: string;
  unit?: string;
  /** Display name for the unit when `unit` holds a cross-dictionary IRDI. */
  unit_text?: string;
  definition_class?: string;
  value_format?: string;
  symbol?: string;
  condition?: string;
  data_element_type?: string;
  constraint?: string;
  formula?: string;
  value_list?: string;
}

export interface UnitNode extends BaseNode {
  type: "unit";
  symbol?: string;
  structure?: string;
  text_representation?: string;
}

export interface ValueListNode extends BaseNode {
  type: "value_list";
  list_type?: string;
  term_irdis?: string[];
  code_list?: string[];
  selection_count?: string[];
}

export interface ValueTermNode extends BaseNode {
  type: "value_term";
  enumeration_code?: string;
  value_list?: string;
}

export interface RelationNode extends BaseNode {
  type: "relation";
  relation_type?: string;
  domain?: string[];
  codomain?: string;
  formula?: string;
  formula_language?: string;
  role?: string;
  segment?: string;
}

export interface ViewControlNode extends BaseNode {
  type: "view_control";
  controlled_classes?: string[];
  shown_properties?: string[];
}

export interface ListOfUnitNode extends BaseNode {
  type: "list_of_unit";
}

export interface DetClassificationNode extends BaseNode {
  type: "det_classification";
}

export type EntityNode =
  | ClassNode
  | PropertyNode
  | UnitNode
  | ValueListNode
  | ValueTermNode
  | RelationNode
  | ViewControlNode
  | ListOfUnitNode
  | DetClassificationNode;

export function isClassNode(node: EntityNode): node is ClassNode {
  return node.type === "class";
}

export function isPropertyNode(node: EntityNode): node is PropertyNode {
  return node.type === "property";
}

export function isUnitNode(node: EntityNode): node is UnitNode {
  return node.type === "unit";
}

export function isValueListNode(node: EntityNode): node is ValueListNode {
  return node.type === "value_list";
}

export function isValueTermNode(node: EntityNode): node is ValueTermNode {
  return node.type === "value_term";
}

export function isRelationNode(node: EntityNode): node is RelationNode {
  return node.type === "relation";
}

export function isViewControlNode(node: EntityNode): node is ViewControlNode {
  return node.type === "view_control";
}

export function isListOfUnitNode(node: EntityNode): node is ListOfUnitNode {
  return node.type === "list_of_unit";
}

export function isDetClassificationNode(
  node: EntityNode,
): node is DetClassificationNode {
  return node.type === "det_classification";
}

/* ── Property metadata wire shapes ──────────────────────────────
   The Ruby gem exports `_properties.json` and `_meta_classes.json`
   alongside `database.json`. These describe how to label and render
   every property code (MDC_P###, C###) and which properties apply
   to each meta-class. They are the data-driven counterpart to the
   hard-coded typed accessors on UnitNode / ClassNode etc.: those
   stay as sugar, while `raw_properties` on every entity carries
   the values and these tables carry the metadata. */

export interface PropertyMetadata {
  /** Human-readable name, e.g. "UN/ECE code". */
  name: string;
  /** IEC 61360 data type, e.g. "STRING_TYPE", "TRANSLATABLE_STRING_TYPE". */
  datatype?: string;
  /** Whether the property has per-language variants (.en, .de, etc.). */
  multilingual?: boolean;
  /** Value format hint, e.g. "M..255". */
  valueFormat?: string;
}

/** Lookup table: property code → metadata. Matches the shape of
 *  `_properties.json` exported by the Ruby gem. */
export type PropertyMetadataMap = Record<string, PropertyMetadata>;

export interface MetaClassDefinition {
  /** Meta-class code, e.g. "MDC_C009". */
  code: string;
  /** Human-readable name, e.g. "Unit". */
  name: string;
  /** Property IDs that apply to entities of this meta-class. */
  propertyIds: string[];
}

/** Lookup table: meta-class code → definition. Matches the shape of
 *  `_meta_classes.json` exported by the Ruby gem. */
export type MetaClassDefinitionMap = Record<string, MetaClassDefinition>;
