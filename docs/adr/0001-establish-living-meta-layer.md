# ADR 0001: Establish a Living Meta Layer

## Status

Accepted

## Context

The repository started as a minimal package with source code and a short README
only. That kept setup light, but it also meant that architecture, testing
expectations, contributor workflow, and public-contract boundaries were
implicit. For a package that exists to expose a stable LSP contract, implicit
rules create avoidable drift.

## Decision

Adopt a living meta layer for this repository:

- root governance documents for architecture, development rules, testing, and
  decision precedence
- `docs/architecture/`, `docs/adr/`, `docs/specs/`, `docs/quality/`, and
  `docs/meta/` for supporting detail
- the rule that code, tests, and docs change together when the contract changes

## Consequences

- Architectural intent and workflow rules become explicit and reviewable.
- Contributors have a documented place to resolve ambiguity.
- The repository gains maintenance overhead, but that overhead is deliberate and
  smaller than allowing contract drift.

## Alternatives Considered

- Keep guidance only in code comments and the README. Rejected because it would
  not cover testing, specs, and decision precedence with enough precision.
- Add only a single architecture document. Rejected because workflow and quality
  constraints would still remain implicit.
