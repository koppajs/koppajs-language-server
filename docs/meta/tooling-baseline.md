# Tooling Baseline

## Active Tooling

The repository currently uses:

- TypeScript (`tsc`) for compilation and typechecking
- ESLint for static analysis
- Prettier for formatting
- `node:test` for contract tests and stdio-LSP integration tests against the
  built runtime
- npm with `package-lock.json` as the package-management baseline
- GitHub Actions for CI validation and tag-driven release publishing

## Script Surface

The supported scripts are:

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
