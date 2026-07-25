---
title: API reference
description: Public exports of @opencdd/opencdd — models, validators, CDDAL, exporters, persistence.
published: 2026-07-25
section: Reference
order: 20
---

The `@opencdd/opencdd` package exports everything from a single
entry point. Below is the symbol map; for full TSDoc see the source
files in `src/`.

## Import

```ts
import { Database, Klass, Property } from "@opencdd/opencdd";
import * as Validators from "@opencdd/opencdd/validators";
```

## Models

The model layer lives in `src/models/` and is re-exported from the
package root.

### Core entities

| Symbol | Module | Description |
|--------|--------|-------------|
| `Entity` | `models/Entity` | Base class for all CDD entities |
| `Klass` | `models/Klass` | IEC 61360 ITEM_CLASS etc. |
| `Property` | `models/Property` | MDC_C003 — measurable property |
| `Unit` | `models/Unit` | MDC_C006 — measurement unit |
| `ValueList` | `models/ValueList` | MDC_C001 — enumerated list |
| `ValueTerm` | `models/ValueTerm` | MDC_C004 — list entry |
| `Relation` | `models/Relation` | MDC_C010 — association between classes |
| `ViewControl` | `models/ViewControl` | MDC_C007 — visibility rule |
| `ListOfUnit` | `models/ListOfUnit` | MDC_C013 — unit catalogue |

### Database

| Symbol | Module | Description |
|--------|--------|-------------|
| `Database` | `models/Database` | The in-memory entity store |
| `Database.fromJSON` | | Build a Database from JSON |
| `Database.prototype.findByIrdi` | | O(1) entity lookup |
| `Database.prototype.classes` | | All `Klass` entities |
| `Database.prototype.properties` | | All `Property` entities |
| `UnresolvedReference` | | Forward reference detected during load |

### Tree walkers

| Symbol | Module | Description |
|--------|--------|-------------|
| `ClassTree` | `models/ClassTree` | Class hierarchy walker |
| `RelationTree` | `models/RelationTree` | Relation graph walker |
| `CompositionTree` | `models/CompositionTree` | Part-of hierarchy |
| `EffectiveProperties` | `models/EffectiveProperties` | Declared + inherited props per class |
| `Visitor` | `models/Visitor` | Generic visitor base |

### Identifiers

| Symbol | Module | Description |
|--------|--------|-------------|
| `IRDI` | `models/IRDI` | International Registration Data Identifier |
| `Guid` | `models/Guid` | CDD-generated UUID |
| `MetaClass` | `models/MetaClass` | Metadata about entity types |
| `Languages` | `models/Languages` | Language code utilities |

### Supporting types

| Symbol | Module | Description |
|--------|--------|-------------|
| `Condition` | `models/Condition` | Predicate (expression or class_reference) |
| `ConditionExpression` | `models/Condition` | `left op right` form |
| `ConditionClassReference` | `models/Condition` | Bare IRDI/set form |
| `DataType` | `models/DataType` | IEC 61360 data type expression |
| `ValueFormat` | `models/ValueFormat` | Display format string |
| `AliasTable` | `models/AliasTable` | IRDI → symbol resolution |
| `InstanceRule` | `models/InstanceRule` | Categorical-class instance rules |

## Validators

The validators namespace is exported as a namespace to avoid
collisions with model symbols.

```ts
import * as Validators from "@opencdd/opencdd/validators";

const errors = Validators.runValidation(db);
```

| Symbol | Description |
|--------|-------------|
| `Runner` | The validation orchestrator |
| `runValidation` | Convenience: run all rules |
| `validateEntity` | Convenience: run self-contained rules for one entity |
| `Rule` | The rule interface |
| `ValidationError` | Structured error result |
| `R01IrdiRule` ... `R14HierarchyRule` | The 14 individual rules |

See [validator rules](/docs/reference/validator-rules/) for what each
rule checks.

## CDDAL

| Symbol | Module | Description |
|--------|--------|-------------|
| `Parser` | `cddal/Parser` | CDDAL text → AST |
| `Builder` | `cddal/Builder` | AST → CDDAL text |
| `AST.Document` | `cddal/AST` | Root AST node |
| `ParserError` | `cddal/Parser` | Parse failure |

## Exporters

| Symbol | Module | Description |
|--------|--------|-------------|
| `JsonExporter` | `exporters/Json` | Canonical JSON handoff |
| `YamlExporter` | `exporters/Yaml` | Human-readable YAML |
| `MermaidExporter` | `exporters/Mermaid` | Class diagram source |
| `CsvExporter` | `exporters/Csv` | Flat CSV table |

## Persistence

| Symbol | Module | Description |
|--------|--------|-------------|
| `Database.fromJSON` | `persistence` | Load from JSON |
| `Database.prototype.toJSON` | `persistence` | Serialize to JSON |

## Parcel schema

The Parcel xlsx schema is read-only. Reading is supported for
legacy in-process workflows; xlsx writing is the Ruby gem's job.

| Symbol | Module | Description |
|--------|--------|-------------|
| `WorkbookReader` | `parcel/WorkbookReader` | xlsx → Workbook |
| `FlatDirReader` | `parcel/FlatDirReader` | flat CSV dir → Workbook |
| `SheetSchema` | `parcel/SheetSchema` | Field map per sheet |
| `ParcelMetadata` | `parcel/Metadata` | Workbook-level metadata |

## TypeScript conventions

- **Extensionless imports** — bundler-required ESM.
- **Strict mode** with `noUncheckedIndexedAccess`.
- **Frozen value objects** — model classes call `Object.freeze(this)`.
- **No `double()` in tests** — specs use real model instances.

See [Architecture](/docs/architecture/) for how the layers fit
together.
