import { IRDI } from "./IRDI";
import * as Pids from "./PropertyIds.generated";
import { entityTypeFor, type EntityType } from "./MetaClasses.generated";
import { Languages } from "./Languages";
import { VersionHistory, type VersionHistoryEntry } from "./VersionHistory";

export interface Dates {
  originalDefinition: string | undefined;
  currentVersion: string | undefined;
  currentRevision: string | undefined;
}

export interface SourceLocation {
  readonly file: string | null;
  readonly line: number | null;
}

export interface EntityJSON {
  irdi: string | null;
  metaClassIrdi: string | null;
  properties: Record<string, unknown>;
  versionHistory?: VersionHistoryEntry[];
  languages?: { source: string; translations: string[] };
}

/**
 * Base class for all CDD entity types (Class, Property, Unit, etc.).
 *
 * Ported from Cdd::Entity (lib/cdd/entity.rb). Holds an IRDI, a property
 * map keyed by canonical property ID (optionally suffixed with language
 * code for multilingual values), and a meta-class IRDI that identifies
 * which entity type this is.
 */
export abstract class Entity {
  readonly properties: Map<string, unknown>;
  protected mutableIrdi: IRDI | null;
  private readonly cachedType: EntityType | undefined;
  private versionHistoryValue: VersionHistory;
  private languagesValue: Languages;
  sourceLocation: SourceLocation | null = null;

  constructor(
    irdi: IRDI | null,
    properties: Record<string, unknown> = {},
    readonly metaClassIrdi: string | null = null,
  ) {
    this.properties = new Map(Object.entries(properties));
    this.mutableIrdi = irdi;
    this.cachedType = metaClassIrdi ? entityTypeFor(metaClassIrdi) : undefined;
    this.versionHistoryValue = new VersionHistory();
    this.languagesValue = Languages.fromProperties(properties);
  }

  get versionHistory(): VersionHistory {
    return this.versionHistoryValue;
  }

  get languages(): Languages {
    return this.languagesValue;
  }

  attachVersionHistory(entries: VersionHistoryEntry[]): this {
    this.versionHistoryValue = new VersionHistory(entries);
    return this;
  }

  attachSourceLocation(loc: SourceLocation): this {
    this.sourceLocation = loc;
    return this;
  }

  get irdi(): IRDI | null {
    return this.mutableIrdi;
  }

  /**
   * Replaces the entity's IRDI in place. Used by Database.rename_entity
   * to maintain identity across a code change. Only the Database should
   * call this — entities are otherwise identity-stable.
   */
  replaceIrdi(newIrdi: IRDI | string): this {
    this.mutableIrdi =
      typeof newIrdi === "string" ? IRDI.parse(newIrdi) : newIrdi;
    return this;
  }

  /**
   * Overwrites a single property value. Used by Database.finalize! to
   * normalize reference collections and rewrite back-references during
   * rename. Not part of the public mutation surface.
   */
  setPropertyValue(propertyId: string, value: unknown): this {
    this.properties.set(propertyId, value);
    return this;
  }

  get type(): EntityType | undefined {
    return this.cachedType;
  }

  get code(): string | undefined {
    return this.irdi?.code;
  }

  get version(): string | undefined {
    return this.getString(Pids.MDC_P002_1);
  }

  get revision(): string | undefined {
    return this.getString(Pids.MDC_P002_2);
  }

  get dates(): Dates {
    return {
      originalDefinition: this.getString(Pids.MDC_P003_1),
      currentVersion: this.getString(Pids.MDC_P003_2),
      currentRevision: this.getString(Pids.MDC_P003_3),
    };
  }

  preferredName(lang = "en"): string | undefined {
    return this.language(Pids.MDC_P004, lang);
  }

  shortName(lang = "en"): string | undefined {
    return this.language(Pids.MDC_P005, lang);
  }

  definition(lang = "en"): string | undefined {
    return this.language(Pids.MDC_P006, lang);
  }

  note(lang = "en"): string | undefined {
    return this.language(Pids.MDC_P008, lang);
  }

  remark(lang = "en"): string | undefined {
    return this.language(Pids.MDC_P009, lang);
  }

  description(lang = "en"): string | undefined {
    return this.language(Pids.MDC_P112, lang);
  }

  get sourceDocumentOfDefinition(): string | undefined {
    return this.getString(Pids.MDC_P006_1);
  }

  get example(): string | undefined {
    return this.getString(Pids.MDC_P113);
  }

  get dataObjectIdentifier(): string | undefined {
    return this.getString(Pids.MDC_P066);
  }

  get timeStamp(): string | undefined {
    return this.getString(Pids.MDC_P067);
  }

  get<T>(propertyId: string): T | undefined {
    return this.properties.get(propertyId) as T | undefined;
  }

  has(propertyId: string): boolean {
    return this.properties.has(propertyId);
  }

  keys(): string[] {
    return [...this.properties.keys()];
  }

  eachProperty(callback: (key: string, value: unknown) => void): void {
    this.properties.forEach((value, key) => callback(key, value));
  }

  equals(other: Entity): boolean {
    if (!(other instanceof Entity)) return false;
    if (this.type !== other.type) return false;
    if (this.irdi === null && other.irdi === null) return true;
    if (this.irdi === null || other.irdi === null) return false;
    return this.irdi.equals(other.irdi);
  }

  toJSON(): EntityJSON {
    return {
      irdi: this.irdi?.toString() ?? null,
      metaClassIrdi: this.metaClassIrdi,
      properties: Object.fromEntries(this.properties),
    };
  }

  protected getString(propertyId: string): string | undefined {
    const value = this.properties.get(propertyId);
    return typeof value === "string" ? value : undefined;
  }

  protected language(baseId: string, lang: string): string | undefined {
    return (
      this.getString(`${baseId}.${lang}`) ?? this.getString(`${baseId}.en`)
    );
  }
}
