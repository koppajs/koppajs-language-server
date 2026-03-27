# Contributing

## Start Here

Read these documents before making structural or user-visible changes:

- [DECISION_HIERARCHY.md](DECISION_HIERARCHY.md)
- [AI_CONSTITUTION.md](AI_CONSTITUTION.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md)
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md)

## Requirements

- Node.js `>=20`
- npm `>=10`
- access to the published `@koppajs/koppajs-language-core@^0.1.2` package from
  npm

Install dependencies:

```bash
npm install
```

## Common Commands

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run build
npm test
npm run release:check
npm run check
npm run validate
```

## Contribution Rules

- User-visible LSP behavior changes require a spec update in `docs/specs/`.
- Structural or long-lived workflow decisions require an ADR in `docs/adr/`.
- Keep capability declaration, mapping code, tests, and docs aligned in the same
  change.
- Prefer small, explicit modules over new abstraction layers.
- If verification is incomplete, document the gap clearly in the change summary.

## Changes That Need Extra Care

### Capability Surface

If you add, remove, or change an advertised LSP capability, update all of the
following:

- `src/protocol.ts`
- relevant tests in `test/`
- `README.md`
- `docs/specs/language-server-lsp-contract.md`
- architecture or ADR docs if the runtime shape changes

### Tooling or Workflow

If you change build, lint, formatting, or test workflows, update:

- `TESTING_STRATEGY.md`
- `docs/quality/quality-gates.md`
- `docs/meta/tooling-baseline.md`
- `README.md` if the contributor workflow or package contract changes
- `docs/meta/version-compatibility.md` if the supported core range changes

## Pull Request Checklist

- `npm run validate` passes locally, or the gap is documented
- `npm run release:check` passes locally for release-facing changes
- Spec updated if behavior changed
- ADR added if structure changed
- Docs match the code
- Tests added or manual smoke coverage noted
- Compatibility docs still match the declared core dependency range

## Commit Messages

Conventional commits are preferred but not enforced by repository tooling.
