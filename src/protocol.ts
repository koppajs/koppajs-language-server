import { fileURLToPath, pathToFileURL } from 'url';
import type {
  KpaLocatedRange,
  KpaServiceCodeAction,
  KpaServiceCompletion,
  KpaServiceDocumentSymbol,
  KpaServiceHover,
  KpaServiceLocation,
  KpaServiceTextEdit,
  KpaWorkspaceSymbolEntry,
} from '@koppajs/koppajs-language-core';
import {
  CodeActionKind,
  CompletionItemKind,
  LSPErrorCodes,
  DiagnosticSeverity,
  ResponseError,
  InsertTextFormat,
  MarkupKind,
  SymbolKind,
  TextDocumentSyncKind,
  TextEdit,
  WatchKind,
  type CodeAction,
  type CompletionItem,
  type Diagnostic,
  type DidChangeWatchedFilesRegistrationOptions,
  type DocumentSymbol,
  type Hover,
  type InitializeParams,
  type InitializeResult,
  type Location,
  type Range,
  type SymbolInformation,
  type WorkspaceFoldersChangeEvent,
  type WorkspaceEdit,
} from 'vscode-languageserver/node.js';

interface KpaDiagnostic {
  code?: number | string;
  data?: unknown;
  message: string;
  range: {
    endChar: number;
    line: number;
    startChar: number;
  };
}

export const serverCapabilities: InitializeResult['capabilities'] = {
  codeActionProvider: {
    codeActionKinds: [CodeActionKind.QuickFix],
  },
  completionProvider: {
    triggerCharacters: ['{', '.', '<', ' ', ':', '@'],
  },
  definitionProvider: true,
  documentSymbolProvider: true,
  hoverProvider: true,
  referencesProvider: true,
  renameProvider: {
    prepareProvider: true,
  },
  textDocumentSync: TextDocumentSyncKind.Incremental,
  workspaceSymbolProvider: true,
  workspace: {
    workspaceFolders: {
      changeNotifications: true,
      supported: true,
    },
  },
};

export const watchedFilesRegistrationOptions: DidChangeWatchedFilesRegistrationOptions =
  {
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
  };

export function collectWorkspaceRoots(
  params: InitializeParams,
): readonly string[] {
  const roots = new Set<string>();

  for (const folder of params.workspaceFolders ?? []) {
    addFileUriRoot(roots, folder.uri);
  }

  addFileUriRoot(roots, params.rootUri);

  return [...roots];
}

export function applyWorkspaceFolderChange(
  currentRoots: readonly string[],
  event: WorkspaceFoldersChangeEvent,
): readonly string[] {
  const roots = new Set(currentRoots);

  for (const folder of event.removed) {
    removeFileUriRoot(roots, folder.uri);
  }

  for (const folder of event.added) {
    addFileUriRoot(roots, folder.uri);
  }

  return [...roots];
}

export function toDiagnostic(diagnostic: KpaDiagnostic): Diagnostic {
  return {
    code: diagnostic.code,
    data: diagnostic.data,
    message: diagnostic.message,
    range: {
      end: {
        character: diagnostic.range.endChar,
        line: diagnostic.range.line,
      },
      start: {
        character: diagnostic.range.startChar,
        line: diagnostic.range.line,
      },
    },
    severity: DiagnosticSeverity.Warning,
    source: 'koppa-diagnostics',
  };
}

export function fromDiagnostic(diagnostic: Diagnostic): KpaDiagnostic {
  return {
    code:
      typeof diagnostic.code === 'number' || typeof diagnostic.code === 'string'
        ? diagnostic.code
        : undefined,
    data: diagnostic.data,
    message: diagnostic.message,
    range: {
      endChar: diagnostic.range.end.character,
      line: diagnostic.range.start.line,
      startChar: diagnostic.range.start.character,
    },
  };
}

export function toHover(hover: KpaServiceHover): Hover {
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: hover.contents
        .map((content) =>
          content.kind === 'code'
            ? `\`\`\`${content.language ?? ''}\n${content.value}\n\`\`\``
            : content.value,
        )
        .join('\n\n'),
    },
    range: toRange(hover.range),
  };
}

export function toCompletionItem(
  completion: KpaServiceCompletion,
): CompletionItem {
  const insertText = completion.insertText ?? completion.label;
  const item: CompletionItem = {
    detail: completion.detail,
    documentation: completion.documentation
      ? {
          kind: MarkupKind.Markdown,
          value: completion.documentation,
        }
      : undefined,
    insertText: completion.replacementRange ? undefined : insertText,
    insertTextFormat:
      completion.insertTextFormat === 'snippet'
        ? InsertTextFormat.Snippet
        : InsertTextFormat.PlainText,
    kind: toCompletionItemKind(completion.kind),
    label: completion.label,
  };

  if (completion.replacementRange) {
    item.textEdit = TextEdit.replace(
      toRange(completion.replacementRange),
      insertText,
    );
  }

  return item;
}

