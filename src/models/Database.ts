/**
 * Database — in-memory store for CDD entities.
 *
 * Ported from Cdd::Database (lib/cdd/database.rb). The Ruby original is
 * 579 lines; this port carries the in-memory core (entity store,
 * finalize!, lookup, rename, merge) but defers Parcel-workbook
 * integration to Phase 3.5 (SheetJS reader) and tree walkers to
 * Phase 3.8. Every deferred method is documented inline.
 *
 * Conventions:
 *   - Entities are stored once, keyed by IRDI.
 *   - The Database is the only writer of mutable entity state
 *     (parentIrdi, children, declaredPropertyIrdis).
 *   - `finalize!` runs the four linking passes and is idempotent.
 */

import { Entity } from "./Entity";
import { IRDI } from "./IRDI";
import { Klass } from "./Klass";
import { Property } from "./Property";
import { Unit } from "./Unit";
import { ValueList } from "./ValueList";
import { ValueTerm } from "./ValueTerm";
import { ViewControl } from "./ViewControl";
import { Relation } from "./Relation";
import { AliasTable } from "./AliasTable";
import { REGISTRY } from "./PropertyIds.generated";
import * as Pids from "./PropertyIds.generated";
import { type EntityType } from "./MetaClasses.generated";
import { EnumStringType, EnumReferenceType } from "./DataType";
import { parseIrdiList } from "./helpers";
import { codePropertyIdFor } from "./codeProperty";
import { referencePropertyIds, setOfRefsPropertyIds } from "./referenceKinds";
import { ClassTree } from "./ClassTree";
import { CompositionTree } from "./CompositionTree";
import { RelationTree } from "./RelationTree";
import { EffectiveProperties } from "./EffectiveProperties";
import { databaseToYaml, databaseFromYaml } from "../persistence/YamlDatabase";
import { saveToDirectory, loadFromDirectory } from "../persistence/EntityStore";
import { databaseFromJson, databaseToJson } from "../persistence/JsonDatabase";
import { DatabaseLinker } from "./DatabaseLinker";
import { Workbook } from "../parcel/Workbook";
import { ENTITY_CONSTRUCTORS } from "./entityConstructors";

export interface UnresolvedReference {
  readonly ref: string | null;
  readonly entity: Entity;
}

export class Database {
  private readonly entitiesByIrdi = new Map<string, Entity>();
  private readonly entitiesByCode = new Map<string, Entity[]>();
  private readonly entitiesByType = new Map<EntityType, Entity[]>();
  private readonly symbolTable = new Map<string, Entity>();
  private readonly classByPropertyIrdi = new Map<string, Entity[]>();
  private finalized = false;
  readonly unresolvedRefs: UnresolvedReference[] = [];
  readonly aliasTable = new AliasTable(true);
  readonly workbooks: Workbook[] = [];

  addEntity(entity: Entity): this {
    const irdi = entity.irdi;
    if (irdi === null) {
      this.unresolvedRefs.push({ ref: null, entity });
      return this;
    }
    const key = irdi.toString();
    const existing = this.entitiesByIrdi.get(key);
    if (existing !== undefined) {
      if (propertiesEqual(existing, entity)) return this;
      console.warn(`Duplicate IRDI ${key} — overwriting`);
      this.removeEntityFromIndexes(existing);
    }
    this.entitiesByIrdi.set(key, entity);
    if (irdi.code) {
      const list = this.entitiesByCode.get(irdi.code) ?? [];
      list.push(entity);
      this.entitiesByCode.set(irdi.code, list);
    }
    const type = entity.type;
    if (type) {
      const pool = this.entitiesByType.get(type) ?? [];
      pool.push(entity);
      this.entitiesByType.set(type, pool);
    }
    this.registerEntitySymbols(entity);
    this.finalized = false;
    return this;
  }

  private removeEntityFromIndexes(entity: Entity): void {
    const irdi = entity.irdi;
    if (irdi?.code) {
      const list = this.entitiesByCode.get(irdi.code);
      if (list) {
        const idx = list.indexOf(entity);
        if (idx >= 0) list.splice(idx, 1);
        if (list.length === 0) this.entitiesByCode.delete(irdi.code);
      }
    }
    const type = entity.type;
    if (type) {
      const pool = this.entitiesByType.get(type);
      if (pool) {
        const idx = pool.indexOf(entity);
        if (idx >= 0) pool.splice(idx, 1);
        if (pool.length === 0) this.entitiesByType.delete(type);
      }
    }
    if (irdi) this.entitiesByIrdi.delete(irdi.toString());
    this.removeFromPropertyIndex(entity);
    this.detachFromHierarchy(entity);
    this.purgeSymbolsOf(entity);
  }

