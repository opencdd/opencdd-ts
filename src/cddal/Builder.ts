/**
 * CDDAL Builder — constructs a Database from a parsed CDDAL Document.
 *
 * Ported from Opencdd::Cddal::Builder (lib/opencdd/cddal/builder.rb).
 * Owns the module/import pipeline: resolves specifiers via the
 * configured Resolver, recursively builds imported documents into
 * the same Database, tracks the dependency graph for cycle detection,
 * and applies bare, qualified, and selective import scoping rules.
 *
 * Browser-safe by default: when no Resolver is supplied, imports
 * resolve against an empty in-memory fetcher (i.e. silently skip).
 * Callers pass a Resolver with a real Fetcher for actual resolution.
 */

import type {
  AliasDecl,
  ClassReferenceNode,
  ConditionNode,
  Declaration,
  Document,
  ImportDecl,
  InstanceDecl,
  Literal,
  MetaClassDecl,
  PropertyAssignment,
  SetNode,
  TupleNode,
  ValueNode,
} from "./AST";
import {
  isAliasDecl,
  isImportDecl,
  isInstanceDecl,
  isMetaClassDecl,
} from "./AST";
import { Database } from "../models/Database";
import { AliasTable, AliasTableError } from "../models/AliasTable";
import { Entity, type SourceLocation } from "../models/Entity";
import { IRDI } from "../models/IRDI";
import { CODE_PROPERTY_CANDIDATES } from "../models/codeProperty";
import { referencePropertyIds } from "../models/referenceKinds";
import { ENTITY_CONSTRUCTORS } from "../models/entityConstructors";
import {
  entityTypeFor as metaTypeFor,
  codePropertyIdFor,
} from "../models/MetaClasses.generated";
import { Parser } from "./Parser";
import { Resolver, ImportError } from "./Resolver";
import { serializeValue as serializeValueNode } from "./ValueSerializer";

const CODE_VARIANT_IDS = new Set([
  "MDC_P001",
  "MDC_P001_1",
  "MDC_P001_2",
  "MDC_P001_5",
  "MDC_P001_6",
  "MDC_P001_7",
  "MDC_P001_8",
  "MDC_P001_10",
  "MDC_P001_11",
  "MDC_P001_12",
  "MDC_P001_13",
  "EXT_P001",
]);

export interface BuildResult {
  readonly database: Database;
  readonly importedSpecifiers: readonly string[];
  readonly warnings: readonly string[];
}

export interface BuilderOptions {
  readonly database?: Database;
  readonly resolver?: Resolver;
  readonly sourceFile?: string;
  readonly loadedModules?: Set<string>;
  readonly loadingStack?: string[];
}

export class Builder {
  readonly database: Database;
  readonly aliasTable: AliasTable;
  readonly sourceFile: string | null;
  private readonly resolver: Resolver;
  private readonly symbolTable = new Map<string, InstanceDecl>();
  private readonly instanceDecls: InstanceDecl[] = [];
  private readonly metaClassOverrides = new Map<
    string,
    { allowedPropertyIds: Set<string> }
  >();
  private readonly importedSpecifiers = new Set<string>();
  private readonly warnings: string[];
  private readonly loadedModules: Set<string>;
  private readonly loadingStack: string[];

  constructor(opts: BuilderOptions = {}) {
    this.database = opts.database ?? new Database();
    this.aliasTable = this.database.aliasTable;
    this.resolver = opts.resolver ?? new Resolver();
    this.sourceFile = opts.sourceFile ?? null;
    this.loadedModules = opts.loadedModules ?? new Set();
    this.loadingStack = opts.loadingStack ?? [];
    this.warnings = [];
  }

  build(document: Document): BuildResult {
    this.applyAliasDeclarations(document.declarations);
    this.applyMetaClassDeclarations(document.declarations);
    this.applyImportDeclarations(document.declarations);
    this.registerInstanceSymbols(document.declarations);
    this.instantiateEntities();
    this.resolvePropertyReferences();
    this.database.finalize();
    return {
      database: this.database,
      importedSpecifiers: [...this.importedSpecifiers],
      warnings: [...this.warnings],
    };
  }

  peekImport(specifier: string): string | null {
    const r = this.resolver.resolve(specifier, this.sourceFile ?? undefined);
    return r?.source ?? null;
  }

