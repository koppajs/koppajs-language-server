import { fileURLToPath } from 'url';
import {
  createConnection,
  DidChangeWatchedFilesNotification,
  ProposedFeatures,
  TextDocuments,
} from 'vscode-languageserver/node.js';
import type {
  Connection,
  DidChangeWatchedFilesParams,
  ReferenceParams,
  RenameParams,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { KpaLanguageService } from '@koppajs/koppajs-language-core';
import {
  applyWorkspaceFolderChange,
  collectWorkspaceRoots,
  fromDiagnostic,
  serverCapabilities,
  toRequestFailedResponseError,
  toCodeAction,
  toCompletionItem,
  toDiagnostic,
  toDocumentSymbol,
  toHover,
  toLocation,
  toRange,
  toWorkspaceEdit,
  toWorkspaceSymbol,
  watchedFilesRegistrationOptions,
} from './protocol.js';

const connection: Connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const languageService = new KpaLanguageService();
let supportsWorkspaceFolderChanges = false;
let supportsDynamicWatchedFiles = false;
let workspaceRoots: readonly string[] = [];

connection.onInitialize((params) => {
  supportsWorkspaceFolderChanges = Boolean(
    params.capabilities.workspace?.workspaceFolders,
  );
  supportsDynamicWatchedFiles = Boolean(
    params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration,
  );
  workspaceRoots = collectWorkspaceRoots(params);
  languageService.setWorkspaceRoots(workspaceRoots);

  return {
    capabilities: serverCapabilities,
  };
});

connection.onInitialized(() => {
  if (supportsDynamicWatchedFiles) {
    void connection.client
      .register(
        DidChangeWatchedFilesNotification.type,
        watchedFilesRegistrationOptions,
      )
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown registration error.';
        connection.console.error(
          `Failed to register watched files for KoppaJS language server: ${message}`,
        );
      });
  }

  if (!supportsWorkspaceFolderChanges) {
    return;
  }

  connection.workspace.onDidChangeWorkspaceFolders((event) => {
    workspaceRoots = applyWorkspaceFolderChange(workspaceRoots, event);
    languageService.setWorkspaceRoots(workspaceRoots);
    refreshDiagnosticsForOpenDocuments();
  });
});

documents.onDidOpen((event) => {
  connection.sendDiagnostics({
    diagnostics: [],
    uri: event.document.uri,
  });
  const affectedPaths = languageService.openDocument(
    event.document.uri,
    event.document.getText(),
  );

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
  let didInvalidateWorkspaceState = false;

  for (const change of params.changes) {
    if (!change.uri.startsWith('file:')) {
      continue;
    }

    languageService.invalidateFilePath(fileURLToPath(change.uri));
    didInvalidateWorkspaceState = true;
  }

  if (didInvalidateWorkspaceState) {
    refreshDiagnosticsForOpenDocuments();
  }
});

connection.onCompletion((params) => {
  return runServiceRequest('Completion request failed.', () => {
    const document = documents.get(params.textDocument.uri);

    if (!document) {
      return [];
    }

    return (
      languageService.getCompletions(
        document.uri,
        document.offsetAt(params.position),
      ) ?? []
    ).map(toCompletionItem);
  });
});

connection.onHover((params) => {
  return runServiceRequest('Hover request failed.', () => {
    const document = documents.get(params.textDocument.uri);

    if (!document) {
      return null;
    }

    const hover = languageService.getHover(
      document.uri,
      document.offsetAt(params.position),
    );

    return hover ? toHover(hover) : null;
  });
});

connection.onDefinition((params) => {
  return runServiceRequest('Definition request failed.', () => {
    const document = documents.get(params.textDocument.uri);

    if (!document) {
      return [];
    }

    return (
      languageService.getDefinitions(
        document.uri,
        document.offsetAt(params.position),
      ) ?? []
    ).map(toLocation);
  });
});

connection.onReferences((params: ReferenceParams) => {
  return runServiceRequest('References request failed.', () => {
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
});

connection.onPrepareRename((params) => {
  return runServiceRequest('Prepare rename request failed.', () => {
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
});

connection.onRenameRequest((params: RenameParams) => {
  return runServiceRequest('Rename request failed.', () => {
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
});

connection.onCodeAction((params) => {
  return runServiceRequest('Code action request failed.', () =>
    languageService
      .getCodeActions(
        params.textDocument.uri,
        params.context.diagnostics.map((diagnostic) =>
          fromDiagnostic(diagnostic),
        ),
      )
      .map((action) => toCodeAction(action, params.context.diagnostics)),
  );
});

connection.onDocumentSymbol((params) => {
  return runServiceRequest('Document symbol request failed.', () =>
    languageService
      .getDocumentSymbols(params.textDocument.uri)
      .map(toDocumentSymbol),
  );
});

connection.onWorkspaceSymbol((params) => {
  return runServiceRequest('Workspace symbol request failed.', () =>
    languageService.getWorkspaceSymbols(params.query).map(toWorkspaceSymbol),
  );
});

documents.listen(connection);
connection.listen();

function refreshDiagnosticsForAffectedPaths(paths: readonly string[]): void {
  refreshDiagnosticsForUris(
    languageService.getOpenDocumentUrisForAffectedPaths(paths),
  );
}

function refreshDiagnosticsForOpenDocuments(): void {
  refreshDiagnosticsForUris(documents.all().map((document) => document.uri));
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

function runServiceRequest<T>(fallbackMessage: string, operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    throw toRequestFailedResponseError(error, fallbackMessage);
  }
}
