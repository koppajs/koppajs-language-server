const assert = require('node:assert/strict');
const test = require('node:test');
const { ResponseError } = require('vscode-jsonrpc');
const {
  CodeActionKind,
  CompletionItemKind,
  DiagnosticSeverity,
  InsertTextFormat,
  LSPErrorCodes,
  MarkupKind,
  SymbolKind,
  TextDocumentSyncKind,
  WatchKind,
} = require('vscode-languageserver/node');
const {
  applyWorkspaceFolderChange,
  collectWorkspaceRoots,
  fromDiagnostic,
  serverCapabilities,
  toRequestFailedResponseError,
  toCodeAction,
  toCompletionItem,
  toCompletionItemKind,
  toDiagnostic,
  toDocumentSymbol,
  toHover,
  toLocation,
  toRange,
  toSymbolKind,
  toWorkspaceEdit,
  toWorkspaceSymbol,
  watchedFilesRegistrationOptions,
} = require('../dist/protocol.js');

test('serverCapabilities exposes the supported LSP contract', () => {
  assert.deepEqual(serverCapabilities.codeActionProvider, {
    codeActionKinds: [CodeActionKind.QuickFix],
  });
  assert.deepEqual(serverCapabilities.completionProvider, {
    triggerCharacters: ['{', '.', '<', ' ', ':', '@'],
  });
  assert.equal(
    serverCapabilities.textDocumentSync,
    TextDocumentSyncKind.Incremental,
  );
  assert.equal(serverCapabilities.definitionProvider, true);
  assert.equal(serverCapabilities.hoverProvider, true);
  assert.equal(serverCapabilities.referencesProvider, true);
  assert.deepEqual(serverCapabilities.renameProvider, {
    prepareProvider: true,
  });
  assert.equal(serverCapabilities.documentSymbolProvider, true);
  assert.equal(serverCapabilities.workspaceSymbolProvider, true);
  assert.deepEqual(serverCapabilities.workspace, {
    workspaceFolders: {
      changeNotifications: true,
      supported: true,
    },
  });
});

test('collectWorkspaceRoots keeps file roots only and removes duplicates', () => {
  const roots = collectWorkspaceRoots({
    rootUri: 'file:///repo',
    workspaceFolders: [
      { name: 'repo', uri: 'file:///repo' },
      { name: 'nested', uri: 'file:///repo/packages/app' },
      { name: 'remote', uri: 'untitled:remote' },
    ],
  });

  assert.deepEqual(roots, ['/repo', '/repo/packages/app']);
});

test('watchedFilesRegistrationOptions cover Koppa, script, and config invalidation inputs', () => {
  assert.deepEqual(watchedFilesRegistrationOptions, {
    watchers: [
      {
        globPattern: '**/*.kpa',
        kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete,
      },
      {
        globPattern: '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}',
        kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete,
      },
      {
        globPattern: '**/tsconfig.json',
        kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete,
      },
      {
        globPattern: '**/jsconfig.json',
        kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete,
      },
    ],
  });
});

test('applyWorkspaceFolderChange updates file roots and ignores non-file folders', () => {
  const roots = applyWorkspaceFolderChange(['/repo', '/repo/packages/app'], {
    added: [
      { name: 'tools', uri: 'file:///repo/tools' },
      { name: 'remote', uri: 'untitled:remote' },
    ],
    removed: [
      { name: 'app', uri: 'file:///repo/packages/app' },
      { name: 'remote-old', uri: 'git:remote' },
    ],
  });

  assert.deepEqual(roots, ['/repo', '/repo/tools']);
});

test('diagnostics round-trip between KoppaJS and LSP shapes', () => {
  const diagnostic = {
    code: 'KPA001',
    data: { fixable: true },
    message: 'Missing prop',
    range: {
      endChar: 12,
      line: 4,
      startChar: 2,
    },
  };

  const lspDiagnostic = toDiagnostic(diagnostic);

  assert.deepEqual(lspDiagnostic, {
    code: 'KPA001',
    data: { fixable: true },
    message: 'Missing prop',
    range: {
      end: {
        character: 12,
        line: 4,
      },
      start: {
        character: 2,
        line: 4,
      },
    },
    severity: DiagnosticSeverity.Warning,
    source: 'koppa-diagnostics',
  });

  assert.deepEqual(fromDiagnostic(lspDiagnostic), diagnostic);
});

test('hover content is rendered as markdown with fenced code blocks', () => {
  const hover = toHover({
    contents: [
      { kind: 'markdown', value: 'Component docs' },
      { kind: 'code', language: 'ts', value: 'const answer = 42;' },
    ],
    range: {
      end: { character: 10, line: 2 },
      start: { character: 3, line: 2 },
    },
  });

  assert.deepEqual(hover, {
    contents: {
      kind: MarkupKind.Markdown,
      value: 'Component docs\n\n```ts\nconst answer = 42;\n```',
    },
    range: {
      end: { character: 10, line: 2 },
      start: { character: 3, line: 2 },
    },
  });
});

test('request failures are translated into LSP RequestFailed errors', () => {
  const responseError = toRequestFailedResponseError(
    new Error('Rename target is ambiguous.'),
    'Rename request failed.',
  );

  assert(responseError instanceof ResponseError);
  assert.equal(responseError.code, LSPErrorCodes.RequestFailed);
  assert.equal(responseError.message, 'Rename target is ambiguous.');

  const existingError = new ResponseError(
    LSPErrorCodes.RequestCancelled,
    'Cancelled',
  );

  assert.equal(
    toRequestFailedResponseError(existingError, 'Fallback message'),
    existingError,
  );
  assert.equal(
    toRequestFailedResponseError(undefined, 'Fallback message').message,
    'Fallback message',
  );
});

