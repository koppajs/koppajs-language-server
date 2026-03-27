# AI Constitution

## Mission

This repository delivers a focused `@koppajs/koppajs-language-server` package. The package
must stay small, explicit, and traceable: `@koppajs/koppajs-language-core` owns the
language semantics, while this repo owns only the LSP adapter layer.

## Core Principles

- Preserve the LSP contract before optimizing internals.
- Keep the server entrypoint thin and runtime wiring easy to inspect.
- Prefer pure protocol-mapping functions over hidden behavior.
- Treat documentation as part of the architecture.
- Keep the public surface minimal: executable server module path first, library
  API only if real consumers require it.

## Mandatory AI Workflow

1. Read [DECISION_HIERARCHY.md](DECISION_HIERARCHY.md),
   [ARCHITECTURE.md](ARCHITECTURE.md),
   [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md),
   [TESTING_STRATEGY.md](TESTING_STRATEGY.md), and the relevant spec/ADRs before
   editing code.
2. Prefer the smallest change that keeps the adapter contract explicit.
3. For user-visible LSP behavior changes, follow `spec -> tests -> implementation -> documentation`.
4. Reuse the existing thin-entrypoint plus pure-mapping split instead of adding
   abstraction layers.
5. Update the meta layer in the same change whenever architecture, workflow, or
   public behavior changes.

## Hard Constraints

- Do not move semantic ownership out of `@koppajs/koppajs-language-core` into this repo.
- Do not silently change advertised LSP capabilities, trigger characters,
  diagnostic source, or severity defaults.
- Do not introduce editor-client behavior such as snippets, activation logic, or
  UI concerns into this package.
- Do not claim CI, coverage, or integration guarantees that the repo does not
  actually enforce.
- Do not leave documentation and runtime behavior out of sync.

## AI Collaboration Rules

- Explain tradeoffs in terms of contract clarity, maintainability, and
  verifiability.
- When a change alters the LSP contract, update the relevant spec in
  `docs/specs/`.
- When a change alters module boundaries, add or update an ADR.
- When verification is incomplete, state the gap explicitly.

## Self-Evolution Triggers

- New module boundary or runtime composition rule: update
  [ARCHITECTURE.md](ARCHITECTURE.md),
  [docs/architecture/module-boundaries.md](docs/architecture/module-boundaries.md),
  and the relevant ADR.
- New coding pattern or shared repository constraint: update
  [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md).
- New or changed user-visible LSP behavior: update the relevant spec, tests, and
  [README.md](README.md).
- New tooling or quality gate: update
  [TESTING_STRATEGY.md](TESTING_STRATEGY.md),
  [docs/quality/quality-gates.md](docs/quality/quality-gates.md), and
  [docs/meta/tooling-baseline.md](docs/meta/tooling-baseline.md).
- Any documentation drift: fix it immediately or record it in
  [ROADMAP.md](ROADMAP.md).
