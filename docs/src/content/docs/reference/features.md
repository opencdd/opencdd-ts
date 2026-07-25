---
title: Feature parity
description: What @opencdd/opencdd supports relative to the Ruby gem.
published: 2026-07-25
section: Reference
order: 40
---

The TS package is a port of the Ruby
[`opencdd`](https://opencdd.github.io/opencdd-ruby/) gem. It tracks
the gem's behaviour closely but adds TS-only conveniences. The table
below summarises parity status.

## Status legend

- ✅ **Parity** — TS port matches Ruby semantics.
- 🟡 **TS-only** — feature added on the TS side, not in Ruby.
- 🔜 **Pending** — Ruby has it; TS doesn't yet.

## Format support

| Format | Read | Write |
|--------|------|-------|
| `database.json` | ✅ | ✅ |
| CDDAL plain-text | ✅ | ✅ |
| YAML | ✅ | ✅ |
| Parcel xlsx | ✅ (deserialise only) | — (Ruby's job) |
| Parcel flat-dir CSV | ✅ | — |
| Mermaid class diagrams | — | 🟡 TS-only |
| CSV flat tables | — | 🟡 TS-only |

## Entity types

| Entity | Ruby class | TS port |
|--------|-----------|---------|
| `Klass` | ✅ | ✅ |
| `Property` | ✅ | ✅ |
| `Unit` | ✅ | ✅ |
| `ValueList` | ✅ | ✅ |
| `ValueTerm` | ✅ | ✅ |
| `Relation` | ✅ | ✅ |
| `ViewControl` | ✅ | ✅ |
| `ListOfUnit` | ✅ | ✅ |

## Validators

| Rule | Ruby | TS |
|------|------|----|
| R01 IRDI format | ✅ | ✅ |
| R02 Uniqueness | ✅ | ✅ |
| R03 Type | ✅ | ✅ |
| R04 Enum | ✅ | ✅ |
| R05 Format | ✅ | ✅ |
| R06 Pattern | ✅ | ✅ |
| R07 Mandatory | ✅ | ✅ |
| R08 Reference | ✅ | ✅ |
| R09 Set | ✅ | ✅ |
| R10 Synonym | ✅ | ✅ |
| R11 Condition | ✅ | ✅ |
| R12 Data type | ✅ | ✅ |
| R14 Hierarchy acyclicity | ✅ | ✅ |

## TS-only conveniences

These are TS additions with no Ruby equivalent (yet):

- `EffectiveProperties` — pre-computed declared + inherited property
  sets per class.
- `ClassTree`, `RelationTree`, `CompositionTree` — frozen tree
  projections for UI rendering.
- `MermaidExporter`, `CsvExporter` — format adapters tailored for
  the Browser and Editor.
- `InstanceRule` — categorical-class instance-rule walker.

## Known gaps

These are tracked in the issue tracker:

- **Per-item YAML directory support** — Ruby's per-item YAML layout
  is not yet readable from TS. The JSON contract (`database.json`)
  is currently the only persistence format. (See TODO.astro/00 in
  the browser repo for the migration plan.)
- **xlsx writing** — TS does not write xlsx files. Use the Ruby gem.
- **Parcel sheet directives** — partially supported; some advanced
  directives (sheet-level metadata blocks) are not yet parsed.
