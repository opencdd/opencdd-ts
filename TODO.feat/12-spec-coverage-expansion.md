# Plan 12 — Spec coverage expansion (ONGOING)

## Why

The Ruby gem has 800+ specs across 70+ files. The TS port has ~50
specs across 6 files. Major surface areas lack automated coverage:

- Entity subclass behavior (Klass.powertype semantics, Property.effectiveValues, etc.)
- Database mutation (addEntity with duplicate IRDI, removeEntity cleanup)
- EffectiveProperties cycle handling
- CompositionTree depth limits
- RelationTree traversal
- Validator R02, R03, R07, R10, R11 message format
- All ValueFormat codes

## Scope

Ongoing. Each plan in this directory ships with its own focused spec
(plan 01 → visitor.test.ts, etc.). This plan captures the broader
gaps that don't fit a single plan.

## Approach

Prioritized list:

1. **High** — port Ruby specs that exercise the public API (database_spec.rb, entity_spec.rb, klass_spec.rb)
2. **Medium** — add tests for each value object's predicates (ClassType, RelationType, ValueFormat)
3. **Low** — message-format parity tests for each validator rule

Each spec file lands in its own commit so review is bounded.

## Acceptance

- [x] Plan 01-08 each ship with their own focused spec (done in this push)
- [ ] Port database_spec.rb → tests/database.test.ts
- [ ] Port entity_spec.rb → tests/entity.test.ts
- [ ] Port klass_spec.rb → tests/klass.test.ts
- [ ] Port property_spec.rb → tests/property.test.ts
- [ ] Message-format parity for R02, R03, R07, R10, R11

## Status

ONGOING. The 8 plans in this push add ~30 new tests. The full Ruby
spec port is a separate effort.
