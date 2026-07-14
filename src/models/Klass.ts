import { Entity } from "./Entity";
import { IRDI } from "./IRDI";
import * as Pids from "./PropertyIds.generated";
import { parseIrdiList } from "./helpers";
import { ClassType } from "./ClassType";
import type { Database } from "./Database";

/**
 * A CDD Class entity (IEC 61360 meta-class MDC_C002).
 *
 * Ported from Cdd::Klass (lib/cdd/klass.rb). Provides typed accessors
 * for class-specific properties: superclass, class_type, is_case_of,
 * applicable/imported properties, sub_class_selection.
 *
 * Hierarchy state (parentIrdi, children, declaredPropertyIrdis) is
 * populated by Database.finalize! and by CDDAL Builder during linking.
 */
export class Klass extends Entity {
  static readonly PARENT_PROPERTY_IDS = [
    Pids.MDC_P010_1,
    Pids.MDC_P010,
  ] as const;

  parentIrdi: IRDI | null = null;
  readonly children: Klass[] = [];
  readonly declaredPropertyIrdis: IRDI[] = [];

  get classType(): ClassType | undefined {
    return ClassType.parse(this.get(Pids.MDC_P011)) ?? undefined;
  }

  get superclassTypeProperty(): string | undefined {
    return this.getString(Pids.MDC_P010_1) ?? this.getString(Pids.MDC_P010);
  }

  get superclassIrdi(): IRDI | null {
    const raw = this.superclassTypeProperty;
    if (!raw || raw.trim().length === 0) return null;
    return IRDI.parse(raw);
  }

  get parentPropertyId(): string {
    return Pids.MDC_P010;
  }

  get isCaseOfIrdis(): IRDI[] {
    return parseIrdiList(this.get(Pids.MDC_P013));
  }

  get applicablePropertyIrdis(): IRDI[] {
    return parseIrdiList(this.get(Pids.MDC_P014));
  }

  get importedPropertyIrdis(): IRDI[] {
    return parseIrdiList(this.get(Pids.MDC_P090));
  }

  get subClassSelectionIrdis(): IRDI[] {
    return parseIrdiList(this.get(Pids.MDC_P016));
  }

  get item(): boolean {
    return this.classType?.item ?? false;
  }

  get categorical(): boolean {
    return this.classType?.categorical ?? false;
  }

  /**
   * Categorical instances of this class — its valid options for
   * CLASS_REFERENCE data types and sub_class_selection values.
   * Returns subclasses whose `is_case_of` includes this class's IRDI.
   * Empty if this class is not categorical.
   *
   * Ported from Opencdd::Klass#categorical_instances.
   */
  categoricalInstances(database: Database): Klass[] {
    if (!this.categorical || this.irdi === null) return [];
    const target = this.irdi.toString();
    return database
      .classes()
      .filter((k) => k.isCaseOfIrdis.some((i) => i.toString() === target));
  }

  get valueClass(): boolean {
    return this.classType?.valueClass ?? false;
  }

  get message(): boolean {
    return this.classType?.message ?? false;
  }
}
