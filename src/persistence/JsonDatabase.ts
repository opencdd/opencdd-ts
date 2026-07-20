/**
 * JsonDatabase — read/write the cdd-data JSON database shape.
 *
 * Each dictionary in cdd-data/data/<dict>/database.json is an array of
 * entity records. Each record carries up to three layers:
 *
 *   1. Convenience semantic fields — `preferred_name`, `class_type`,
 *      `applicable_properties`, etc. Plain values (string, array).
 *   2. Multilingual hashes — `preferred_name_ml: {en: ..., fr: ...}`.
 *   3. Raw wire-format map — `raw_properties: {MDC_P004.en: ...}`.
 *
 * The wire-format map is the canonical source. The semantic fields
 * are derived projections; the multilingual hashes are a convenience
 * view over the wire map. When `raw_properties` is present we use it
 * directly — no semantic→wire re-mapping that could drift.
 *
 * Records without `raw_properties` (the oceanrunner fixture is the
 * only example) fall back to the YamlEntity semantic shape and are
 * funneled through `entityFromYamlEntity` via the FieldRegistry.
 */

import { Database } from "../models/Database";
import { Entity } from "../models/Entity";
import { IRDI } from "../models/IRDI";
import { ENTITY_CONSTRUCTORS } from "../models/entityConstructors";
import { entityFromYamlEntity, type YamlEntityData } from "./YamlEntity";
import type { EntityType } from "../models/MetaClasses.generated";

export interface JsonObject {
  readonly [key: string]: unknown;
}

const TYPE_TO_META_CLASS: Readonly<Record<string, string>> = {
  class: "MDC_C002",
  property: "MDC_C003",
  value_list: "MDC_C005",
  unit: "MDC_C009",
  value_term: "MDC_C010",
  relation: "MDC_C011",
  view_control: "EXT_C001",
  list_of_unit: "MDC_C013",
};

export function databaseFromJson(json: string, base?: Database): Database {
  const records = JSON.parse(json) as JsonObject[];
  if (!Array.isArray(records)) {
    throw new Error(`expected JSON array, got ${typeof records}`);
  }
  const db = base ?? new Database();
  for (const rec of records) {
    db.addEntity(recordToEntity(rec));
  }
  db.finalize();
  return db;
}

export function databaseToJson(db: Database): string {
  const records: JsonObject[] = db.entities().map(entityToRecord);
  return JSON.stringify(records, null, 2);
}

function recordToEntity(rec: JsonObject): Entity {
  const type = String(rec.type ?? "class");
  const metaIrdi = TYPE_TO_META_CLASS[type] ?? "MDC_C002";
  // ENTITY_CONSTRUCTORS is keyed by meta-class IRDI, not by type name.
  const ctor = ENTITY_CONSTRUCTORS[metaIrdi] ?? ENTITY_CONSTRUCTORS.MDC_C002;
  const irdi =
    rec.irdi !== undefined && rec.irdi !== null
      ? IRDI.parse(String(rec.irdi))
      : null;

  const raw = rec.raw_properties;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw as JsonObject)) props[k] = v;
    return new ctor(irdi, props, metaIrdi);
  }

  // Fallback: treat the record as YamlEntityData (semantic shape).
  return entityFromYamlEntity(rec as unknown as YamlEntityData);
}

function entityToRecord(entity: Entity): JsonObject {
  const raw = Object.fromEntries(entity.properties);
  return {
    irdi: entity.irdi?.toString() ?? null,
    code: entity.code ?? null,
    type: entity.type ?? null,
    raw_properties: raw,
  };
}
