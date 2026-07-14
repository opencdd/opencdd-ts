/**
 * Visitor — base class for canonical Database traversal.
 *
 * Ported from Opencdd::Visitor (lib/opencdd/visitor.rb). Walks every
 * entity in canonical order (classes → properties → units → value_lists
 * → value_terms → relations → view_controls). Subclasses override only
 * the hooks they care about; defaults are no-ops.
 *
 * Use cases:
 *   - Validators: walk every entity, collect findings
 *   - Exporters: walk every entity, emit output
 *   - Editor: build reverse indexes (which class declares which property)
 *   - Diagnostics: count entities by type
 *
 * Example:
 *
 *   class Counter extends Visitor {
 *     count = 0;
 *     visitClass(klass: Klass): void { this.count++; }
 *   }
 *   const c = new Counter(db); c.visit(); c.count; // → number of classes
 */

import { Database } from "./Database";
import { Klass } from "./Klass";
import { Property } from "./Property";
import { Unit } from "./Unit";
import { ValueList } from "./ValueList";
import { ValueTerm } from "./ValueTerm";
import { Relation } from "./Relation";
import { ViewControl } from "./ViewControl";

export class Visitor {
  constructor(protected readonly database: Database) {}

  visit(): void {
    this.visitClasses();
    this.visitProperties();
    this.visitUnits();
    this.visitValueLists();
    this.visitValueTerms();
    this.visitRelations();
    this.visitViewControls();
  }

  visitClasses(): void {
    for (const klass of this.database.classes()) this.visitClass(klass);
  }

  visitClass(_klass: Klass): void {}

  visitProperties(): void {
    for (const property of this.database.properties())
      this.visitProperty(property);
  }

  visitProperty(_property: Property): void {}

  visitUnits(): void {
    for (const unit of this.database.units()) this.visitUnit(unit);
  }

  visitUnit(_unit: Unit): void {}

  visitValueLists(): void {
    for (const vl of this.database.valueLists()) this.visitValueList(vl);
  }

  visitValueList(_vl: ValueList): void {}

  visitValueTerms(): void {
    for (const vt of this.database.valueTerms()) this.visitValueTerm(vt);
  }

  visitValueTerm(_vt: ValueTerm): void {}

  visitRelations(): void {
    for (const r of this.database.relations()) this.visitRelation(r);
  }

  visitRelation(_r: Relation): void {}

  visitViewControls(): void {
    for (const vc of this.database.viewControls()) this.visitViewControl(vc);
  }

  visitViewControl(_vc: ViewControl): void {}
}
