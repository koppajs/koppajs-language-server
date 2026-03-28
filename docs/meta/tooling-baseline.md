# Tooling Baseline

## Active Tooling

The repository currently uses:

- TypeScript (`tsc`) for compilation and typechecking
- ESLint for static analysis
- Prettier for formatting
- `node:test` for contract tests and stdio-LSP integration tests against the
  built runtime
- npm with `package-lock.json` as the package-management baseline
- `.nvmrc` for the maintainer-default Node.js line
- `.npmrc` for install-time engine enforcement
- Node-based repository scripts for structural docs, semantic docs, and
  meta-layer validation
- GitHub Actions for CI validation on Node.js 22 and 24 and tag-driven release
  publishing on Node.js 22

## Script Surface

The supported scripts are:

- `npm run check:docs`
- `npm run check:meta`
- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run prepack`
- `npm run release:check`
- `npm test`
- `npm run check`
- `npm run validate`

## Deliberate Exclusions

The repository intentionally does not currently include:

- a bundler
- Playwright or browser-E2E tooling
- Husky or lint-staged hooks
- coverage thresholds or coverage-report tooling
- a full editor-host automation harness beyond the maintained stdio-LSP tests

These exclusions are intentional because the package has no UI surface and its
remaining unautomated risk lies in editor-host behavior beyond the stdio LSP
boundary.