  private applyAliasDeclarations(decls: readonly Declaration[]): void {
    for (const decl of decls) {
      if (!isAliasDecl(decl)) continue;
      try {
        this.aliasTable.declare(
          decl.aliasName,
          this.resolvePropertyId(decl.propertyId),
        );
      } catch (err) {
        if (err instanceof AliasTableError) {
          this.warnings.push(err.message);
        } else {
          throw err;
        }
      }
    }
  }

  private applyMetaClassDeclarations(decls: readonly Declaration[]): void {
    for (const decl of decls) {
      if (!isMetaClassDecl(decl)) continue;
      const allowed = new Set(
        decl.propertyIdentifiers.map((id) => this.resolvePropertyId(id)),
      );
      this.metaClassOverrides.set(decl.irdi, { allowedPropertyIds: allowed });
    }
  }

  private applyImportDeclarations(decls: readonly Declaration[]): void {
    for (const decl of decls) {
      if (!isImportDecl(decl)) continue;
      this.processImport(decl);
    }
  }

  private processImport(decl: ImportDecl): void {
    const resolved = this.resolver.resolve(
      decl.specifier,
      this.sourceFile ?? undefined,
    );
    if (resolved === null) return;
    if (this.loadedModules.has(resolved.canonical)) return;
    this.checkCycle(resolved.canonical, decl.specifier);

    this.loadingStack.push(resolved.canonical);
    const subDoc = Parser.parse(resolved.source);
    new Builder({
      database: this.database,
      resolver: this.resolver,
      sourceFile: resolved.canonical,
      loadedModules: this.loadedModules,
      loadingStack: this.loadingStack,
    }).build(subDoc);
    this.loadingStack.pop();
    this.loadedModules.add(resolved.canonical);
    this.importedSpecifiers.add(resolved.canonical);

    this.applyImportScope(decl);
  }

  private checkCycle(canonical: string, specifier: string): void {
    if (!this.loadingStack.includes(canonical)) return;
    const cycle = [...this.loadingStack, canonical];
    throw new ImportError(
      `circular CDDAL import detected: ${cycle.join(" → ")} (originally imported as ${JSON.stringify(specifier)})`,
    );
  }

  private applyImportScope(decl: ImportDecl): void {
    if (decl.kind === "qualified" && decl.qualifier) {
      for (const entity of this.database.entities()) {
        const name = entity.code ?? entity.preferredName("en");
        if (!name) continue;
        const qualified = `${decl.qualifier}.${name}`;
        this.database.registerSymbol(qualified, entity);
      }
      return;
    }
    if (decl.kind === "selective") {
      for (const imported of decl.importedNames) {
        const target = this.database.resolveReference(imported.name);
        if (!target) continue;
        this.database.registerSymbol(imported.localName, target);
      }
    }
  }

  private registerInstanceSymbols(decls: readonly Declaration[]): void {
    for (const decl of decls) {
      if (!isInstanceDecl(decl)) continue;
      this.instanceDecls.push(decl);
      if (decl.name) this.registerSymbolName(decl.name, decl);
    }
  }

  private registerSymbolName(name: string, decl: InstanceDecl): void {
    if (this.symbolTable.has(name) && this.symbolTable.get(name) !== decl) {
      this.warnings.push(
        `Symbol ${JSON.stringify(name)} already declared; ignoring redefinition`,
      );
      return;
    }
    this.symbolTable.set(name, decl);
  }

  private instantiateEntities(): void {
    for (const decl of this.instanceDecls) {
      const entity = this.buildEntity(decl);
      if (!entity) continue;
      entity.attachSourceLocation({ file: this.sourceFile, line: decl.line });
      this.database.addEntity(entity);
      if (decl.name) this.database.registerSymbol(decl.name, entity);
    }
  }

  private buildEntity(decl: InstanceDecl): Entity | null {
    const metaClassRef = resolveMetaClassRef(
      this.aliasTable,
      decl.metaClassRef,
    );
    if (!metaClassRef) return null;
    const ctor = ENTITY_CONSTRUCTORS[metaClassRef];
    if (!ctor) return null;
    const properties = this.buildProperties(decl, metaClassRef);
    const irdi = extractIrdi(properties);
    return new ctor(irdi, properties, metaClassRef);
  }

