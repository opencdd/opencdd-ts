# Plan 06 — R16 CLASS_REFERENCE validator rule

## Why

The Ruby gem ships `Opencdd::Validator::ClassReferenceRule` (R16) that
validates CLASS_REFERENCE data types: when a property's data_type is
`CLASS_REFERENCE(SomeCategoricalClass)`, the property value must be an
IRDI of a categorical instance of that class.

Without R16, the TS validator surface is incomplete. A Property
declared `CLASS_REFERENCE(EngineType)` with value `"AAA001"` (Vehicle,
not an engine option) passes — that's a real bug class for CDD
consumers.

The TS validator namespace has R01-R12 + R14. R13 doesn't exist in
Ruby either (it's skipped). R16 is the missing rule.

## Scope

- `src/validators/rules/R16ClassReferenceRule.ts`
- Register in `src/validators/index.ts`
- Spec under `tests/validator-r16.test.ts`

## Approach

```ts
export class R16ClassReferenceRule extends Rule {
  id = "R16";

  applies(context: RuleContext): boolean {
    if (!context.database) return false;
    const dt = parseDataType(context.dataType);
    return dt instanceof ClassReference;
  }

  call(value: unknown, context: RuleContext): boolean {
    if (value === null || value === undefined) return true;
    const target = this.categoricalTarget(context);
    if (!target) return true;
    return this.refs(value).every((r) =>
      context.database!.validClassReference(target, r),
    );
  }
}
```

Mirrors the Ruby rule structure exactly.

## Acceptance

- [x] R16 rule shipped and registered
- [x] Spec covers: valid powertype instance passes, non-instance fails, no database → skip, non-CLASS_REFERENCE data type → skip
- [x] All existing tests still pass

## Dependencies

- TODO.feat/04 (Database powertype API) — required for `validClassReference`
