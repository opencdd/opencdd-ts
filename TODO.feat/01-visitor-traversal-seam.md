# Plan 01 — Visitor traversal seam

## Why

The Ruby gem exposes `Opencdd::Visitor` as a base class that walks a
Database in canonical order (classes → properties → units → value_lists
→ value_terms → relations → view_controls). Every consumer —
validators, the editor's reverse-index builder, the browser's bundle
walker — subclasses it.

The TS port has no equivalent. Every consumer hand-rolls the walk:
`for (const k of db.classes()) { ... }` repeated across files. Adding
a new entity type means finding every walk and updating it. OCP
violation.

## Scope

- `src/models/Visitor.ts` — base class with overridable hooks
- Re-exports from `src/models/index.ts`
- Spec under `tests/visitor.test.ts`

## Approach

```ts
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
    for (const k of this.database.classes()) this.visitClass(k);
  }
  visitClass(klass: Klass): void {}
  // ... one hook per entity type
}
```

Subclasses override only the hooks they care about. Default hooks are
no-ops, so partial visitors are first-class.

## Acceptance

- [x] Visitor base class shipped
- [x] Tests cover the canonical walk order and per-hook override
- [x] Re-exported from the root barrel
- [x] No regression in existing tests

## Dependencies

None.
