# @koppajs/koppajs-language-server

## Purpose

`@koppajs/koppajs-language-server` exposes KoppaJS semantic editor features through the
Language Server Protocol. It is a thin adapter over `@koppajs/koppajs-language-core`,
not the owner of parsing, diagnostics rules, or editor-specific UX.

## Repository Classification

- Type: standalone package
- Runtime responsibility: host a Node-based LSP server for `.kpa` analysis
- Build-time responsibility: compile TypeScript, emit declarations, and run
  repository quality gates
- UI surface: none
- Maturity: pre-1.0, intentionally narrow

## Ownership Boundaries

This repository owns:

- LSP capability declaration
- request and notification wiring
- mapping between KoppaJS language-core data and LSP types
- workspace-root collection/update and watched-file invalidation handoff

This repository does not own:

- `.kpa` parsing or semantic analysis
- editor activation, snippets, or UI behavior
- CLI diagnostics
- package publication/versioning for `@koppajs/koppajs-language-core`

## Public Contract

The public surface is intentionally small:

- consumers run the compiled `dist/server.js` module as an LSP server process
- the server supports completions, diagnostics, hover, definition, references,
  prepare rename, rename, quick fixes, document symbols, and workspace symbols
- diagnostics are emitted as warnings with source `koppa-diagnostics`
- only quick-fix code actions are advertised
- workspace roots are derived only from `file:` workspace URIs
- when the client supports dynamic watched-file registration, the server
  registers `.kpa`, JS/TS, and `tsconfig.json`/`jsconfig.json` watchers
- file-based workspace-folder changes update the active roots and refresh open
  document diagnostics
- watched-file invalidation conservatively refreshes open-document diagnostics
- non-file watched changes are ignored

This package does not expose a stable library API beyond the executable server
module path.

## Usage

Example `vscode-languageclient` wiring:

```ts
import { createRequire } from 'node:module';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

const require = createRequire(import.meta.url);
const serverModule = require.resolve('@koppajs/koppajs-language-server');

const client = new LanguageClient(
  'koppajsLanguageServer',
  'KoppaJS Language Server',
  {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  },
  {
    documentSelector: [{ language: 'kpa', scheme: 'file' }],
  },
);

await client.start();
```

## Local Development

The repository consumes the published
`@koppajs/koppajs-language-core@^0.1.2` package directly from npm.

Common commands:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run release:check`
- `npm run validate`

Compatibility policy:

- [docs/meta/version-compatibility.md](./docs/meta/version-compatibility.md)

## Ecosystem Fit

This package sits between the editor client and the shared language semantics:

- `@koppajs/koppajs-language-core` owns parsing, diagnostics, symbol extraction, and
  semantic analysis
- `@koppajs/koppajs-language-server` exposes that shared truth over LSP
- editor clients such as `koppajs-vscode-extension` should remain thin adapters
  on top of this package

## Governance

Repository intent, architecture, rules, and specs live in the meta layer:

- [AI_CONSTITUTION.md](./AI_CONSTITUTION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DECISION_HIERARCHY.md](./DECISION_HIERARCHY.md)
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- [ROADMAP.md](./ROADMAP.md)
- [RELEASE.md](./RELEASE.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [docs/specs/language-server-lsp-contract.md](./docs/specs/language-server-lsp-contract.md)
- [docs/architecture/module-boundaries.md](./docs/architecture/module-boundaries.md)
- [docs/quality/quality-gates.md](./docs/quality/quality-gates.md)
- [docs/meta/README.md](./docs/meta/README.md)
- [docs/meta/version-compatibility.md](./docs/meta/version-compatibility.md)

## License

Apache License 2.0. See [LICENSE](./LICENSE).
