import { fileURLToPath, pathToFileURL } from 'url';
import {
  CodeAction,
  CodeActionKind,
  CompletionItem,
  CompletionItemKind,
  Connection,
  createConnection,
  DidChangeWatchedFilesParams,
  Diagnostic,
  DiagnosticSeverity,
  DocumentSymbol,
  Hover,
  InitializeParams,
  InitializeResult,
  InsertTextFormat,
  Location,
  MarkupKind,
  ProposedFeatures,
  Range,
  ReferenceParams,
  RenameParams,
  SymbolInformation,
  SymbolKind,
  TextEdit,
  TextDocuments,
  TextDocumentSyncKind,
  WorkspaceEdit,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  KpaLanguageService,
  type KpaServiceCodeAction,
  type KpaServiceCompletion,
  type KpaServiceDocumentSymbol,
  type KpaServiceHover,
  type KpaServiceLocation,
  type KpaServiceTextEdit,
} from '@koppajs/language-core';

const connection: Connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const languageService = new KpaLanguageService();

connection.onInitialize((params: InitializeParams): InitializeResult => {
  languageService.setWorkspaceRoots(collectWorkspaceRoots(params));

  return {
    capabilities: {
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
    },
  };
});

documents.onDidOpen((event) => {
  connection.sendDiagnostics({
    diagnostics: [],
    uri: event.document.uri,
  });
  const affectedPaths = languageService.openDocument(event.document.uri, event.document.getText());

  refreshDiagnosticsForUris([
    event.document.uri,
    ...languageService.getOpenDocumentUrisForAffectedPaths(affectedPaths),
  ]);
});

documents.onDidChangeContent((event) => {
  const affectedPaths = languageService.updateDocument(
    event.document.uri,
    event.document.getText(),
  );

  refreshDiagnosticsForUris([
    event.document.uri,
    ...languageService.getOpenDocumentUrisForAffectedPaths(affectedPaths),
  ]);
});

documents.onDidClose((event) => {
  const affectedPaths = languageService.closeDocument(event.document.uri);

  connection.sendDiagnostics({
    diagnostics: [],
    uri: event.document.uri,
  });
  refreshDiagnosticsForAffectedPaths(affectedPaths);
});

connection.onDidChangeWatchedFiles((params: DidChangeWatchedFilesParams) => {
  const affectedPaths = new Set<string>();

  for (const change of params.changes) {
    if (!change.uri.startsWith('file:')) {
      continue;
    }

    for (const affectedPath of languageService.invalidateFilePath(fileURLToPath(change.uri))) {
      affectedPaths.add(affectedPath);
    }
  }

  refreshDiagnosticsForAffectedPaths([...affectedPaths]);
});

connection.onCompletion((params): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return [];
  }

  return (
    languageService.getCompletions(document.uri, document.offsetAt(params.position)) ?? []
  ).map(toCompletionItem);
});

connection.onHover((params): Hover | null => {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return null;
  }

  const hover = languageService.getHover(document.uri, document.offsetAt(params.position));

  return hover ? toHover(hover) : null;
});

connection.onDefinition((params) => {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return [];
  }

  return (
    languageService.getDefinitions(document.uri, document.offsetAt(params.position)) ?? []
  ).map(toLocation);
});

connection.onReferences((params: ReferenceParams) => {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return [];
  }

  return (
    languageService.getReferences(
      document.uri,
      document.offsetAt(params.position),
      params.context.includeDeclaration,
    ) ?? []
  ).map(toLocation);
});

connection.onPrepareRename((params) => {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return null;
  }

  const renameInfo = languageService.getRenameInfo(
    document.uri,
    document.offsetAt(params.position),
  );

  return renameInfo
    ? {
        placeholder: renameInfo.placeholder,
        range: toRange(renameInfo.range),
      }
    : null;
});

connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return null;
  }

  const edits = languageService.getRenameEdits(
    document.uri,
    document.offsetAt(params.position),
    params.newName,
  );

  return edits ? toWorkspaceEdit(edits) : null;
});

connection.onCodeAction((params): CodeAction[] => {
  return languageService
    .getCodeActions(
      params.textDocument.uri,
      params.context.diagnostics.map((diagnostic) => fromDiagnostic(diagnostic)),
    )
    .map((action) => toCodeAction(action, params.context.diagnostics));
});

connection.onDocumentSymbol((params): DocumentSymbol[] => {
  return languageService.getDocumentSymbols(params.textDocument.uri).map(toDocumentSymbol);
});

connection.onWorkspaceSymbol((params): SymbolInformation[] => {
  return languageService.getWorkspaceSymbols(params.query).map((entry) => ({
    kind: toSymbolKind(entry.kind),
    location: {
      range: toRange(entry.range),
      uri: filePathToUri(entry.filePath),
    },
    name: entry.name,
  }));
});

documents.listen(connection);
connection.listen();

function collectWorkspaceRoots(params: InitializeParams): readonly string[] {
  const roots = new Set<string>();

  for (const folder of params.workspaceFolders ?? []) {
    if (folder.uri.startsWith('file:')) {
      roots.add(fileURLToPath(folder.uri));
    }
  }

  if (params.rootUri?.startsWith('file:')) {
    roots.add(fileURLToPath(params.rootUri));
  }

  return [...roots];
}

function refreshDiagnosticsForAffectedPaths(paths: readonly string[]): void {
  refreshDiagnosticsForUris(languageService.getOpenDocumentUrisForAffectedPaths(paths));
}

function refreshDiagnosticsForUris(uris: readonly string[]): void {
  for (const uri of [...new Set(uris)]) {
    publishDiagnostics(uri);
  }
}

function publishDiagnostics(uri: string): void {
  connection.sendDiagnostics({
    diagnostics: languageService.getDiagnostics(uri).map(toDiagnostic),
    uri,
  });
}

function toDiagnostic(diagnostic: {
  code?: number | string;
  data?: unknown;
  message: string;
  range: {
    endChar: number;
    line: number;
    startChar: number;
  };
}): Diagnostic {
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

function fromDiagnostic(diagnostic: Diagnostic): {
  code?: number | string;
  data?: unknown;
  message: string;
  range: {
    endChar: number;
    line: number;
    startChar: number;
  };
} {
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

function toHover(hover: KpaServiceHover): Hover {
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

function toCompletionItem(completion: KpaServiceCompletion): CompletionItem {
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
    item.textEdit = TextEdit.replace(toRange(completion.replacementRange), insertText);
  }

  return item;
}

function toLocation(location: KpaServiceLocation): Location {
  return {
    range: toRange(location.range),
    uri: location.uri,
  };
}

function toCodeAction(
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

function toWorkspaceEdit(edits: readonly KpaServiceTextEdit[]): WorkspaceEdit {
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

function toDocumentSymbol(symbol: KpaServiceDocumentSymbol): DocumentSymbol {
  return {
    children: symbol.children.map(toDocumentSymbol),
    detail: symbol.detail,
    kind: toSymbolKind(symbol.kind),
    name: symbol.name,
    range: toRange(symbol.range),
    selectionRange: toRange(symbol.selectionRange),
  };
}

function toRange(range: {
  end: { character: number; line: number };
  start: { character: number; line: number };
}): Range {
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

function toCompletionItemKind(kind: string): CompletionItemKind {
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

function toSymbolKind(kind: string): SymbolKind {
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

function filePathToUri(filePath: string): string {
  return pathToFileURL(filePath).toString();
}
