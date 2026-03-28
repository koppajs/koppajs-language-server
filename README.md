<a id="readme-top"></a>

<div align="center">
  <img src="https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png" width="500" alt="KoppaJS Logo">
</div>

<br>

<div align="center">
  <a href="https://www.npmjs.com/package/@koppajs/koppajs-language-server"><img src="https://img.shields.io/npm/v/@koppajs/koppajs-language-server?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/koppajs/koppajs-language-server/actions"><img src="https://img.shields.io/github/actions/workflow/status/koppajs/koppajs-language-server/ci.yml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="License"></a>
</div>

<br>

<div align="center">
  <h1 align="center">@koppajs/koppajs-language-server</h1>
  <h3 align="center">Language Server Protocol adapter for KoppaJS language tooling</h3>
  <p align="center">
    <i>A thin LSP transport that exposes the shared KoppaJS language layer to editors.</i>
  </p>
</div>

<br>

<div align="center">
  <p align="center">
    <a href="https://github.com/koppajs/koppajs-documentation">Documentation</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-language-core">Language Core</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-vscode-extension">VS Code Extension</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-kpa-check">KPA Check</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-language-server/issues">Issues</a>
  </p>
</div>

<br>

<details>
<summary>Table of Contents</summary>
  <ol>
    <li><a href="#purpose">Purpose</a></li>
    <li><a href="#repository-classification">Repository Classification</a></li>
    <li><a href="#ownership-boundaries">Ownership Boundaries</a></li>
    <li><a href="#public-contract">Public Contract</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#local-development">Local Development</a></li>
    <li><a href="#ecosystem-fit">Ecosystem Fit</a></li>
    <li><a href="#architecture-governance">Architecture & Governance</a></li>
    <li><a href="#community-contribution">Community & Contribution</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

---

## Purpose

`@koppajs/koppajs-language-server` exposes KoppaJS semantic editor features through the
Language Server Protocol. It is a thin adapter over `@koppajs/koppajs-language-core`,
not the owner of parsing, diagnostics rules, or editor-specific UX.

---

## Repository Classification

- Type: standalone package
- Runtime responsibility: host a Node-based LSP server for `.kpa` analysis
- Build-time responsibility: compile TypeScript, emit declarations, and run
  repository quality gates
- UI surface: none
- Maturity: pre-1.0, intentionally narrow

---

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

---

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

---

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

---

## Local Development

The repository consumes the published
`@koppajs/koppajs-language-core@^0.1.4` package directly from npm.

Requirements:

- Node.js >= 22
- npm >= 10

Maintainer default:

- `.nvmrc` pins Node.js 22 for local work
- `.npmrc` enforces engine compatibility during install

CI validates the repository on Node.js 22 and Node.js 24.

Common commands:

- `npm run check:docs`
- `npm run check:meta`
- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run release:check`
- `npm run validate`

Compatibility policy:

- [docs/meta/version-compatibility.md](./docs/meta/version-compatibility.md)

---

## Ecosystem Fit

This package sits between the editor client and the shared language semantics:

- `@koppajs/koppajs-language-core` owns parsing, diagnostics, symbol extraction, and
  semantic analysis, including workspace component discovery through explicit
  `Core.take(...)` registrations and the canonical `.kpa` component contract
  shared with `@koppajs/koppajs-core` and `@koppajs/koppajs-vite-plugin`
- `@koppajs/koppajs-language-server` exposes that shared truth over LSP
- editor clients such as `koppajs-vscode-extension` should remain thin adapters
  on top of this package

---

## Architecture & Governance

Project intent, contributor rules, and documentation contracts live in the local repo meta layer:

- [AI_CONSTITUTION.md](./AI_CONSTITUTION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DECISION_HIERARCHY.md](./DECISION_HIERARCHY.md)
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- [RELEASE.md](./RELEASE.md)
- [ROADMAP.md](./ROADMAP.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [docs/specs/README.md](./docs/specs/README.md)
- [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md)
- [docs/architecture/README.md](./docs/architecture/README.md)
- [docs/meta/README.md](./docs/meta/README.md)
- [docs/quality/README.md](./docs/quality/README.md)

The file-shape contract for `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, and `CONTRIBUTING.md` is defined in [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md).

Run the local document guard before committing:

```bash
npm run check:docs
npm run check:meta
```

---

## Community & Contribution

Issues and pull requests are welcome:

https://github.com/koppajs/koppajs-language-server/issues

Contributor workflow details live in [CONTRIBUTING.md](./CONTRIBUTING.md).

Community expectations live in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

---

## License

Apache License 2.0 — © 2026 KoppaJS, Bastian Bensch
