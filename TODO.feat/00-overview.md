# TODO.feat/00-overview.md

Engineering plan register for the post-1.0 architecture-and-parity push.
Each file in this directory is a focused, actionable plan in the style
of the Ruby gem's `TODO.impl/` directory.

## Status legend

- **DONE** — implemented; specs green
- **DEFERRED** — captured for a later PR; not in this push
- **N/A** — does not apply to the TS port (e.g. Ruby-only codegen)

## Plans

| #   | Title                                                                  | Status   |
| --- | ---------------------------------------------------------------------- | -------- |
| 01  | [Visitor traversal seam](01-visitor-traversal-seam.md)                 | DONE     |
| 02  | [RelationType value object](02-relation-type-value-object.md)          | DONE     |
| 03  | [Extract ValueSerializer from Builder](03-extract-value-serializer.md) | DONE     |
| 04  | [Database powertype API](04-database-powertype-api.md)                 | DONE     |
| 05  | [Database traversal shortcuts](05-database-traversal-shortcuts.md)     | DONE     |
| 06  | [R16 CLASS_REFERENCE validator rule](06-r16-class-reference-rule.md)   | DONE     |
| 07  | [Field registry + typed reader](07-field-registry.md)                  | DONE     |
| 08  | [Polymorphic YamlEntity](08-polymorphic-yaml-entity.md)                | DONE     |
| 09  | [Entity options-bag constructor](09-entity-options-constructor.md)     | DEFERRED |
| 10  | [Database linker/storage split](10-database-linker-split.md)           | DEFERRED |
| 11  | [Database iterator API](11-database-iterator-api.md)                   | DEFERRED |
| 12  | [Spec coverage expansion](12-spec-coverage-expansion.md)               | ONGOING  |
| 13  | [ParseHelpers — N/A for TS](13-parse-helpers-na.md)                    | N/A      |

## Architectural principles applied

- **OCP** — new behavior = new class, not new branch in a switch
- **MECE** — each concern lives in exactly one module
- **DRY** — one source of truth for property IDs, field shapes, value-serializer logic
- **Model-driven** — value objects over primitive strings (RelationType, ClassType, ValueFormat, etc.)
- **Semantically-driven** — class names + method names mirror the CDD ontology (categorical_instances, applicable_properties, etc.)
- **Performance-conscious** — but not at the cost of clarity

## Architectural findings (2026-07-14)

These observations drive the plans above. Captured here so future
work has the context.

1. **Database is too big.** 489 lines doing storage, linking, traversal,
   and YAML delegation. Splitting storage from graph-linking is the
   largest deferred refactor (TODO.feat/10).
2. **Entity constructor is positional.** The smoke test was silently
   buggy because `new Klass({ irdi, code })` doesn't typecheck tests
   (tests aren't in the tsconfig include). Options-bag constructor
   would prevent the bug class (TODO.feat/09).
3. **YamlEntity is a giant switch.** Adding a new entity type means
   editing the switch. Polymorphic dispatch via per-subclass methods
   fixes this (TODO.feat/08).
4. **No typed property IDs.** Property IDs are `string` everywhere;
   passing the wrong ID compiles. Brand types would catch typos at
   compile time. Captured in TODO.feat/07's "future work" section.
5. **Builder inlines value serialization.** Ruby's ValueSerializer is
   stateless and reusable; TS inlines it. Extracting (TODO.feat/03)
   makes it shareable by the AST-level Serializer and the Builder.
6. **Missing powertype API.** The Ruby Database has `categorical_classes`,
   `instances_of`, `valid_class_reference?` — these are how the
   CLASS_REFERENCE data type is queried. Without them, the TS port
   can't validate CLASS_REFERENCE values (TODO.feat/04, TODO.feat/06).
7. **No visitor seam.** Every consumer (validators, editor, browser)
   writes its own tree walk. A base Visitor class (TODO.feat/01)
   centralizes the pattern.
8. **RelationType is a string.** `relation.relationType` returns
   `string | undefined`. Should be a typed value object with
   predicate methods (TODO.feat/02).
