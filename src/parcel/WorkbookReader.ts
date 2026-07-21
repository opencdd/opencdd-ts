/**
 * WorkbookReader — reads an Excel-format Parcel workbook (.xlsx, .xlsm,
 * .xltx, or legacy single-sheet .xls) and produces a Workbook.
 *
 * Ported from Opencdd::Parcel::WorkbookReader
 * (lib/opencdd/parcel/workbook_reader.rb). Uses SheetJS (`xlsx` npm)
 * for both .xlsx and .xls — browser-compatible via fromBuffer; Node
 * uses fromPath with dynamic fs import.
 *
 * Canonical Parcel layout:
 *   - Project sheet   — metadata (project_id, parcel_id, languages)
 *   - sheetmap sheet  — sheet ↔ entity-type mapping
 *   - pcls_LOCAL      — local class-id bridge (ignored)
 *   - data sheets     — one per entity type, named `<PROJ>_<TYPE>`
 *
 * Legacy single-file .xls (e.g. `export_CLASS_*.xls`) is detected by
 * filename and routed through Sheet.fromRows with a synthetic sheetmap.
 */

import * as XLSX from "xlsx";
import { Sheet, type RawRow, type RowCell } from "./Sheet";
import { Workbook, type SheetMapEntry, type ProjectInfo } from "./Workbook";
import { IRDI } from "../models/IRDI";
import { metaClassForType } from "../models/MetaClasses.generated";

const META_CLASS_BY_LEGACY_NAME: Readonly<Record<string, string>> = {
  CLASS: "MDC_C002",
  PROPERTY: "MDC_C003",
  ENUM: "MDC_C005",
  UoM: "MDC_C009",
  TERMINOLOGY: "MDC_C010",
  RELATION: "MDC_C011",
  VIEWCONTROL: "EXT_C001",
};

const LEGACY_TYPE_BY_PREFIX: Readonly<Record<string, string>> = {
  CLASS: "class",
  PROPERTY: "property",
  RELATION: "relation",
  UNIT: "unit",
  VALUELIST: "value_list",
  VALUETERMS: "value_term",
};

const PARCEL_NAME_BY_LEGACY_TYPE: Readonly<Record<string, string>> = {
  class: "CLASS",
  property: "PROPERTY",
  value_list: "ENUM",
  value_term: "TERMINOLOGY",
  unit: "UoM",
  relation: "RELATION",
};

export interface ReadOptions {
  readonly sheetNameFilter?: (name: string) => boolean;
}

export class WorkbookReader {
  static fromPath(path: string, opts?: ReadOptions): Workbook {
    // Node-only: xlsx.readFile wraps fs.readFileSync internally.
    const xlsxWorkbook = XLSX.readFile(path);
    return WorkbookReader.parse(xlsxWorkbook, path, opts);
  }

  static fromBuffer(
    data: Uint8Array | ArrayBuffer,
    opts?: ReadOptions,
  ): Workbook {
    const xlsxWorkbook = XLSX.read(data, { type: "array" });
    return WorkbookReader.parse(xlsxWorkbook, undefined, opts);
  }

