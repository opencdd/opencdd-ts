# Plan 13 — ParseHelpers (N/A for TS)

## Why

The Ruby gem has `Opencdd::ParseHelpers` as a legacy back-compat
module. Its docstring says:

> Legacy module. The canonical home for collection parsing is now
> `Opencdd::StructuredValues`. ParseHelpers remains as a thin
> back-compat layer for code that hasn't migrated yet.

The TS port already has `StructuredValues.unwrapAndSplit`,
`rejoin`, `parseSynonyms`, `parseRefSet`, etc. There is no
back-compat surface to maintain — we never had the legacy module.

## Decision

**Do not port.** StructuredValues is the SSOT in TS. No ParseHelpers
module will be created.

## Notes

- The Ruby module exists because callers (notably the Entity mixin) haven't all migrated
- TS port benefits from starting clean — every caller uses StructuredValues directly
- If a back-compat shim is ever needed, it can be added later

## Status

N/A — closed by decision.
