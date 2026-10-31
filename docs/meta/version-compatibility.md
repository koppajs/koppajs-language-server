# Server/Core Compatibility Policy

This document defines how `@koppajs/koppajs-language-server` tracks
`@koppajs/koppajs-language-core`.

## Source Of Truth

The effective compatibility contract is the dependency range in
`package.json`.

For the current release line, the server declares:

- `@koppajs/koppajs-language-core: ^0.2.1`

The server must not claim compatibility outside the range it actually declares
and validates.

## Ecosystem Validation Targets

The maintained integration fixture uses the published packages:

| Package                        | Minimum tested version |
| ------------------------------ | ---------------------- |
| `@koppajs/koppajs-core`        | `3.0.11`               |
| `@koppajs/koppajs-router`      | `0.1.8`                |
| `@koppajs/koppajs-vite-plugin` | `2.0.0`                |
| `@koppajs/koppajs-kpa-check`   | `0.2.0`                |
| `vite`                         | `8.3.5`                |

These are development-only compatibility targets, not server runtime dependencies.
The fixture verifies production compilation and diagnostic agreement, not browser
mounting or router navigation. LSP behavior is separately covered by the stdio suite.
The server requires language-core `^0.2.1` and validates its exact minimum
`0.2.1`. The KPA Check 0.2.0 compatibility target declares `^0.2.0`; the
lockfile resolves its compatible core dependency to the same `0.2.1` release.

The Node.js engine policy is `^22.13.0 || ^24.0.0 || >=26.0.0`, matching
language-core. TypeScript stays on `~6.0.3`, within the current TypeScript-ESLint
peer range; Node type declarations stay on the supported Node 22 baseline.

Source analysis follows explicit `Core.take(...)` registrations and canonical
component return values. It does not execute Vite transforms or resolve aliases
configured only in Vite or inherited tsconfig files. Route-table navigation is
not part of the server contract.

## Current Policy

While both packages are in the `0.x` phase, compatibility is tracked
conservatively:

- server releases must validate against the exact minimum core version declared
  in `package.json`
- patch-level server releases may widen the core range within the same `0.2.x`
  line when the LSP contract does not change
- a new core minor line requires an explicit server review, integration
  verification, and a server release that updates the dependency range

## Request-Visible Core Changes

If `@koppajs/koppajs-language-core` changes behavior that is visible through
LSP, the language-server package must be reviewed even when no server source
code changes are needed.

Examples:

- diagnostics or code-action metadata changes
- hover, definition, references, rename, or completion shape changes
- workspace invalidation behavior that changes what open documents refresh

When that happens:

1. update the dependency range in `package.json`
2. update the changelog if the user-visible behavior changed
3. run the maintained stdio integration tests
4. update specs and docs if the LSP contract changed

## Release Rule

Before publishing a server release:

- run `npm run validate`
- run `npm run release:check`
- confirm the declared core range is the range you intend to support

If the intended support window is broader than the declared range, widen the
range first and verify it in the same change.