  private purgeSymbolsOf(entity: Entity): void {
    for (const [key, value] of this.symbolTable) {
      if (value === entity) this.symbolTable.delete(key);
    }
  }

  removeEntity(irdi: IRDI | string | Entity): Entity | null {
    const target = irdi instanceof Entity ? irdi : this.find(irdi);
    if (!target) return null;
    this.removeEntityFromIndexes(target);
    this.finalized = false;
    return target;
  }

  private removeFromPropertyIndex(entity: Entity): void {
    for (const [key, list] of this.classByPropertyIrdi) {
      const idx = list.indexOf(entity);
      if (idx >= 0) {
        list.splice(idx, 1);
        if (list.length === 0) this.classByPropertyIrdi.delete(key);
      }
    }
  }

  private detachFromHierarchy(entity: Entity): void {
    if (entity instanceof Klass) {
      if (entity.parentIrdi) {
        const parent = this.find(entity.parentIrdi);
        if (parent instanceof Klass) {
          const idx = parent.children.indexOf(entity);
          if (idx >= 0) parent.children.splice(idx, 1);
        }
      }
      for (const child of [...entity.children]) {
        if (
          child instanceof Klass &&
          child.parentIrdi?.equals(entity.irdi ?? IRDI.fromShort(""))
        ) {
          child.parentIrdi = null;
        }
      }
    }
  }

  registerSymbol(name: string | null | undefined, entity: Entity): this {
    if (!name) return this;
    this.bindSymbol(name, entity);
    return this;
  }

  registerEntitySymbols(entity: Entity): this {
    const name = entity.preferredName("en");
    if (name) this.bindSymbol(name, entity);
    const code = entity.code;
    if (code) this.bindSymbol(code, entity);
    return this;
  }

  resolveReference(ref: string | Entity | null | undefined): Entity | null {
    if (ref === null || ref === undefined) return null;
    if (ref instanceof Entity) return ref;
    const key = String(ref).trim();
    if (key.length === 0) return null;
    if (key.includes("/") || key.includes("#")) {
      return this.find(IRDI.parse(key));
    }
    const symbol = this.symbolTable.get(key);
    if (symbol) return symbol;
    const byCode = this.findByCode(key);
    if (byCode) return byCode;
    const irdi = IRDI.parse(key);
    return irdi ? this.find(irdi) : null;
  }

  finalize(): this {
    if (this.finalized) return this;
    new DatabaseLinker(this).linkAll();
    this.finalized = true;
    return this;
  }

  /**
   * @internal Used by DatabaseLinker at the end of linkAll() so the
   * symbol table reflects the post-link entity graph. Public-only
   * because DatabaseLinker lives in a sibling file.
   */
  rebuildSymbolTableForLinker(): void {
    this.rebuildSymbolTable();
  }

  find(irdi: IRDI | string | null | undefined): Entity | null {
    if (irdi === null || irdi === undefined) return null;
    const key =
      irdi instanceof IRDI
        ? irdi.toString()
        : (IRDI.parse(irdi)?.toString() ?? null);
    if (key === null) return null;
    return this.entitiesByIrdi.get(key) ?? null;
  }

  findByCode(code: string): Entity | null {
    const matches = this.entitiesByCode.get(String(code));
    if (!matches || matches.length === 0) return null;
    return matches[0];
  }

  findAllByCode(code: string): Entity[] {
    return [...(this.entitiesByCode.get(String(code)) ?? [])];
  }

  findByName(name: string, type?: EntityType, lang = "en"): Entity | null {
    const pools = type
      ? [this.entitiesByType.get(type)].filter(
          (p): p is Entity[] => p !== undefined,
        )
      : [...this.entitiesByType.values()];
    const needle = name.toLowerCase();
    for (const pool of pools) {
      const hit = pool.find(
        (e) => (e.preferredName(lang) ?? "").toLowerCase() === needle,
      );
      if (hit) return hit;
    }
    return null;
  }

  classes(): Klass[] {
    return (this.entitiesByType.get("class") ?? []) as Klass[];
  }

  /**
   * Iterator over classes — avoids the array allocation that
   * `classes()` incurs. Use in hot paths that iterate per-frame or
   * inside other loops.
   */
  eachClass(): IterableIterator<Klass> {
    return (this.entitiesByType.get("class") ?? [])[
      Symbol.iterator
    ]() as IterableIterator<Klass>;
  }

