# Spec: KoppaJS Language Server LSP Contract

## Status

Active

## Summary

`@koppajs/koppajs-language-server` exposes the shared KoppaJS language-core behavior over
the Language Server Protocol. The package is a thin Node-based adapter that
collects file workspace roots, forwards document lifecycle changes to
`KpaLanguageService`, and maps semantic results into standard LSP diagnostics,
completions, hover content, navigation results, rename edits, quick fixes, and
symbols.

## Description

This spec defines the client-visible contract of the standalone language-server
package. It does not define KoppaJS parsing or semantic rules; those remain in
`@koppajs/koppajs-language-core`. It defines only how that behavior is exposed through
LSP and what shape the client can rely on.

## Inputs

- LSP `initialize` requests with `workspaceFolders` and/or `rootUri`
- `initialized` notifications, including dynamic watched-file registration when
  the client supports it
- workspace-folder change notifications when the client supports them
- text-document open, change, and close notifications
- watched-file change notifications from the client
- completion, hover, definition, references, rename, code-action, document
  symbol, and workspace symbol requests

## Outputs

- LSP capability declaration for quick fixes, completions, hover, definition,
  references, prepare rename, rename, document symbols, workspace symbols, and
  incremental text synchronization
- warning diagnostics with source `koppa-diagnostics`
- Markdown hover content
- completion items and replacement edits
- location lists, workspace edits, code actions, document symbols, and workspace
  symbols mapped into standard LSP objects

## Behavior

1. On `initialize`, the server collects unique file-based workspace roots from
   `workspaceFolders` and `rootUri`.
2. On `initialize`, the server advertises a stable capability surface:
   quick-fix code actions, completions, hover, definition, references, prepare
   rename, rename, document symbols, workspace symbols, incremental sync, and
   workspace-folder change notifications.
3. On `initialized`, when the client supports dynamic watched-file
   registration, the server registers watchers for `.kpa`, JS/TS, and
   `tsconfig.json`/`jsconfig.json` inputs.
4. When the client sends workspace-folder changes, the server updates the
   active file-based roots and refreshes diagnostics for all open documents.
5. On `didOpen`, the server clears stale diagnostics for the opened URI, stores
   the current text in `KpaLanguageService`, and republishes diagnostics for the
   opened document plus any affected open dependents.
6. On `didChange`, the server updates the overlay text in `KpaLanguageService`
   and republishes diagnostics for the changed document plus any affected open
   dependents.
7. On `didClose`, the server removes the overlay text, clears diagnostics for
   the closed URI, and refreshes affected open dependents.
8. On watched-file changes, the server ignores non-`file:` URIs, invalidates the
   changed file paths in `KpaLanguageService`, and conservatively republishes
   diagnostics for all open documents.
9. On feature requests, the server delegates semantic work to
   `KpaLanguageService` and maps the returned values into LSP objects. That
   includes component-aware behavior derived from explicit `.kpa` imports and
   workspace `Core.take(...)` registrations discovered through the shared
   language-core source analysis.
10. Request-handler failures from `KpaLanguageService` are translated into LSP
    `RequestFailed` errors instead of surfacing as raw internal failures.
11. Diagnostics are always emitted as warnings, and code actions are advertised
    only as quick fixes.

## Constraints

- This package does not own parsing or semantic rules.
- This package does not expose a stable importable library API beyond the server
  module path.
- Non-file workspace roots and non-file watched URIs are ignored.
- Diagnostics are warning-only in the current contract.
- Only quick-fix code actions are part of the current contract.

## Edge Cases

- Missing open documents return empty arrays or `null`, depending on the LSP
  request shape.
- Duplicate workspace folders collapse to a single root path.
- Non-`file:` workspace-folder additions and removals are ignored.
- If the client does not support dynamic watched-file registration, the server
  still accepts incoming watched-file notifications but does not attempt to
  register them dynamically.
- Diagnostic filtering for quick fixes matches by diagnostic code string.
- Completions with replacement ranges emit `textEdit` instead of plain
  `insertText`.
- Service-layer request failures are surfaced as LSP `RequestFailed` responses.

## Acceptance Criteria

1. `initialize` returns the documented capability surface.
2. Workspace roots are collected only from `file:` URIs and are deduplicated.
3. Dynamic watched-file registration, when supported by the client, covers
   `.kpa`, JS/TS, and `tsconfig.json`/`jsconfig.json` inputs.
4. File-based workspace-folder changes update the active roots and trigger an
   open-document diagnostics refresh.
5. Diagnostics map to warning-level LSP diagnostics with source
   `koppa-diagnostics`.
6. Hover responses emit Markdown content, including fenced code blocks when the
   language-core response marks content as code.
7. Code actions emit quick-fix actions with workspace edits grouped by URI.
8. Missing-document feature requests return empty arrays or `null` rather than
   throwing.
9. Workspace symbols translate file-system paths into `file:` URIs.
10. Watched-file invalidation does not process non-file URIs.
11. Request-handler failures are returned as LSP `RequestFailed` errors.

## Evolution

- `evolution_phase`: standalone adapter hardening
- `completeness_level`: stable thin-adapter contract, partial runtime
  verification
- `known_gaps`: broader editor-host interactions still rely on manual smoke
  verification outside the maintained stdio-LSP integration harness
- `deferred_complexity`: package publication/version compatibility policy and
  deeper integration-level verification
- `technical_debt_items`: expand real client/server integration coverage beyond
  watched-file flows