  private static parse(
    xlsxWorkbook: XLSX.WorkBook,
    path: string | undefined,
    opts?: ReadOptions,
  ): Workbook {
    const sheetNames = xlsxWorkbook.SheetNames;
    const project = sheetNames.includes("Project")
      ? parseProject(
          XLSX.utils.sheet_to_json<Record<string, unknown>>(
            xlsxWorkbook.Sheets["Project"]!,
            { header: 1, defval: null, blankrows: false },
          )[0],
        )
      : undefined;
    const sheetmap = sheetNames.includes("sheetmap")
      ? parseSheetmap(
          XLSX.utils.sheet_to_json<unknown[][]>(
            xlsxWorkbook.Sheets["sheetmap"]!,
            { header: 1, defval: null, blankrows: false },
          ),
        )
      : [];

    const skip = new Set(["Project", "sheetmap", "pcls_LOCAL"]);
    const filter = opts?.sheetNameFilter;
    const sheets: Sheet[] = [];
    for (const name of sheetNames) {
      if (skip.has(name)) continue;
      if (filter && !filter(name)) continue;
      const rawSheet = xlsxWorkbook.Sheets[name];
      if (!rawSheet) continue;
      const rows = extractRows(rawSheet);
      const sheet = Sheet.fromRows(rows, name);
      if (sheet && (sheet.size > 0 || sheet.metadata.size > 0))
        sheets.push(sheet);
    }

    // Legacy single-file fallback: if no real sheets recognized and
    // the path matches `export_<TYPE>_*`, treat the single sheet as
    // the named type.
    if (sheets.length === 0 && sheetNames.length > 0 && path) {
      const legacyMatch = path.match(/export_([A-Z]+)_/i);
      const legacyType = legacyMatch
        ? LEGACY_TYPE_BY_PREFIX[legacyMatch[1]!.toUpperCase()]
        : undefined;
      if (legacyType) {
        const firstSheetName = sheetNames[0]!;
        const rows = extractRows(xlsxWorkbook.Sheets[firstSheetName]!);
        const sheet = Sheet.fromRows(rows, firstSheetName);
        if (sheet) sheets.push(sheet);
      }
    }

    const effectiveSheetmap =
      sheetmap.length > 0 ? sheetmap : synthesizeSheetmap(sheets, project);
    return new Workbook({
      sheets,
      sheetmap: effectiveSheetmap,
      project,
      sourcePath: path,
    });
  }
}

/**
 * FlatDirReader — reads the legacy "flat directory" Parcel layout:
 * one directory containing 1-6 `export_(CLASS|PROPERTY|RELATION|UNIT|
 * VALUELIST|VALUETERMS)_*.xls` files. This is the format cdd.iec.ch's
 * "EXCEL format" export produces.
 *
 * Ported from Opencdd::Parcel::FlatDirReader
 * (lib/opencdd/parcel/flat_dir_reader.rb).
 */
export class FlatDirReader {
  static fromPath(dirPath: string): Workbook {
    const fs = require("node:fs");
    const path = require("node:path");
    if (!fs.existsSync(dirPath)) {
      throw new Error(`flat-dir parcel path not found: ${dirPath}`);
    }
    const stat = fs.statSync(dirPath);
    const files: string[] = [];
    if (stat.isDirectory()) {
      const all = fs.readdirSync(dirPath) as string[];
      for (const f of all.sort()) {
        const full = path.join(dirPath, f);
        if (fs.statSync(full).isFile() && /export_[A-Z]+_/i.test(f)) {
          files.push(full);
        }
      }
    } else if (stat.isFile() && /export_[A-Z]+_/i.test(dirPath)) {
      files.push(dirPath);
    }
    if (files.length === 0) {
      throw new Error(`no export_*.xls files found in ${dirPath}`);
    }

    const sheets: Sheet[] = [];
    const sheetmap: SheetMapEntry[] = [];
    for (const file of files) {
      const baseName = path.basename(file);
      const prefix = baseName
        .replace(/^export_/i, "")
        .split("_")[0]!
        .toUpperCase();
      const type = LEGACY_TYPE_BY_PREFIX[prefix];
      if (!type) continue;
      const xlsxWorkbook = XLSX.readFile(file);
      const firstSheetName = xlsxWorkbook.SheetNames[0]!;
      const rows = extractRows(xlsxWorkbook.Sheets[firstSheetName]!);
      const sheet = Sheet.fromRows(rows, baseName.replace(/\.\w+$/, ""));
      if (sheet) sheets.push(sheet);
      const metaCode =
        META_CLASS_BY_LEGACY_NAME[PARCEL_NAME_BY_LEGACY_TYPE[type] ?? ""];
      if (metaCode) {
        sheetmap.push({
          projectId: "LOCAL",
          parcelId: undefined,
          classIrdi: IRDI.parse(`0112/2///62656_1#${metaCode}`)?.toString(),
          contentNo: 0,
          sheetNo: 0,
          sheetName: baseName.replace(/\.\w+$/, ""),
          type: prefix,
          target: "",
        });
      }
    }

    const parcelId = path
      .basename(files[0]!)
      .split("_")
      .pop()
      ?.replace(/\.\w+$/, "");
    const project: ProjectInfo = {
      projectId: "LOCAL",
      parcelId,
      multiLanguage: false,
      baseLanguage: "en",
    };
    return new Workbook({ sheets, sheetmap, project, sourcePath: dirPath });
  }
}