  properties(): Property[] {
    return (this.entitiesByType.get("property") ?? []) as Property[];
  }

  units(): Unit[] {
    return (this.entitiesByType.get("unit") ?? []) as Unit[];
  }

  valueLists(): ValueList[] {
    return (this.entitiesByType.get("value_list") ?? []) as ValueList[];
  }

  valueTerms(): ValueTerm[] {
    return (this.entitiesByType.get("value_term") ?? []) as ValueTerm[];
  }

  relations(): Relation[] {
    return (this.entitiesByType.get("relation") ?? []) as Relation[];
  }

  viewControls(): ViewControl[] {
    return (this.entitiesByType.get("view_control") ?? []) as ViewControl[];
  }

  entitiesOfType(type: EntityType | string): Entity[] {
    return this.entitiesByType.get(type as EntityType) ?? [];
  }

  entities(): Entity[] {
    return [...this.entitiesByIrdi.values()];
  }

  /**
   * Iterator over every entity — avoids the array allocation that
   * `entities()` incurs on every call. Use in hot paths.
   */
  eachEntity(): IterableIterator<Entity> {
    return this.entitiesByIrdi.values();
  }

  count(type?: EntityType): number {
    return type
      ? (this.entitiesByType.get(type)?.length ?? 0)
      : this.entitiesByIrdi.size;
  }

  rootClasses(): Klass[] {
    return this.classes().filter((k) => k.parentIrdi === null);
  }

  categoricalClasses(): Klass[] {
    return this.classes().filter((k) => k.categorical);
  }

  classTree(): ClassTree {
    return new ClassTree(this);
  }

  effectiveProperties(): EffectiveProperties {
    return new EffectiveProperties(this);
  }

  compositionTree(klass: Klass | IRDI | string, maxDepth = 10) {
    const k = coerceToKlass(this, klass);
    if (!k) return null;
    return new CompositionTree(this).for(k, maxDepth);
  }

  relationTree(root: Relation | IRDI | string | null = null, maxDepth = 10) {
    return new RelationTree(this).for(root, maxDepth);
  }

  instancesOf(categoricalKlass: Klass | IRDI | string): Klass[] {
    const k = coerceToKlass(this, categoricalKlass);
    if (!k) return [];
    return k.categoricalInstances(this);
  }

  validClassReference(
    categoricalKlass: Klass | IRDI | string,
    value: Entity | IRDI | string | null | undefined,
  ): boolean {
    const target = coerceToKlass(this, value);
    if (!target) return false;
    return this.instancesOf(categoricalKlass).some(
      (k) => k.irdi?.equals(target.irdi ?? IRDI.fromShort("")) ?? false,
    );
  }

  propertiesOf(klass: Klass | IRDI | string): Property[] {
    const k = klass instanceof Klass ? klass : this.find(klass);
    if (!(k instanceof Klass)) return [];
    return k.declaredPropertyIrdis
      .map((i) => this.find(i))
      .filter((e): e is Property => e instanceof Property);
  }

  classesWithProperty(property: Property | IRDI | string): Entity[] {
    const irdi = asPropertyIrdi(property);
    if (!irdi) return [];
    return [...(this.classByPropertyIrdi.get(irdi.toString()) ?? [])];
  }

  /**
   * Registers an entity as the owner of a property (used by the
   * DatabaseLinker during the linkValueLists and linkPropertyClasses
   * passes). Public so an external linker can populate the index
   * without touching internal state directly.
   */
  registerPropertyOwner(propertyIrdi: IRDI, owner: Entity): this {
    linkPropertyClass(this.classByPropertyIrdi, propertyIrdi, owner);
    return this;
  }

  termsOf(valueList: ValueList | null): Entity[] {
    if (valueList === null) return [];
    return valueList.termIrdis
      .map((i) => this.find(i))
      .filter((e): e is Entity => e !== null);
  }

  relationsFor(
    domain?: Entity | IRDI | string | null,
    codomain?: Entity | IRDI | string | null,
  ): Relation[] {
    const domainIrdi = asEntityIrdi(domain);
    const codomainIrdi = asEntityIrdi(codomain);
    return this.relations().filter((r) => {
      const domainOk =
        !domainIrdi || r.domainIrdis.some((d) => d.equals(domainIrdi));
      const codomainOk =
        !codomainIrdi ||
        (r.codomainIrdi !== null && r.codomainIrdi.equals(codomainIrdi));
      return domainOk && codomainOk;
    });
  }