  private buildProperties(
    decl: InstanceDecl,
    metaClassRef: string,
  ): Record<string, unknown> {
    const canonicalCodePid = codePropertyIdFor(metaClassRef) ?? null;
    const props: Record<string, unknown> = {};
    for (const assignment of decl.assignments) {
      const propertyId = this.resolvePropertyId(
        assignment.identifier,
        canonicalCodePid,
      );
      const key = assignment.languageTag
        ? `${propertyId}.${assignment.languageTag}`
        : propertyId;
      const value = serializeValue(assignment.value);
      props[key] = mergePropertyValue(props[key], value);
    }
    return props;
  }

  private resolvePropertyId(
    name: string,
    canonicalCodePid: string | null = null,
  ): string {
    if (
      /^MDC_P\d+/.test(name) ||
      /^EXT_P\d+/.test(name) ||
      /^CIM_P\d+/.test(name)
    )
      return name;
    const resolved = this.aliasTable.resolve(name) ?? name;
    if (!canonicalCodePid) return resolved;
    if (resolved === canonicalCodePid) return resolved;
    return CODE_VARIANT_IDS.has(resolved) ? canonicalCodePid : resolved;
  }

  private resolvePropertyReferences(): void {
    const referencePropertyIdsList = referencePropertyIds();
    for (const entity of this.database.entities()) {
      for (const key of entity.keys()) {
        const base = key.replace(/\.\w+$/, "");
        if (!referencePropertyIdsList.includes(base)) continue;
        const value = entity.properties.get(key);
        if (value === undefined) continue;
        const s = String(value).trim();
        if (s.length === 0) continue;
        const resolved = resolvePropertyValue(this.database, s);
        if (resolved !== s) entity.setPropertyValue(key, resolved);
      }
    }
  }
}

function resolvePropertyValue(database: Database, raw: string): string {
  const s = raw.trim();
  if (!isWrappedCollection(s)) {
    return resolveSingleReference(database, s);
  }
  const inner = s.slice(1, -1);
  const elements = inner
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  const resolved = elements
    .map((e) => resolveSingleReference(database, e))
    .filter((x) => x.length > 0);
  return `{${resolved.join(",")}}`;
}

function isWrappedCollection(s: string): boolean {
  return (
    (s.startsWith("(") && s.endsWith(")")) ||
    (s.startsWith("{") && s.endsWith("}"))
  );
}

function resolveSingleReference(database: Database, token: string): string {
  const target = database.resolveReference(token);
  return target?.irdi?.toString() ?? token;
}

function resolveMetaClassRef(
  aliasTable: AliasTable,
  ref: string,
): string | null {
  if (!ref) return null;
  if (/^MDC_C\d+$/.test(ref) || /^EXT_C\d+$/.test(ref)) return ref;
  const canonical = aliasTable.resolve(ref);
  if (
    canonical &&
    (metaTypeFor(canonical) !== undefined || ENTITY_CONSTRUCTORS[canonical])
  ) {
    return canonical;
  }
  if (ENTITY_CONSTRUCTORS[ref]) return ref;
  return canonical ?? null;
}

function mergePropertyValue(existing: unknown, newValue: unknown): unknown {
  if (existing === undefined) return newValue;
  if (Array.isArray(existing) || Array.isArray(newValue)) {
    return [
      ...(Array.isArray(existing) ? existing : [existing]),
      ...(Array.isArray(newValue) ? newValue : [newValue]),
    ];
  }
  return newValue;
}

function serializeValue(value: ValueNode): unknown {
  return serializeValueNode(value);
}

function extractIrdi(properties: Record<string, unknown>): IRDI | null {
  for (const pid of CODE_PROPERTY_CANDIDATES) {
    const raw = properties[pid];
    if (typeof raw === "string" && raw.length > 0) return IRDI.parse(raw);
  }
  return null;
}

export type {
  AliasDecl,
  ClassReferenceNode,
  ConditionNode,
  Declaration,
  Document,
  ImportDecl,
  InstanceDecl,
  Literal,
  MetaClassDecl,
  PropertyAssignment,
  SetNode,
  SourceLocation,
  TupleNode,
};
