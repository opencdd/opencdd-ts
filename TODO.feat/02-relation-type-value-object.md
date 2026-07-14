# Plan 02 — RelationType value object

## Why

`Relation.relationType` returns `string | undefined`. Callers do
string-compare: `r.relationType?.toUpperCase() === "PREDICATION"`.
No validation, no predicate helpers, no SSOT for the seven valid
values.

Ruby ships `Opencdd::RelationType` with a fixed value set and
predicate methods (`predication?`, `function?`, `hierarchical?`).

## Scope

- `src/models/RelationType.ts` — value object
- Update `Relation.relationType` getter to return `RelationType | undefined`
- Re-export from `src/models/index.ts`
- Spec under `tests/relation-type.test.ts`

## Approach

```ts
export class RelationType {
  static readonly VALUES = [
    "PREDICATION", "FUNCTION", "ASSOCIATION",
    "AGGREGATION", "COMPOSITION",
    "GENERALIZATION", "SPECIALIZATION",
  ] as const;
  readonly value: typeof VALUES[number];

  private constructor(value: typeof VALUES[number]) { this.value = value; }

  static parse(raw: string | null | undefined): RelationType | null { ... }

  get predication(): boolean { ... }
  get function(): boolean { ... }
  get hierarchical(): boolean { ... }
}
```

Private constructor + static parse = no invalid states. Mirrors the
existing `ClassType` and `ValueFormat` value objects for consistency.

## Acceptance

- [x] RelationType shipped with all 7 values + predicate methods
- [x] Relation.relationType returns RelationType | undefined
- [x] Relation.isPredication / isFunction use the new value object
- [x] Backwards-compatible: existing string-based callers continue to work via `.value` access
- [x] Spec covers parse, predicates, equality, invalid input

## Dependencies

None.
