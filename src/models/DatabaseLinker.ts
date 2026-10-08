/**
 * DatabaseLinker — owns the four graph-invariant passes that run
 * during `Database.finalize()`.
 *
 * Extracted from Database. Database is the storage
 * layer; DatabaseLinker is the linker. The split keeps Database.ts
 * focused on lookup + storage and gives the linking logic a single
 * home that's easier to test and reason about.
 *
 * The four passes:
 *
 *   1. normalizeReferenceCollections — re-wrap `(...)` collections
 *      into the canonical `{...}` set form so downstream code can
 *      assume one shape.
 *   2. linkClassHierarchy — resolve each class's superclass
 *      reference, attach parentIrdi + children.
 *   3. linkPropertyClasses — walk Relations and Property
 *      definition_class fields to populate the
 *      `classByPropertyIrdi` reverse index (Klass → Property edges).
 *   4. linkValueLists — wire Property → ValueList edges into the
 *      same reverse index.
 *
 * Symbol-table rebuild runs last so post-link entities are
 * resolvable by their preferred name + code.
 *
 * Each pass is idempotent; calling linkAll() twice is safe.
 */

import { Database } from "./Database";
import { Klass } from "./Klass";
import { Property } from "./Property";
import { ValueList } from "./ValueList";
import { IRDI } from "./IRDI";
import { EnumStringType, EnumReferenceType } from "./DataType";
import { setOfRefsPropertyIds } from "./referenceKinds";

export class DatabaseLinker {
  constructor(readonly database: Database) {}

  linkAll(): void {
    this.normalizeReferenceCollections();
    this.linkClassHierarchy();
    this.linkPropertyClasses();
    this.linkValueLists();
    this.database.rebuildSymbolTableForLinker();
  }

  private normalizeReferenceCollections(): void {
    const setPropertyIds = setOfRefsPropertyIds();
    for (const entity of this.database.eachEntity()) {
      for (const pid of setPropertyIds) {
        const val = entity.properties.get(pid);
        if (val === undefined) continue;
        const s = String(val).trim();
        if (!s.startsWith("(") || !s.endsWith(")")) continue;
        const inner = s.slice(1, -1);
        const elements = inner
          .split(",")
          .map((x) => x.trim())
          .filter((x) => x.length > 0);
        entity.setPropertyValue(pid, `{${elements.join(",")}}`);
      }
    }
  }

  private linkClassHierarchy(): void {
    for (const klass of this.database.classes()) {
      if (klass.parentIrdi !== null) continue;
      const parentId = klass.parentPropertyId;
      const parentRaw = klass.properties.get(parentId);
      if (parentRaw === undefined) continue;
      const s = String(parentRaw).trim();
      if (s.length === 0) continue;
      const target = this.database.resolveReference(s);
      if (!target || !(target instanceof Klass)) continue;
      klass.parentIrdi = target.irdi;
      if (!target.children.includes(klass)) target.children.push(klass);
    }
  }

  private linkPropertyClasses(): void {
    for (const r of this.database.relations()) {
      if (!r.isPredication && !r.isFunction) continue;
      if (r.domainIrdis.length === 0) continue;
      const codomainIrdi = r.codomainIrdi;
      if (codomainIrdi === null) continue;
      for (const d of r.domainIrdis) {
        const src = this.database.find(d);
        const dst = this.database.find(codomainIrdi);
        if (!src || !dst) continue;
        if (src instanceof Klass && dst instanceof Property) {
          if (
            dst.irdi &&
            !src.declaredPropertyIrdis.some((i) => i.equals(dst.irdi!))
          ) {
            src.declaredPropertyIrdis.push(dst.irdi!);
          }
          this.database.registerPropertyOwner(dst.irdi!, src);
        } else if (src instanceof Property && dst instanceof Klass) {
          if (
            src.irdi &&
            !dst.declaredPropertyIrdis.some((i) => i.equals(src.irdi!))
          ) {
            dst.declaredPropertyIrdis.push(src.irdi!);
          }
          this.database.registerPropertyOwner(src.irdi!, dst);
        }
      }
    }
  }

  private linkValueLists(): void {
    for (const prop of this.database.properties()) {
      if (!prop.isEnum) continue;
      const dt = prop.dataTypeParsed;
      if (dt === null || typeof dt === "string") continue;
      if (!(dt instanceof EnumStringType) && !(dt instanceof EnumReferenceType))
        continue;
      const target = this.database.resolveReference(dt.valueListIdentifier);
      if (target instanceof ValueList && prop.irdi) {
        this.database.registerPropertyOwner(prop.irdi, target);
      }
    }
  }
}