  functionsInvolving(property: Property | IRDI | string): Relation[] {
    const irdi = asPropertyIrdi(property);
    if (!irdi) return [];
    return this.relations().filter(
      (r) =>
        r.isFunction &&
        (r.domainIrdis.some((d) => d.equals(irdi)) ||
          (r.codomainIrdi !== null && r.codomainIrdi.equals(irdi))),
    );
  }

  merge(other: Database): this {
    if (!(other instanceof Database))
      throw new TypeError("merge expects a Database");
    for (const e of other.entities()) this.addEntity(e);
    return this.finalize();
  }

  each(callback: (entity: Entity) => void): void {
    this.entitiesByIrdi.forEach((e) => callback(e));
  }

  [Symbol.iterator](): Iterator<Entity> {
    return this.entitiesByIrdi.values();
  }

  semanticallyEquals(other: Database): boolean {
    if (!(other instanceof Database)) return false;
    if (this.entitiesByIrdi.size !== other.entitiesByIrdi.size) return false;
    return this.entities().every((e) => {
      const oe = other.find(e.irdi);
      return oe !== null && e.type === oe.type && propertiesEqual(e, oe);
    });
  }

  toYaml(): string {
    return databaseToYaml(this);
  }

  static fromYaml(yaml: string): Database {
    return databaseFromYaml(yaml);
  }

  toJson(): string {
    return databaseToJson(this);
  }

  static fromJson(json: string): Database {
    return databaseFromJson(json);
  }

  /**
   * Adds entities from a Parcel Workbook by iterating each Sheet and
   * constructing an Entity per row via the sheet's meta-class IRDI.
   * Idempotent — adding the same workbook twice is a no-op (rows
   * produce identical entities that Database.addEntity deduplicates).
   *
   * Ported from Opencdd::Database#add_workbook.
   */
  addWorkbook(workbook: Workbook): this {
    if (!this.workbooks.includes(workbook)) this.workbooks.push(workbook);
    for (const sheet of workbook.sheets) {
      // ENTITY_CONSTRUCTORS is keyed by meta-class CODE (e.g. "MDC_C002"),
      // not the full IRDI. Use the metadata.code accessor.
      const metaClassCode = sheet.metadata.metaClassCode;
      if (!metaClassCode) continue;
      const ctor = ENTITY_CONSTRUCTORS[metaClassCode];
      if (!ctor) continue;
      const codePid = codePropertyIdFor(metaClassCode);
      for (const row of sheet.rows) {
        const props: Record<string, unknown> = {};
        let codeValue: string | undefined;
        for (const [k, v] of Object.entries(row)) {
          if (k === "__row_index__") continue;
          if (v === null || v === undefined) continue;
          const s = String(v).trim();
          if (s.length === 0) continue;
          props[k] = s;
          if (codePid && k === codePid) codeValue = s;
        }
        const irdi = codeValue ? IRDI.parse(codeValue) : null;
        const entity = new ctor(irdi, props, metaClassCode);
        this.addEntity(entity);
      }
    }
    this.finalized = false;
    return this;
  }

  async saveToDirectory(path: string): Promise<void> {
    await saveToDirectory(this, path);
  }

  static async loadFromDirectory(path: string): Promise<Database> {
    return loadFromDirectory(path);
  }

  renameEntity(oldCode: string, newCode: string): this {
    if (oldCode === newCode) return this;
    const target = this.findByCode(oldCode);
    if (!target) return this;
    const clash = this.findByCode(newCode);
    if (
      clash &&
      clash.irdi !== null &&
      target.irdi !== null &&
      !clash.irdi.equals(target.irdi)
    ) {
      console.warn(
        `Cannot rename ${oldCode} → ${newCode}: target code already in use by ${clash.irdi.toString()}`,
      );
      return this;
    }
    const oldIrdi = target.irdi;
    if (oldIrdi === null) return this;
    const oldKey = oldIrdi.toString();
    const newIrdi = oldIrdi.withCode(newCode);
    const newKey = newIrdi.toString();
    this.entitiesByIrdi.delete(oldKey);
    const codeList = this.entitiesByCode.get(oldCode);
    if (codeList) {
      const idx = codeList.indexOf(target);
      if (idx >= 0) codeList.splice(idx, 1);
      if (codeList.length === 0) this.entitiesByCode.delete(oldCode);
    }
    const refPropertyIds = referencePropertyIds();
    for (const entity of this.entities()) {
      rewriteBackReferences(entity, oldIrdi, newIrdi, refPropertyIds);
    }
    const codePid = codePropertyIdFor(target.metaClassIrdi ?? "");
    target.setPropertyValue(codePid ?? Pids.MDC_P001, newCode);
    target.replaceIrdi(newIrdi);
    this.entitiesByIrdi.set(newKey, target);
    const newCodeList = this.entitiesByCode.get(newCode) ?? [];
    newCodeList.push(target);
    this.entitiesByCode.set(newCode, newCodeList);
    this.rebuildSymbolTable();
    this.finalized = false;
    return this;
  }

