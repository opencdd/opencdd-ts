/**
 * JSON exporter for CDD databases.
 *
 * Ported from Cdd::Exporters::Json (lib/cdd/exporters/json.rb). Emits one
 * node per entity, dispatched by entity type, with nil-valued fields
 * stripped (Ruby's `.compact` semantics). Node ordering follows
 * Cdd::Visitor#visit_database: classes (depth-first from roots, sorted by
 * code), then properties, units, value_lists, value_terms, relations,
 * view_controls — each sorted by code.
 */

import { Database } from "../models/Database";
import { Klass } from "../models/Klass";
import { Property } from "../models/Property";
import { Unit } from "../models/Unit";
import { ValueList } from "../models/ValueList";
import { ValueTerm } from "../models/ValueTerm";
import { Relation } from "../models/Relation";
import { ViewControl } from "../models/ViewControl";
import { sortByEntityCode, byEntityCode } from "./sort";

export type JsonNode = Record<string, unknown>;

/**
 * Strips keys whose value is null or undefined. Mirrors Ruby's
 * Hash#compact (which does NOT strip empty arrays or empty strings).
 */
function compact<T extends Record<string, unknown>>(record: T): JsonNode {
  const out: JsonNode = {};
  for (const [k, v] of Object.entries(record)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

function irdiStrings(
  values: ReadonlyArray<{ toString(): string } | null>,
): string[] {
  return values
    .filter((v): v is { toString(): string } => v !== null)
    .map((v) => v.toString());
}

function classNode(klass: Klass): JsonNode {
  return compact({
    type: "class",
    irdi: klass.irdi?.toString(),
    code: klass.code,
    preferred_name: klass.preferredName("en"),
    short_name: klass.shortName("en"),
    definition: klass.definition("en"),
    class_type: klass.classType?.toString(),
    superclass: klass.superclassIrdi?.toString() ?? undefined,
    is_case_of: irdiStrings(klass.isCaseOfIrdis),
    applicable_properties: irdiStrings(klass.applicablePropertyIrdis),
    imported_properties: irdiStrings(klass.importedPropertyIrdis),
    sub_class_selection: irdiStrings(klass.subClassSelectionIrdis),
  });
}

function propertyNode(prop: Property): JsonNode {
  return compact({
    type: "property",
    irdi: prop.irdi?.toString(),
    code: prop.code,
    preferred_name: prop.preferredName("en"),
    short_name: prop.shortName("en"),
    definition: prop.definition("en"),
    data_type: prop.parsedDataType?.toString() ?? undefined,
    unit: prop.unitIrdi?.toString() ?? undefined,
    definition_class: prop.definitionClassIrdi?.toString() ?? undefined,
    value_format: prop.valueFormat,
    symbol: prop.symbolInText,
    condition: prop.condition?.toString() ?? undefined,
    data_element_type: prop.dataElementType?.toString() ?? undefined,
    constraint: prop.constraint,
    formula: prop.formula,
  });
}

function unitNode(unit: Unit): JsonNode {
  return compact({
    type: "unit",
    irdi: unit.irdi?.toString(),
    code: unit.code,
    preferred_name: unit.preferredName("en"),
    symbol: unit.symbol,
    structure: unit.structure,
    text_representation: unit.textRepresentation,
  });
}

function valueListNode(vl: ValueList): JsonNode {
  const selectionCount = vl.selectionCount;
  return compact({
    type: "value_list",
    irdi: vl.irdi?.toString(),
    code: vl.code,
    preferred_name: vl.preferredName("en"),
    list_type: vl.listType,
    term_irdis: irdiStrings(vl.termIrdis),
    code_list: vl.codeList,
    selection_count:
      selectionCount && selectionCount.length > 0 ? selectionCount : undefined,
  });
}

function valueTermNode(vt: ValueTerm): JsonNode {
  return compact({
    type: "value_term",
    irdi: vt.irdi?.toString(),
    code: vt.code,
    preferred_name: vt.preferredName("en"),
    enumeration_code: vt.enumerationCode,
    value_list: vt.valueListIrdi?.toString() ?? undefined,
  });
}

function relationNode(rel: Relation): JsonNode {
  return compact({
    type: "relation",
    irdi: rel.irdi?.toString(),
    code: rel.code,
    relation_type: rel.relationType,
    domain: irdiStrings(rel.domainIrdis),
    codomain: rel.codomainIrdi?.toString() ?? undefined,
    formula: rel.formula,
    formula_language: rel.formulaLanguage,
    role: rel.role,
    segment: rel.segment,
  });
}

function viewControlNode(vc: ViewControl): JsonNode {
  return compact({
    type: "view_control",
    irdi: vc.irdi?.toString(),
    code: vc.code,
    controlled_classes: irdiStrings(vc.controlledClassIrdis),
    shown_properties: irdiStrings(vc.shownPropertyIrdis),
  });
}

export class JsonExporter {
  toJSON(database: Database, pretty = true): string {
    const nodes = this.buildNodes(database);
    return pretty ? JSON.stringify(nodes, null, 2) : JSON.stringify(nodes);
  }

  buildNodes(database: Database): JsonNode[] {
    const nodes: JsonNode[] = [];
    for (const klass of sortedClasses(database)) nodes.push(classNode(klass));
    for (const e of sortByEntityCode(database.properties()))
      nodes.push(propertyNode(e));
    for (const e of sortByEntityCode(database.units())) nodes.push(unitNode(e));
    for (const e of sortByEntityCode(database.valueLists()))
      nodes.push(valueListNode(e));
    for (const e of sortByEntityCode(database.valueTerms()))
      nodes.push(valueTermNode(e));
    for (const e of sortByEntityCode(database.relations()))
      nodes.push(relationNode(e));
    for (const e of sortByEntityCode(database.viewControls()))
      nodes.push(viewControlNode(e));
    return nodes;
  }
}

function sortedClasses(database: Database): Klass[] {
  const out: Klass[] = [];
  const visited = new Set<string>();
  const walk = (klass: Klass): void => {
    const key = klass.irdi?.toString();
    if (key && visited.has(key)) return;
    if (key) visited.add(key);
    out.push(klass);
    const children = [...klass.children].sort(byEntityCode);
    for (const child of children) walk(child);
  };
  for (const root of [...database.rootClasses()].sort(byEntityCode)) {
    walk(root);
  }
  return out;
}
