# Quality Guide

This directory captures the repository's practical quality gates and the lean
tooling choices that support them.

## Documents In This Area

- [quality-gates.md](./quality-gates.md): required merge-time gates
- [validation-baseline.md](./validation-baseline.md): enforced local and hosted
  checks
- [manual-smoke-checklist.md](./manual-smoke-checklist.md): runtime checks that
  remain manual

## Verification Matrix

- Documentation contract: `npm run check:docs`
- Meta-layer integrity: `npm run check:meta`
- Formatting: `npm run format:check`
- Static analysis: `npm run lint`
- Type safety: `npm run typecheck`
- Test suite: `npm run test`
- Main local gate: `npm run check`
- Release validation: `npm run validate`
- Release payload check: `npm run release:check`
- Hosted workflow overview: [../../.github/workflows/README.md](../../.github/workflows/README.md)

## Maintenance Rule

Update this directory whenever quality gates, engine enforcement, release
validation, or workflow expectations change.