function extractRows(worksheet: XLSX.WorkSheet): RawRow[] {
  const raw = XLSX.utils.sheet_to_json<unknown[][]>(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });
  return raw.map((row) => (row as unknown[]).map(toRowCell));
}

function toRowCell(v: unknown): RowCell {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function parseSheetmap(rows: unknown[][]): SheetMapEntry[] {
  if (rows.length < 2) return [];
  const header = (rows[0] as unknown[]).map((c) =>
    String(c ?? "")
      .trim()
      .toLowerCase(),
  );
  const out: SheetMapEntry[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const h: Record<string, string | number | undefined> = {};
    header.forEach((key, idx) => {
      if (!key) return;
      const v = row[idx];
      const s = v === null || v === undefined ? "" : String(v).trim();
      h[key] = s.length > 0 ? s : undefined;
    });
    if (!h.sheetname) continue;
    out.push({
      projectId: (h.projectid as string | undefined) ?? "LOCAL",
      parcelId: h.parcelid as string | undefined,
      classIrdi: h.classid
        ? IRDI.parse(String(h.classid))?.toString()
        : undefined,
      contentNo: h.contentno !== undefined ? Number(h.contentno) : 0,
      sheetNo: h.sheetno !== undefined ? Number(h.sheetno) : 0,
      sheetName: String(h.sheetname),
      type: (h.type as string) ?? "",
      target: (h.target as string) ?? "",
    });
  }
  return out;
}

function parseProject(
  row: Record<string, unknown> | unknown[] | undefined,
): ProjectInfo | undefined {
  if (!row) return undefined;
  const lookup: Record<string, unknown> = Array.isArray(row)
    ? Object.fromEntries(row.map((v, i) => [i, v]))
    : row;
  const projectId = String(lookup["Project ID"] ?? "").trim();
  const parcelId = String(lookup["Parcel ID"] ?? "").trim();
  const multiLanguage = String(lookup["Multi language"] ?? "").trim();
  const baseLanguageRaw = String(lookup["Base language"] ?? "").trim();
  if (!projectId && !parcelId) return undefined;
  return {
    projectId,
    parcelId,
    multiLanguage: multiLanguage.length > 0,
    baseLanguage: baseLanguageRaw.length > 0 ? baseLanguageRaw : "en",
  };
}

function synthesizeSheetmap(
  sheets: readonly Sheet[],
  project: ProjectInfo | undefined,
): SheetMapEntry[] {
  const out: SheetMapEntry[] = [];
  for (const s of sheets) {
    const type = s.metadata.type;
    if (!type) continue;
    const metaCode = metaClassForType(
      type as Parameters<typeof metaClassForType>[0],
    );
    if (!metaCode) continue;
    out.push({
      projectId: project?.projectId ?? "LOCAL",
      parcelId: project?.parcelId,
      classIrdi: IRDI.parse(`0112/2///62656_1#${metaCode}`)?.toString(),
      contentNo: 0,
      sheetNo: 0,
      sheetName: s.name,
      type: PARCEL_NAME_BY_LEGACY_TYPE[type] ?? String(type).toUpperCase(),
      target: "",
    });
  }
  return out;
}
