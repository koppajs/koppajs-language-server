# Module Boundaries

| Module            | Responsibility                                                      | Allowed Dependencies                                             | Must Not Own                                              |
| ----------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| `src/server.ts`   | Composition root, event wiring, diagnostics publication             | `src/protocol.ts`, `@koppajs/koppajs-language-core`, LSP runtime | pure mapping tables duplicated across handlers            |
| `src/protocol.ts` | Pure mapping between KoppaJS shapes, workspace roots, and LSP types | `@koppajs/koppajs-language-core` types, LSP types, URL helpers   | connection lifecycle, document storage, semantic analysis |
| `test/`           | Contract and integration verification for built runtime behavior    | `dist/`, `node:test`, `child_process`, LSP type package          | production runtime logic                                  |
| `dist/`           | Generated runtime output used for execution and packaging           | generated only                                                   | hand-maintained source of truth                           |

## Boundary Rules

- Keep semantic reasoning in `@koppajs/koppajs-language-core`; this repo only adapts it.
- New helpers that do not need runtime state should remain pure and live with
  `src/protocol.ts` or another explicit mapping module.
- Workspace-folder URI filtering and root-path reduction belong in
  `src/protocol.ts`, not inline in the entrypoint.
- Avoid importing `src/server.ts` from any other production module.
- If a new module changes how responsibilities are split, capture the decision
  in an ADR.
