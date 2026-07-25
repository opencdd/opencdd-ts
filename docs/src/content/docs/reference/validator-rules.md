---
title: Validator rules
description: The 14 rules (R01–R14) that check well-formedness of a CDD database.
published: 2026-07-25
section: Reference
order: 30
---

The validators layer applies 14 rules (R01–R14) to a `Database`
instance. Each rule is a small class implementing the `Rule`
interface; the `Runner` orchestrates them.

```ts
import * as Validators from "@opencdd/opencdd/validators";

const errors = Validators.runValidation(db);
for (const err of errors) {
  console.warn(`${err.ruleId}: ${err.message}`);
}
```

Each `ValidationError` has:

- `ruleId` — `"R01"` through `"R14"`
- `entityIrdi` — IRDI of the offending entity (if applicable)
- `field` — Property ID or field name (if applicable)
- `value` — The offending value
- `message` — Human-readable description

## Rule list

| Rule | Class | What it checks |
|------|-------|----------------|
| **R01** | `R01IrdiRule` | Every entity has a syntactically valid IRDI |
| **R02** | `R02UniquenessRule` | No two entities share an IRDI |
| **R03** | `R03TypeRule` | Property values match the entity's metaclass field type |
| **R04** | `R04EnumRule` | Enumerated values exist in their value list |
| **R05** | `R05FormatRule` | Format strings are well-formed |
| **R06** | `R06PatternRule` | String values match their declared regex |
| **R07** | `R07MandatoryRule` | Required fields are present |
| **R08** | `R08ReferenceRule` | IRDI references resolve to an existing entity |
| **R09** | `R09SetRule` | Set fields contain homogeneous elements |
| **R10** | `R10SynonymRule` | Synonyms are well-formed (name, lang) tuples |
| **R11** | `R11ConditionRule` | Condition expressions are syntactically valid |
| **R12** | `R12DataTypeRule` | Data type expressions are valid IEC 61360 type names |
| **R13** | (reserved) | Reserved for future use |
| **R14** | `R14HierarchyRule` | Class and composition hierarchies are acyclic |

## Self-contained vs database rules

Rules are grouped by their dependency on the rest of the database:

- **Self-contained rules** (R01–R07, R09–R12) only inspect a single
  entity at a time. They can run before reference resolution.
- **Database rules** (R08, R14) need the full graph. They run after
  the `DatabaseLinker` resolves forward references.
- **R13** is reserved — currently no implementation; the slot is
  kept for symmetry with the IEC validator numbering.

Use `Validators.SELF_CONTAINED_RULES` and `Validators.DATABASE_RULES`
to run a subset, or `Validators.allRules` for the full list.

```ts
import { Validators } from "@opencdd/opencdd/validators";

// Run only self-contained rules
const earlyErrors = Validators.runValidation(db, {
  rules: Validators.SELF_CONTAINED_RULES,
});
```

## Adding a new rule

1. Add a class in `src/validators/rules/R15MyRule.ts` implementing
   the `Rule` interface.
2. Register it in `src/validators/Runner.ts`.
3. Re-export from `src/validators/index.ts`.
4. Add a spec in `tests/`.

The rule interface:

```ts
interface Rule {
  ruleId: string;
  applies(ctx: ValidationContext): boolean;
  call(value: unknown, ctx: ValidationContext): boolean;
  message(value: unknown): string;
}
```

See `R11ConditionRule.ts` for a typical implementation.
