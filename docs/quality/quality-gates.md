# Quality Gates

These gates describe what should be true before merging non-trivial changes.

## Required Gates

| Gate            | Requirement                                                          |
| --------------- | -------------------------------------------------------------------- |
| Documentation   | Code, specs, ADRs, and contributor docs do not contradict each other |
| Meta Layer      | `npm run check:meta` passes                                          |
| Formatting      | `npm run format:check` passes                                        |
| Lint            | `npm run lint` passes                                                |
| Type Safety     | `npm run typecheck` passes                                           |
| Build           | `npm run build` passes                                               |
| Unit Tests      | `npm test` passes for protocol or contract changes                   |
| Release Dry Run | `npm run release:check` passes for release-facing changes            |
| Manual Runtime  | The smoke checklist is completed for client/server lifecycle changes |
| Architecture    | Structural changes have an ADR and architecture docs updated         |

## Current Reality

- `npm run validate` enforces documentation, meta-layer, formatting, linting,
  typechecking, build, and unit plus integration tests locally.
- GitHub Actions runs `npm run validate` on Node.js 22 and Node.js 24 for pushes
  to `main` and `develop` and on pull requests.
- GitHub Actions publishes tagged releases from Node.js 22 after validation and
  version checks.
- Manual smoke checks remain necessary for broader editor-client interactions
  beyond the maintained stdio-LSP integration harness.

## Rule

Do not lower an existing quality gate without updating the testing strategy and,
when structural, the relevant ADR.
