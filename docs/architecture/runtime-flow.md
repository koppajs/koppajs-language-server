# Runtime Flow

## Initialize

1. The client starts `dist/server.js`.
2. `src/server.ts` creates the connection and document store.
3. `initialize` delegates workspace-root extraction to `collectWorkspaceRoots()`.
4. The server returns the stable capability declaration from
   `serverCapabilities`.
5. When the client supports dynamic watched-file registration, `initialized`
   registers the maintained watched-file globs.

## Workspace Folders

1. If the client supports workspace-folder notifications, `initialized` wires
   `workspace/didChangeWorkspaceFolders`.
2. Added and removed workspace folders are reduced through
   `applyWorkspaceFolderChange()`.
3. Only `file:` workspace folders affect the active roots.
4. After the active roots change, the server refreshes diagnostics for all open
   documents.

## Document Lifecycle

1. `didOpen` clears stale diagnostics for the opened URI.
2. The open document text is stored in `KpaLanguageService`.
3. The server refreshes diagnostics for the opened document and any affected open
   dependents.
4. `didChange` repeats the same refresh flow with updated text.
5. `didClose` removes the overlay text, clears the closed-document diagnostics,
   and refreshes affected open dependents.

## Watched Files

1. `workspace/didChangeWatchedFiles` receives client-side file notifications.
2. Non-`file:` URIs are ignored.
3. `.kpa`, JS/TS, and `tsconfig.json`/`jsconfig.json` inputs are the maintained
   watched-file surface.
4. `KpaLanguageService.invalidateFilePath()` returns affected paths.
5. The server conservatively republishes diagnostics for all open documents
   after those invalidations.

## Feature Requests

The server delegates feature requests directly to `KpaLanguageService` and maps
results through `src/protocol.ts`:

- completions
- hover
- definition
- references
- prepare rename and rename
- quick-fix code actions
- document symbols
- workspace symbols
