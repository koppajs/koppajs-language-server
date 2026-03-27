# ADR 0002: Keep the Server Entrypoint Thin and Test Protocol Mapping Separately

## Status

Accepted

## Context

The repository originally implemented runtime wiring and all LSP mapping logic
inside a single `src/server.ts` file. That worked for a small package, but it
made focused tests harder: the only way to reach mapping behavior was through
the full connection module, even though most of the contract is pure data
translation.

## Decision

Keep `src/server.ts` as the only runtime composition root, and move pure LSP
translation logic into `src/protocol.ts`.

`src/server.ts` should own:

- connection creation,
- document lifecycle wiring,
- diagnostics publication,
- and delegation to `KpaLanguageService`.

`src/protocol.ts` should own:

- capability declaration,
- workspace-root collection and workspace-folder root reduction,
- and mapping between KoppaJS language-core shapes and LSP objects.

## Consequences

- The runtime lifecycle stays centralized and explicit.
- The protocol contract becomes directly testable through unit tests.
- The package adds one more source file, but avoids a larger abstraction layer.

## Alternatives Considered

- Keep everything in one file and rely on manual testing. Rejected because it
  leaves too much contract behavior unprotected.
- Build a full integration harness first. Rejected for now because the pure
  mapping layer can be protected much more cheaply.
