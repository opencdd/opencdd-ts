/**
 * CSV writer for CDD Parcel sheets.
 *
 * Ported from Cdd::Parcel::CsvWriter (lib/cdd/parcel/csv_writer.rb).
 *
 * Emits one CSV document per Parcel sheet, data rows only — header and
 * metadata rows are owned by the Parcel xlsx writer (Phase 3.5b) and by
 * the SheetEmitter port, both still pending. The Ruby `write_sheet`
 * contract is preserved: produce data rows, drop the leading row-label
 * cell, and join with CSV quoting.
 *
 * Browser-friendly: emits strings (no fs/path/IO deps). Node callers can
 * write the strings to disk; the encoding/BOM branch is left to the
 * caller because UTF-16 BOM handling is runtime-specific.
 */

import { Database } from "../models/Database";
import { Entity } from "../models/Entity";
import { Sheet } from "../parcel/Sheet";
import type { SheetColumn } from "../parcel/SheetSchema";
import { REGISTRY as PID_REGISTRY } from "../models/PropertyIds.generated";
import { metaClassForType } from "../models/MetaClasses.generated";
import type { EntityType } from "../models/MetaClasses.generated";

const DEFAULT_SOURCE_LANGUAGE = "en";

const TYPE_LABELS: Readonly<Record<EntityType, string>> = {
  class: "CLASS",
  property: "PROPERTY",
  value_list: "ENUM",
  value_term: "TERMINOLOGY",
  unit: "UoM",
  relation: "RELATION",
  view_control: "VIEWCONTROL",
};

const SHEET_ENTITY_ORDER: readonly EntityType[] = [
  "class",
  "property",
  "value_list",
  "value_term",
  "unit",
  "relation",
  "view_control",
];

export interface BuiltSheet {
  readonly sheet: Sheet;
  readonly entities: readonly Entity[];
  readonly type: EntityType;
}

export interface WrittenCsvFile {
  readonly name: string;
  readonly content: string;
}

export class CsvWriter {
  writeSheet(
    sheet: Sheet,
    entities: readonly Entity[],
    sourceLanguage: string = DEFAULT_SOURCE_LANGUAGE,
  ): string {
    const columns = [...sheet.schema];
    const rows = this.dataRowsFor(columns, entities, sourceLanguage);
    return rows.map((row) => csvLine(row)).join("");
  }

  writeWorkbook(
    database: Database,
    parcelId: string,
    sourceLanguage: string = DEFAULT_SOURCE_LANGUAGE,
  ): WrittenCsvFile[] {
    return this.buildSheets(database, parcelId, sourceLanguage).map(
      (built) => ({
        name: `${parcelId}_${TYPE_LABELS[built.type]}.csv`,
        content: this.writeSheet(built.sheet, built.entities, sourceLanguage),
      }),
    );
  }

  buildSheets(
    database: Database,
    parcelId: string,
    sourceLanguage: string,
  ): BuiltSheet[] {
    const out: BuiltSheet[] = [];
    for (const type of SHEET_ENTITY_ORDER) {
      const metaCode = metaClassForType(type);
      if (!metaCode) continue;
      const sheet = Sheet.scaffold({
        metaClassIrdi: metaCode,
        parcelId,
        sourceLanguage,
      });
      const entities = database.entitiesOfType(type);
      out.push({ sheet, entities, type });
    }
    return out;
  }

  private dataRowsFor(
    columns: readonly SheetColumn[],
    entities: readonly Entity[],
    sourceLanguage: string,
  ): string[][] {
    return entities.map((entity) =>
      columns.map((col) => cellValueFor(entity, col, sourceLanguage)),
    );
  }
}

function cellValueFor(
  entity: Entity,
  col: SheetColumn,
  sourceLanguage: string,
): string {
  const pid = col.propertyId;
  const direct = entity.properties.get(pid);
  if (direct !== undefined) return scalarToCell(direct);
  return scalarToCell(multilingualLookup(entity, pid, sourceLanguage));
}

function multilingualLookup(
  entity: Entity,
  pid: string,
  sourceLanguage: string,
): unknown {
  const entry = PID_REGISTRY[pid];
  if (entry?.multilingual) {
    const v = entity.properties.get(`${pid}.${sourceLanguage}`);
    if (v !== undefined) return v;
  }
  if (pid.includes(".")) {
    const [base] = pid.split(".", 2);
    if (entity.properties.has(pid)) return entity.properties.get(pid);
    return entity.properties.get(base);
  }
  return undefined;
}

function scalarToCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return String(value);
}

const CSV_QUOTE_NEEDED = /[",\n\r]/;

function csvLine(cells: readonly string[]): string {
  const out = cells.map(csvCell).join(",");
  return out + "\n";
}

function csvCell(value: string): string {
  if (!CSV_QUOTE_NEEDED.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