test('completion items support replacement edits and snippets', () => {
  const completion = toCompletionItem({
    detail: 'Koppa snippet',
    documentation: 'Insert a component',
    insertText: '<Card>$1</Card>',
    insertTextFormat: 'snippet',
    kind: 'component',
    label: 'Card',
    replacementRange: {
      end: { character: 8, line: 1 },
      start: { character: 2, line: 1 },
    },
  });

  assert.equal(completion.kind, CompletionItemKind.Text);
  assert.equal(completion.insertText, undefined);
  assert.equal(completion.insertTextFormat, InsertTextFormat.Snippet);
  assert.deepEqual(completion.documentation, {
    kind: MarkupKind.Markdown,
    value: 'Insert a component',
  });
  assert.deepEqual(completion.textEdit, {
    newText: '<Card>$1</Card>',
    range: {
      end: { character: 8, line: 1 },
      start: { character: 2, line: 1 },
    },
  });
});

test('workspace edits, document symbols, code actions, and workspace symbols preserve structure', () => {
  const edit = toWorkspaceEdit([
    {
      newText: 'foo',
      range: {
        end: { character: 4, line: 0 },
        start: { character: 1, line: 0 },
      },
      uri: 'file:///repo/app.kpa',
    },
    {
      newText: 'bar',
      range: {
        end: { character: 3, line: 1 },
        start: { character: 0, line: 1 },
      },
      uri: 'file:///repo/app.kpa',
    },
  ]);

  assert.deepEqual(edit, {
    changes: {
      'file:///repo/app.kpa': [
        {
          newText: 'foo',
          range: {
            end: { character: 4, line: 0 },
            start: { character: 1, line: 0 },
          },
        },
        {
          newText: 'bar',
          range: {
            end: { character: 3, line: 1 },
            start: { character: 0, line: 1 },
          },
        },
      ],
    },
  });

  const codeAction = toCodeAction(
    {
      diagnosticCodes: ['KPA001'],
      edits: [
        {
          newText: 'requiredProp={value}',
          range: {
            end: { character: 5, line: 2 },
            start: { character: 5, line: 2 },
          },
          uri: 'file:///repo/app.kpa',
        },
      ],
      isPreferred: true,
      kind: 'quickfix',
      title: 'Insert missing prop',
    },
    [
      {
        code: 'KPA001',
        message: 'Missing prop',
        range: {
          end: { character: 5, line: 2 },
          start: { character: 1, line: 2 },
        },
        severity: DiagnosticSeverity.Warning,
      },
      {
        code: 'OTHER',
        message: 'Ignore',
        range: {
          end: { character: 1, line: 0 },
          start: { character: 0, line: 0 },
        },
        severity: DiagnosticSeverity.Warning,
      },
    ],
  );

  assert.equal(codeAction.kind, CodeActionKind.QuickFix);
  assert.equal(codeAction.isPreferred, true);
  assert.equal(codeAction.diagnostics.length, 1);

  const symbol = toDocumentSymbol({
    children: [],
    detail: 'component',
    kind: 'component',
    name: 'AppCard',
    range: {
      end: { character: 12, line: 8 },
      start: { character: 0, line: 0 },
    },
    selectionRange: {
      end: { character: 7, line: 0 },
      start: { character: 0, line: 0 },
    },
  });

  assert.equal(symbol.kind, SymbolKind.Class);
  assert.equal(symbol.name, 'AppCard');

  const workspaceSymbol = toWorkspaceSymbol({
    containerName: 'components',
    filePath: '/repo/src/AppCard.kpa',
    kind: 'component',
    name: 'AppCard',
    range: {
      end: { character: 12, line: 8 },
      start: { character: 0, line: 0 },
    },
  });

  assert.deepEqual(workspaceSymbol, {
    containerName: 'components',
    kind: SymbolKind.Class,
    location: {
      range: {
        end: { character: 12, line: 8 },
        start: { character: 0, line: 0 },
      },
      uri: 'file:///repo/src/AppCard.kpa',
    },
    name: 'AppCard',
  });
});

test('range, location, and kind helpers preserve explicit fallbacks', () => {
  assert.deepEqual(
    toRange({
      end: { character: 6, line: 3 },
      start: { character: 1, line: 3 },
    }),
    {
      end: { character: 6, line: 3 },
      start: { character: 1, line: 3 },
    },
  );

  assert.deepEqual(
    toLocation({
      range: {
        end: { character: 2, line: 1 },
        start: { character: 0, line: 1 },
      },
      uri: 'file:///repo/src/AppCard.kpa',
    }),
    {
      range: {
        end: { character: 2, line: 1 },
        start: { character: 0, line: 1 },
      },
      uri: 'file:///repo/src/AppCard.kpa',
    },
  );

  assert.equal(toCompletionItemKind('module'), CompletionItemKind.Module);
  assert.equal(toCompletionItemKind('unknown-kind'), CompletionItemKind.Text);
  assert.equal(toSymbolKind('namespace'), SymbolKind.Namespace);
  assert.equal(toSymbolKind('unknown-kind'), SymbolKind.Object);
});
