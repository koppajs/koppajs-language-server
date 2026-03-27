# Testing Strategy

## Current Baseline

The repository uses two automated layers plus explicit manual smoke checks:

- `node:test` contract tests for pure protocol mapping and package metadata
- `node:test` integration tests against the built stdio LSP server
- manual smoke verification for broader editor-client behavior

Local validation runs through `npm run validate`.

## Test Philosophy

- Prefer the cheapest test that protects the contract being changed.
- Put protocol mapping and capability declarations under direct unit tests.
- Cover critical runtime flows through the real stdio client/server boundary.
- Do not add fake tests that restate implementation without protecting behavior.

## Test Pyramid

### 1. Unit Tests

Use unit tests for:

- capability advertisement
- workspace-root collection
- workspace-folder change reduction
- diagnostic mapping
- hover/completion/code-action mapping
- symbol and workspace-edit translation

These tests intentionally exercise the built `dist/` output because the package
contract is the executable server module path and its compiled mapping behavior.

### 2. Integration Tests

Use integration tests for:

- stdio server startup and `initialize`
- dynamic watched-file registration
- watched-file invalidation and diagnostics refresh through real notifications
- feature round-trips for completions, hover, navigation, rename, quick fixes,
  and symbol requests

These tests must communicate with the built `dist/server.js` process over the
actual LSP transport rather than importing `src/server.ts` directly.

### 3. Manual Smoke Checks

Use manual verification for:

- client startup against `dist/server.js`
- workspace-folder add/remove behavior in a real client
- hover, navigation, references, rename, quick fixes, and symbol search through
  a real LSP client

See [docs/quality/manual-smoke-checklist.md](docs/quality/manual-smoke-checklist.md).

## Non-Goals

- No Playwright baseline: the repository has no standalone UI.
- No coverage threshold enforcement: the repo does not currently maintain
  coverage tooling.
- No browser or editor-host automation harness beyond the maintained stdio-LSP
  integration layer.

## Required Test Coverage by Change Type

| Change Type               | Minimum Expectation                                              |
| ------------------------- | ---------------------------------------------------------------- |
| Pure protocol mapping     | Unit tests                                                       |
| Capability surface change | Unit tests or integration tests plus README/spec update          |
| Diagnostics lifecycle     | Integration tests where practical plus manual smoke verification |
| Watched-file behavior     | Integration tests plus manual smoke verification                 |
| Structural refactor       | Tests for changed behavior plus ADR                              |

## Mocking Policy

- Prefer direct value assertions over deep mocking for mapping logic.
- Do not mock `@koppajs/koppajs-language-core` behavior unless the test only needs a
  stable shape contract.
- If an end-to-end behavior matters, validate it through a real client/manual
  run rather than through synthetic mocks.

## Coverage Expectations

- The repository does not enforce numeric coverage thresholds.
- New non-trivial pure logic should extend unit coverage.
- If runtime or editor behavior cannot yet be automated, record the gap in docs and the
  roadmap.

## Exit Criteria for Behavior Changes

A change is ready when:

- the relevant spec is updated,
- the relevant tests or manual smoke checklist are updated,
- the implementation matches the spec,
- and the documentation no longer contradicts the runtime behavior.
