# Server/Core Compatibility Policy

This document defines how `@koppajs/koppajs-language-server` tracks
`@koppajs/koppajs-language-core`.

## Source Of Truth

The effective compatibility contract is the dependency range in
`package.json`.

For the current release line, the server declares:

- `@koppajs/koppajs-language-core: ^0.1.4`

The server must not claim compatibility outside the range it actually declares
and validates.

## Current Policy

While both packages are in the `0.x` phase, compatibility is tracked
conservatively:

- server releases must validate against the exact minimum core version declared
  in `package.json`
- patch-level server releases may widen the core range within the same `0.1.x`
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
