# Manual Smoke Checklist

Use this checklist when a change affects the runtime client/server interaction
and unit tests alone do not fully cover the behavior.

## Setup

1. Run `npm install`.
2. Run `npm run build`.
3. Point a local LSP client at this repository's `dist/server.js`. A local
   `vscode-languageclient` host or the sibling `koppajs-vscode-extension`
   development environment can be used if it is configured to launch this build.

## Checks

1. Confirm the server starts without runtime errors.
2. Open a `.kpa` file and confirm diagnostics appear.
3. Edit the file and confirm diagnostics refresh without requiring restart.
4. Close the file and confirm diagnostics for that URI are cleared.
5. Trigger completions inside a supported `.kpa` editing context and confirm the
   client receives semantic items.
6. Trigger hover on a supported symbol and confirm Markdown content is shown.
7. Confirm go-to-definition and find-references return locations.
8. Confirm prepare rename and rename return sensible ranges and edits.
9. Confirm quick fixes appear only for supported diagnostics.
10. Confirm document symbols and workspace symbols are populated.
11. Add or remove a file-based workspace folder and confirm open-document
    diagnostics refresh against the new workspace roots.
12. Modify a watched `.kpa` or neighboring script/config file and confirm
    affected open-document diagnostics refresh.
13. Confirm non-`.kpa` or non-targeted files do not receive unexpected KoppaJS
    diagnostics.

## Notes

- If a check cannot be completed, document the gap in the change summary and the
  roadmap if it is expected to persist.
- Docs-only or purely formatting changes do not require this checklist.