export function toLocation(location: KpaServiceLocation): Location {
  return {
    range: toRange(location.range),
    uri: location.uri,
  };
}

export function toCodeAction(
  action: KpaServiceCodeAction,
  diagnostics: readonly Diagnostic[],
): CodeAction {
  return {
    diagnostics:
      action.diagnosticCodes.length > 0
        ? diagnostics.filter((diagnostic) =>
            action.diagnosticCodes.includes(String(diagnostic.code)),
          )
        : undefined,
    edit: toWorkspaceEdit(action.edits),
    isPreferred: action.isPreferred,
    kind: CodeActionKind.QuickFix,
    title: action.title,
  };
}

export function toWorkspaceEdit(
  edits: readonly KpaServiceTextEdit[],
): WorkspaceEdit {
  const changes: WorkspaceEdit['changes'] = {};

  for (const edit of edits) {
    const existingEdits = changes[edit.uri] ?? [];

    existingEdits.push({
      newText: edit.newText,
      range: toRange(edit.range),
    });
    changes[edit.uri] = existingEdits;
  }

  return { changes };
}

export function toDocumentSymbol(
  symbol: KpaServiceDocumentSymbol,
): DocumentSymbol {
  return {
    children: symbol.children.map(toDocumentSymbol),
    detail: symbol.detail,
    kind: toSymbolKind(symbol.kind),
    name: symbol.name,
    range: toRange(symbol.range),
    selectionRange: toRange(symbol.selectionRange),
  };
}

export function toWorkspaceSymbol(
  entry: KpaWorkspaceSymbolEntry,
): SymbolInformation {
  return {
    containerName: entry.containerName,
    kind: toSymbolKind(entry.kind),
    location: {
      range: toRange(entry.range),
      uri: filePathToUri(entry.filePath),
    },
    name: entry.name,
  };
}

export function toRange(range: KpaLocatedRange): Range {
  return {
    end: {
      character: range.end.character,
      line: range.end.line,
    },
    start: {
      character: range.start.character,
      line: range.start.line,
    },
  };
}

export function toCompletionItemKind(kind: string): CompletionItemKind {
  switch (kind) {
    case 'alias':
    case 'module':
    case 'import':
    case 'import-type':
      return CompletionItemKind.Module;
    case 'class':
      return CompletionItemKind.Class;
    case 'const':
    case 'let':
    case 'local var':
    case 'var':
    case 'variable':
      return CompletionItemKind.Variable;
    case 'enum':
      return CompletionItemKind.Enum;
    case 'function':
    case 'method':
      return CompletionItemKind.Function;
    case 'getter':
    case 'property':
    case 'setter':
      return CompletionItemKind.Property;
    case 'interface':
      return CompletionItemKind.Interface;
    case 'keyword':
      return CompletionItemKind.Keyword;
    case 'snippet':
      return CompletionItemKind.Snippet;
    case 'type':
    case 'type-alias':
      return CompletionItemKind.TypeParameter;
    case 'warning':
      return CompletionItemKind.Text;
    default:
      return CompletionItemKind.Text;
  }
}

export function toSymbolKind(kind: string): SymbolKind {
  switch (kind) {
    case 'component':
    case 'class':
      return SymbolKind.Class;
    case 'enum':
      return SymbolKind.Enum;
    case 'function':
      return SymbolKind.Function;
    case 'import':
    case 'import-type':
    case 'module':
      return SymbolKind.Module;
    case 'interface':
      return SymbolKind.Interface;
    case 'namespace':
      return SymbolKind.Namespace;
    case 'package':
      return SymbolKind.Package;
    case 'type':
    case 'type-alias':
      return SymbolKind.TypeParameter;
    case 'variable':
      return SymbolKind.Variable;
    default:
      return SymbolKind.Object;
  }
}

export function toRequestFailedResponseError(
  error: unknown,
  fallbackMessage: string,
): ResponseError<undefined> {
  if (error instanceof ResponseError) {
    return error;
  }

  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : fallbackMessage;

  return new ResponseError(LSPErrorCodes.RequestFailed, message);
}

function filePathToUri(filePath: string): string {
  return pathToFileURL(filePath).toString();
}

function addFileUriRoot(
  roots: Set<string>,
  uri: string | null | undefined,
): void {
  const rootPath = toFilePath(uri);

  if (rootPath) {
    roots.add(rootPath);
  }
}

function removeFileUriRoot(
  roots: Set<string>,
  uri: string | null | undefined,
): void {
  const rootPath = toFilePath(uri);

  if (rootPath) {
    roots.delete(rootPath);
  }
}

function toFilePath(uri: string | null | undefined): string | null {
  if (!uri?.startsWith('file:')) {
    return null;
  }

  return fileURLToPath(uri);
}
