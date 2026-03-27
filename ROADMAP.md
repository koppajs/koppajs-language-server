# Roadmap

## Objective

Harden `@koppajs/koppajs-language-server` into a stable KoppaJS adapter package that
keeps the LSP surface explicit, minimal, and aligned with the shared language
semantics.

This repository should remain an adapter layer. It should not grow into a
second semantic engine or an editor-client repo.

## Current Position

As of this repository state, KoppaJS has:

- a standalone `@koppajs/koppajs-language-server` package
- a thin runtime composition root in `src/server.ts`
- a pure protocol-mapping module in `src/protocol.ts`
- local format, lint, typecheck, build, and unit-test scripts
- a root governance layer plus specs, ADRs, architecture, quality, and meta docs

Current gaps:

- broader editor-host behavior still leans on manual smoke coverage even though
  the stdio integration harness now protects completions, hover, navigation,
  rename, quick fixes, symbols, and watched-file flows
- the tag-driven release flow is defined but not yet exercised by a real server
  package release

## Target End State

The intended long-term shape is:

- `@koppajs/koppajs-language-core` remains the semantic truth
- `@koppajs/koppajs-language-server` remains the narrow LSP adapter over that truth
- editor clients remain thin presentation and activation layers
- package publication remains independent from sibling checkout assumptions

## Near-Term Priorities

### 1. Expand Real LSP Integration Verification

- extend the stdio LSP harness to cover workspace-folder change handling through
  real notifications
- keep the harness narrow and contract-focused while leaving editor-host UX to
  manual smoke checks

### 2. Define Server/Core Compatibility Policy

- exercise the documented compatibility policy through at least one real server
  release
- refine the policy if the first release uncovers practical friction

### 3. Exercise the Release Flow

- validate the tag-driven workflow with the first real server package release
- refine release notes and operational guidance once the workflow has been used

## Deliberate Non-Goals for Now

- moving parser or semantic ownership into this repo
- editor-specific snippets or activation logic
- browser UI, Playwright, or unrelated frontend tooling
- speculative public library APIs beyond the executable server module path
