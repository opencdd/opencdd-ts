---
title: The four-layer ontology
description: IRDIs, classes, properties, value lists, and the powertype pattern that makes CDD unusual.
published: 2026-07-25
section: Concepts
order: 20
---

The IEC Common Data Dictionary is a four-layer ontology standardised
by IEC 61360 / 62656-1. This page is a brief orientation; for the
full conceptual walkthrough see the
[Ruby gem's ontology doc](https://opencdd.github.io/opencdd-ruby/docs/ontology/).

## The four layers

```
Application       ← concrete product data (out of scope for CDD)
  ↑
Class             ← ITEM_CLASS, e.g. "Length measuring instrument"
  ↑
Categorical       ← powertype of Class, e.g. "Product categories"
  ↑
Meta              ← top of the ontology (IEC 61360 root)
```

Each layer's instances ARE the layer below's classes. This is the
**powertype pattern** — the defining feature of CDD.

## The powertype pattern

In conventional OO or RDF, an "instance of a class" is an object.
In CDD, an "instance of a categorical class" is *another class*.

> A categorical class is a class whose instances are themselves classes.

Example:

- `Categorical class`: "Product categories" (e.g. "Flow instruments")
- Its instances: `ITEM_CLASS` "Electromagnetic flowmeter",
  `ITEM_CLASS` "Ultrasonic flowmeter", ...

This is why CDD is hard to map directly onto UML or OWL — those
formalisms don't have first-class powertype modelling. CDD does.

In the TS model:

- `Klass.classType` returns `"CATEGORICAL_CLASS"` for powertype classes.
- `Klass.instances` (on a categorical class) returns the set of
  classes that are its instances.
- The `Database` indexes both subclass relationships and
  instance-of relationships.

## IRDIs

Every entity in CDD has an **IRDI** (International Registration Data
Identifier, ISO/IEC 11179-6). It's the globally unique address.

```
0112/2///61360_4#AAA001
└──┘ └ └─────┬─────┘ └─┬──┘
registrant   scheme     code
```

- **registrant**: who assigned it (`0112` = IEC)
- **semantic**: usage flag (`2` = master)
- **scheme**: registration scope (`61360_4` = IEC 61360 v4)
- **code**: the human-readable code (`AAA001`)

See [IRDI concept page](/docs/concepts/irdi/) for parsing rules.

## Entity types

CDD defines 14 entity types, all modelled here:

| Entity | Ruby class | TS class |
|--------|-----------|----------|
| Class | `Opencdd::Klass` | `Klass` |
| Property | `Opencdd::Property` | `Property` |
| Unit | `Opencdd::Unit` | `Unit` |
| Value list | `Opencdd::ValueList` | `ValueList` |
| Value term | `Opencdd::ValueTerm` | `ValueTerm` |
| Relation | `Opencdd::Relation` | `Relation` |
| View control | `Opencdd::ViewControl` | `ViewControl` |
| List of units | `Opencdd::ListOfUnit` | `ListOfUnit` |

Plus synthetic types for tree walks (`ClassTree`, `RelationTree`,
`CompositionTree`) and the `EffectiveProperties` calculator.

## Further reading

- [IEC 61360](https://std.iec.ch) (paywalled)
- [cdd.iec.ch](https://cdd.iec.ch) — the canonical public instance
- The [opencdd-ruby ontology doc](https://opencdd.github.io/opencdd-ruby/docs/ontology/)
  — same concepts, more detail.
