---
title: Documentation
description: Guides, references, and deep dives for using @opencdd/opencdd.
published: 2026-07-25
section: Getting Started
order: 0
---

import { getCollection } from "astro:content";

The `@opencdd/opencdd` package is the TypeScript port of the Ruby
[`opencdd`](https://opencdd.github.io/opencdd-ruby/) gem. It reads
CDD data (CDDAL plain-text and YAML/JSON dumps from the Ruby gem),
walks the four-layer IEC 61360 ontology, validates content against
14 rules (R01–R14), and emits CDDAL, JSON, YAML, Mermaid, and CSV.

## Where to start

- **New to CDD?** Read the [ontology overview](/docs/ontology/) —
  it explains IRDIs, classes, properties, powertypes, and why CDD
  is different from UML/RDF/OWL.
- **Just want to load data?** Jump to [Getting started](/docs/getting-started/).
- **Looking for an export?** See the [API reference](/docs/reference/api/).
- **Validating content?** See the [validator rules](/docs/reference/validator-rules/).

## What this package is (and isn't)

**Is:**

- A TypeScript / ESM library for reading and walking CDD content.
- A shared model layer between the
  [OpenCDD Browser](https://opencdd.github.io/) and the Editor.
- A port of the Ruby gem — semantics follow the Ruby implementation.

**Isn't:**

- A replacement for the Ruby gem (the Ruby gem generates
  `database.json`; this package consumes it).
- A Parcel xlsx reader. The Ruby gem reads xlsx; the JSON contract
  between Ruby and TS is the canonical handoff.
- A server or runtime. It's a pure library.
