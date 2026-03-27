# Development Rules

## Default Style

- Prefer small, explicit TypeScript modules over broad abstractions.
- Keep runtime composition in `src/server.ts` and pure mapping in
  `src/protocol.ts`.
- Keep comments focused on invariants or non-obvious intent.
- Prefer direct value mapping over helper indirection when the logic is small.

## Dependency Rules

- `src/server.ts` may depend on `src/protocol.ts`, `@koppajs/koppajs-language-core`, and
  `vscode-languageserver`.
- `src/protocol.ts` may depend on `@koppajs/koppajs-language-core`, LSP types, and
  standard-library URL helpers.
- Tests may depend on built `dist/` artifacts and `node:test`, but production
  code must not depend on test files.
- Do not add editor-client or UI dependencies to this repository.

## Architectural Constraints

- Keep the LSP entrypoint explicit and centralized.
- Keep semantic truth in `@koppajs/koppajs-language-core`.
- Keep public behavior aligned across the capability declaration, protocol
  mapping, README, and spec.
- If mapping logic becomes complex enough to warrant tests, it belongs in
  `src/protocol.ts` or another pure module, not inline in the entrypoint.

## Naming and Layout

- Use `server.ts` for the composition root.
- Use descriptive singular names for mapping modules such as `protocol.ts`.
- Keep tests in `test/` when they validate built runtime contract behavior.

## Allowed Patterns

- Guard clauses for missing documents or unsupported URIs
- Pure mapping functions for diagnostics, hovers, completions, and symbols
- Pure workspace-root helpers for `initialize` and workspace-folder changes
- Small explicit constants for stable capability declarations
- Narrow refactors that improve testability without widening the public surface

## Forbidden Patterns

- Duplicating parser or semantic logic already owned by `@koppajs/koppajs-language-core`
- Hidden side effects outside the server entrypoint
- Silent capability changes without spec, test, and doc updates
- Broad abstraction layers for a tiny adapter surface
- Repository tooling claims that do not match `package.json`

## Required Change Matrix

| Change Type               | Required Updates                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| LSP capability change     | spec, `src/protocol.ts`, tests, `README.md`, roadmap if partial                                            |
| Diagnostic mapping change | spec, tests, `README.md` if user-visible                                                                   |
| Tooling or script change  | `CONTRIBUTING.md`, `TESTING_STRATEGY.md`, `docs/quality/quality-gates.md`, `docs/meta/tooling-baseline.md` |
| Module boundary change    | `ARCHITECTURE.md`, `docs/architecture/module-boundaries.md`, ADR                                           |
| Public contract change    | spec, tests, `README.md`, root governance docs as needed                                                   |

## Documentation Obligations

- User-visible LSP behavior requires a spec in `docs/specs/`.
- Structural decisions require an ADR in `docs/adr/`.
- Any architecture or workflow change must update the corresponding root
  governance document in the same change.
- If a limitation is intentional, document it instead of letting drift imply a
  broader contract.