  toString(): string {
    return `#<Database classes=${this.classes().length} properties=${this.properties().length} units=${this.units().length} value_lists=${this.valueLists().length} value_terms=${this.valueTerms().length} relations=${this.relations().length} view_controls=${this.viewControls().length}>`;
  }

  private bindSymbol(name: string, entity: Entity): void {
    const existing = this.symbolTable.get(name);
    if (existing === entity) return;
    if (
      existing !== undefined &&
      (existing.irdi === null ||
        entity.irdi === null ||
        !existing.irdi.equals(entity.irdi))
    ) {
      const existingIrdi = existing.irdi?.toString() ?? "null";
      const newIrdi = entity.irdi?.toString() ?? "null";
      console.warn(
        `Symbol ${JSON.stringify(name)} already bound to ${existingIrdi}; ignoring rebind to ${newIrdi}`,
      );
      return;
    }
    this.symbolTable.set(name, entity);
  }

  private rebuildSymbolTable(): void {
    // Preserve Builder-registered symbolic names; only re-bind
    // preferred-name + code symbols (idempotent — bindSymbol
    // warns on conflict).
    for (const e of this.entities()) this.registerEntitySymbols(e);
  }
}

function linkPropertyClass(
  map: Map<string, Entity[]>,
  propertyIrdi: IRDI,
  owner: Entity,
): void {
  const key = propertyIrdi.toString();
  const list = map.get(key) ?? [];
  if (!list.includes(owner)) list.push(owner);
  map.set(key, list);
}

function rewriteBackReferences(
  entity: Entity,
  oldIrdi: IRDI,
  newIrdi: IRDI,
  refPropertyIds: readonly string[],
): void {
  for (const pid of refPropertyIds) {
    const raw = entity.properties.get(pid);
    if (raw === undefined) continue;
    const entry = REGISTRY[pid];
    if (!entry) continue;
    if (entry.valueKind === "identifier_ref") {
      const parsed = IRDI.parse(String(raw));
      if (parsed && parsed.equals(oldIrdi))
        entity.setPropertyValue(pid, newIrdi.toString());
    } else if (entry.valueKind === "set_of_refs") {
      const elements = parseIrdiList(raw);
      if (elements.length === 0) continue;
      const mapped = elements.map((i) => (i.equals(oldIrdi) ? newIrdi : i));
      entity.setPropertyValue(
        pid,
        `{${mapped.map((i) => i.toString()).join(",")}}`,
      );
    } else if (entry.valueKind === "class_ref") {
      const out = substituteClassRefValue(String(raw), oldIrdi, newIrdi);
      entity.setPropertyValue(pid, out);
    }
  }
}

function asEntityIrdi(
  arg: Entity | IRDI | string | null | undefined,
): IRDI | null {
  if (arg instanceof Entity) return arg.irdi;
  if (arg instanceof IRDI) return arg;
  if (arg === null || arg === undefined) return null;
  return IRDI.parse(arg);
}

function asPropertyIrdi(arg: Property | IRDI | string): IRDI | null {
  if (arg instanceof Property) return arg.irdi;
  if (arg instanceof IRDI) return arg;
  return IRDI.parse(arg);
}

function substituteClassRefValue(
  raw: string,
  oldIrdi: IRDI,
  newIrdi: IRDI,
): string {
  const out = raw.replace(oldIrdi.toString(), newIrdi.toString());
  if (oldIrdi.code === null || oldIrdi.code === newIrdi.code) return out;
  return out.replace(oldIrdi.code, newIrdi.code);
}

function propertiesEqual(a: Entity, b: Entity): boolean {
  if (a.properties.size !== b.properties.size) return false;
  for (const [k, v] of a.properties) {
    const other = b.properties.get(k);
    if (other !== v && String(other) !== String(v)) return false;
  }
  return true;
}

function coerceToKlass(
  db: Database,
  value: Entity | IRDI | string | null | undefined,
): Klass | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Klass) return value;
  const key = value instanceof IRDI ? value.toString() : value;
  const entity = db.resolveReference(key);
  return entity instanceof Klass ? entity : null;
}
