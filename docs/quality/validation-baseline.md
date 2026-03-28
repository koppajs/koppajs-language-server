# Validation Baseline

## Enforced Checks

- `npm run check:docs`
- `npm run check:meta`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run check`
- `npm run validate`
- `npm run release:check`

## Automation

- GitHub Actions CI runs `npm run validate` on pull requests and on pushes to
  `main` and `develop`.
- GitHub Actions CI validates the repository on Node.js 22 and 24.
- GitHub Actions release automation runs on `vX.Y.Z` tags, validates the
  package, verifies the publishable payload with `npm run release:check`,
  requires the tagged commit to be on `main`, verifies the tag version against
  `package.json`, creates a GitHub Release, and then publishes to npm.
- The published package remains root-entry-only through `package.json`
  `exports["."]`.

## Current Tooling Position

- TypeScript is enforced for typechecking and build output.
- `node:test` is the automated test runner.
- ESLint is enforced as a repository quality gate.
- Prettier is enforced as a repository quality gate.
- The tracked `.npmrc` enforces compatible Node.js and npm versions during
  install.
- The tracked `.nvmrc` keeps the maintainer-default Node.js line on `22`.
- The package declares support for Node.js `>=22`; CI validates on Node.js 22
  and 24.

## Rationale

The runtime remains intentionally small, but semantic docs, meta-layer checks,
and targeted stdio-LSP verification protect the repository contracts that are
otherwise easy to drift silently.
