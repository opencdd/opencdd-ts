# Plan 04 — Database powertype API

## Why

CDD's defining feature is powertype modeling: a class declared
`CATEGORICAL_CLASS` has subclasses that are themselves classes AND
instances of the categorical class. CLASS_REFERENCE data types and
sub_class_selection both depend on this.

The Ruby Database exposes:

- `categorical_classes` — all classes with `class_type=CATEGORICAL_CLASS`
- `instances_of(categorical_klass)` — valid options for a CLASS_REFERENCE value
- `valid_class_reference?(categorical_klass, value)` — predicate

The TS port has `Klass.categorical` and `Klass.categoricalInstances`
methods but no Database-level convenience API. Validators and editor
code can't ask "is this a valid CLASS_REFERENCE value?" without
re-implementing the walk.

## Scope

- Add `categoricalClasses()`, `instancesOf(klass)`, `validClassReference(klass, value)` to Database
- Re-export from `src/models/index.ts` (already covered by `export *`)
- Spec under `tests/database-powertype.test.ts`

## Approach

```ts
categoricalClasses(): Klass[] {
  return this.classes().filter(k => k.categorical);
}

instancesOf(categoricalKlass: Klass | IRDI | string): Klass[] {
  const k = this.coerceToKlass(categoricalKlass);
  if (!k) return [];
  return k.categoricalInstances(this);
}

validClassReference(categoricalKlass: ..., value: ...): boolean {
  const target = this.coerceToKlass(value);
  if (!target) return false;
  return this.instancesOf(categoricalKlass).some(k => k.irdi?.equals(target.irdi!) ?? false);
}
```

Mirrors the Ruby API names exactly (camelCase) so cross-reference is direct.

## Acceptance

- [x] Three methods shipped
- [x] Accept Klass, IRDI, or string (coercion helper)
- [x] Spec covers happy path + invalid input + non-categorical class returns []
- [x] All existing tests still pass

## Dependencies

- TODO.feat/02 (RelationType) — not strictly required but landing first avoids rebase churn

Required by TODO.feat/06 (R16 validator).
