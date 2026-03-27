const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

class LspServerSession {
  constructor(cwd) {
    this.buffer = Buffer.alloc(0);
    this.cwd = cwd;
    this.nextId = 1;
    this.notificationWaiters = [];
    this.notificationsByMethod = new Map();
    this.pendingRequests = new Map();
    this.requestHandlers = new Map([
      ['client/registerCapability', async () => null],
    ]);
    this.requestsByMethod = new Map();
    this.stderr = '';
    this.process = spawn(process.execPath, ['dist/server.js', '--stdio'], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout.on('data', (chunk) => this.handleData(chunk));
    this.process.stderr.on('data', (chunk) => {
      this.stderr += chunk.toString('utf8');
    });
    this.process.on('exit', (code, signal) => {
      const error =
        code === 0 || signal === 'SIGTERM'
          ? null
          : new Error(
              `Language server exited unexpectedly (code=${code}, signal=${signal ?? 'none'}).\n${this.stderr}`,
            );

      for (const { reject } of this.pendingRequests.values()) {
        reject(error ?? new Error('Language server exited before replying.'));
      }

      this.pendingRequests.clear();
    });
  }

  async close() {
    if (this.process.exitCode !== null) {
      return;
    }

    try {
      await this.request('shutdown', null);
    } catch {
      // Ignore shutdown failures during test cleanup.
    }

    this.notify('exit');
    await once(this.process, 'exit');
  }

  notify(method, params) {
    this.send({
      jsonrpc: '2.0',
      method,
      params,
    });
  }

  request(method, params) {
    const id = this.nextId++;

    this.send({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { reject, resolve });
    });
  }

  async waitForNotification(method, predicate = () => true, timeoutMs = 5000) {
    return this.waitForMessage(
      this.notificationsByMethod,
      this.notificationWaiters,
      method,
      predicate,
      timeoutMs,
      'notification',
    );
  }

  async waitForServerRequest(method, predicate = () => true, timeoutMs = 5000) {
    return this.waitForMessage(
      this.requestsByMethod,
      this.notificationWaiters,
      method,
      predicate,
      timeoutMs,
      'server request',
    );
  }

  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');

      if (headerEnd === -1) {
        return;
      }

      const header = this.buffer.slice(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);

      if (!match) {
        throw new Error(`Invalid LSP header received:\n${header}`);
      }

      const contentLength = Number(match[1]);
      const messageStart = headerEnd + 4;

      if (this.buffer.length < messageStart + contentLength) {
        return;
      }

      const message = JSON.parse(
        this.buffer
          .slice(messageStart, messageStart + contentLength)
          .toString('utf8'),
      );

      this.buffer = this.buffer.slice(messageStart + contentLength);
      this.handleMessage(message);
    }
  }

  handleMessage(message) {
    if (message.method && message.id !== undefined) {
      this.recordMessage(this.requestsByMethod, 'server request', message);
      void this.handleServerRequest(message);
      return;
    }

    if (message.method) {
      this.recordMessage(this.notificationsByMethod, 'notification', message);
      return;
    }

    const pendingRequest = this.pendingRequests.get(message.id);

    if (!pendingRequest) {
      return;
    }

    this.pendingRequests.delete(message.id);

    if (message.error) {
      const error = new Error(message.error.message);

      error.code = message.error.code;
      error.data = message.error.data;
      pendingRequest.reject(error);
      return;
    }

    pendingRequest.resolve(message.result);
  }

  async handleServerRequest(message) {
    const handler = this.requestHandlers.get(message.method);

    try {
      const result = handler ? await handler(message.params) : null;

      this.send({
        jsonrpc: '2.0',
        id: message.id,
        result,
      });
    } catch (error) {
      this.send({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  recordMessage(store, kind, message) {
    const queue = store.get(message.method) ?? [];

    queue.push(message);
    store.set(message.method, queue);

    for (const waiter of [...this.notificationWaiters]) {
      if (
        waiter.kind === kind &&
        waiter.method === message.method &&
        waiter.predicate(message)
      ) {
        clearTimeout(waiter.timeout);
        this.notificationWaiters.splice(
          this.notificationWaiters.indexOf(waiter),
          1,
        );
        waiter.resolve(
          this.takeMessage(store, message.method, waiter.predicate) ?? message,
        );
      }
    }
  }

  send(message) {
    const payload = JSON.stringify(message);

    this.process.stdin.write(
      `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`,
    );
  }

  waitForMessage(store, waiters, method, predicate, timeoutMs, kind) {
    const existingMessage = this.takeMessage(store, method, predicate);

    if (existingMessage) {
      return Promise.resolve(existingMessage);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(
          new Error(
            `Timed out waiting for ${kind} ${method}.\nServer stderr:\n${this.stderr}`,
          ),
        );
      }, timeoutMs);
      const waiter = {
        kind,
        method,
        predicate,
        resolve,
        reject,
        timeout,
      };

      waiters.push(waiter);
    });
  }

  takeMessage(store, method, predicate) {
    const queue = store.get(method) ?? [];
    const index = queue.findIndex((message) => predicate(message));

    if (index === -1) {
      return undefined;
    }

    const [message] = queue.splice(index, 1);

    if (queue.length === 0) {
      store.delete(method);
    } else {
      store.set(method, queue);
    }

    return message;
  }
}

async function initializeWorkspace(
  session,
  workspaceUri,
  workspaceCapabilities = {},
) {
  await session.request('initialize', {
    processId: process.pid,
    rootUri: workspaceUri,
    capabilities: {
      workspace: workspaceCapabilities,
    },
    workspaceFolders: [{ name: 'workspace', uri: workspaceUri }],
  });
  session.notify('initialized', {});
}

function positionAt(text, offset) {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const prefix = text.slice(0, safeOffset);
  const lines = prefix.split('\n');

  return {
    line: lines.length - 1,
    character: lines.at(-1).length,
  };
}

function changesForUri(workspaceEdit, uri) {
  return workspaceEdit.changes?.[uri] ?? [];
}

test('server dynamically registers watched files for Koppa and script inputs', async (t) => {
  const session = new LspServerSession(process.cwd());

  t.after(async () => {
    await session.close();
  });

  const workspaceDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'koppajs-language-server-integration-'),
  );
  const workspaceUri = pathToFileURL(workspaceDirectory).href;

  await session.request('initialize', {
    processId: process.pid,
    rootUri: workspaceUri,
    capabilities: {
      workspace: {
        workspaceFolders: true,
        didChangeWatchedFiles: {
          dynamicRegistration: true,
        },
      },
    },
    workspaceFolders: [{ name: 'workspace', uri: workspaceUri }],
  });
  session.notify('initialized', {});

  const registrationRequest = await session.waitForServerRequest(
    'client/registerCapability',
    (message) =>
      message.params.registrations.some(
        (registration) =>
          registration.method === 'workspace/didChangeWatchedFiles',
      ),
  );
  const watchedFilesRegistration =
    registrationRequest.params.registrations.find(
      (registration) =>
        registration.method === 'workspace/didChangeWatchedFiles',
    );
  const globs = watchedFilesRegistration.registerOptions.watchers.map(
    (watcher) => watcher.globPattern,
  );

  assert.deepEqual(globs, [
    '**/*.kpa',
    '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}',
    '**/tsconfig.json',
    '**/jsconfig.json',
  ]);
  assert(
    watchedFilesRegistration.registerOptions.watchers.every(
      (watcher) => watcher.kind === 7,
    ),
  );
});

test('watched-file invalidation refreshes diagnostics for affected open documents', async (t) => {
  const session = new LspServerSession(process.cwd());

  t.after(async () => {
    await session.close();
  });

  const workspaceDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'koppajs-language-server-integration-'),
  );
  const componentPath = path.join(workspaceDirectory, 'UserCard.kpa');
  const pagePath = path.join(workspaceDirectory, 'Page.kpa');
  const pageUri = pathToFileURL(pagePath).href;
  const componentUri = pathToFileURL(componentPath).href;
  const pageText = [
    '[template]',
    '  <UserCard />',
    '[/template]',
    '',
    '[ts]',
    "  import UserCard from './UserCard';",
    '[/ts]',
  ].join('\n');

  fs.writeFileSync(componentPath, '[template]\n  <div></div>\n[/template]\n');
  fs.writeFileSync(pagePath, pageText);

  const workspaceUri = pathToFileURL(workspaceDirectory).href;

  await session.request('initialize', {
    processId: process.pid,
    rootUri: workspaceUri,
    capabilities: {
      workspace: {
        workspaceFolders: true,
      },
    },
    workspaceFolders: [{ name: 'workspace', uri: workspaceUri }],
  });
  session.notify('initialized', {});
  session.notify('textDocument/didOpen', {
    textDocument: {
      uri: pageUri,
      languageId: 'kpa',
      version: 1,
      text: pageText,
    },
  });

  await session.waitForNotification(
    'textDocument/publishDiagnostics',
    (message) => message.params.uri === pageUri,
  );
  await session.waitForNotification(
    'textDocument/publishDiagnostics',
    (message) => message.params.uri === pageUri,
  );

  fs.writeFileSync(
    componentPath,
    [
      '[template]',
      '  <div></div>',
      '[/template]',
      '',
      '[ts]',
      '  return {',
      '    props: {',
      '      title: { type: String, required: true },',
      '    },',
      '  };',
      '[/ts]',
    ].join('\n'),
  );

  session.notify('workspace/didChangeWatchedFiles', {
    changes: [
      {
        uri: componentUri,
        type: 2,
      },
    ],
  });

  const diagnosticsNotification = await session.waitForNotification(
    'textDocument/publishDiagnostics',
    (message) =>
      message.params.uri === pageUri &&
      message.params.diagnostics.some(
        (diagnostic) => diagnostic.code === 'kpa.missing-component-prop',
      ),
  );
  const missingPropDiagnostic = diagnosticsNotification.params.diagnostics.find(
    (diagnostic) => diagnostic.code === 'kpa.missing-component-prop',
  );

  assert.equal(missingPropDiagnostic.source, 'koppa-diagnostics');
  assert.match(missingPropDiagnostic.message, /title/);
});

test('language features round-trip over stdio LSP requests', async (t) => {
  const session = new LspServerSession(process.cwd());

  t.after(async () => {
    await session.close();
  });

  const workspaceDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'koppajs-language-server-integration-'),
  );
  const componentPath = path.join(workspaceDirectory, 'UserCard.kpa');
  const pageAPath = path.join(workspaceDirectory, 'PageA.kpa');
  const pageBPath = path.join(workspaceDirectory, 'PageB.kpa');
  const componentUri = pathToFileURL(componentPath).href;
  const pageAUri = pathToFileURL(pageAPath).href;
  const pageBUri = pathToFileURL(pageBPath).href;
  const componentText = [
    '[template]',
    '  <slot name="header"></slot>',
    '  <div>{{title}}</div>',
    '[/template]',
    '',
    '[ts]',
    '  export function buildUserCard() {',
    "    return 'user-card';",
    '  }',
    '  return {',
    '    props: {',
    '      title: { type: String, required: true },',
    '    },',
    '  };',
    '[/ts]',
  ].join('\n');
  const pageAText = [
    '[template]',
    '  <UserCard />',
    '  <div>{{ co }}</div>',
    '[/template]',
    '',
    '[ts]',
    "  import UserCard from './UserCard';",
    '  return {',
    '    state: { count: 1 },',
    '  };',
    '[/ts]',
  ].join('\n');
  const pageBText = [
    '[template]',
    '  <UserCard />',
    '[/template]',
    '',
    '[ts]',
    "  import UserCard from './UserCard';",
    '[/ts]',
  ].join('\n');
  const componentOffset = pageAText.indexOf('UserCard') + 1;
  const completionOffset = pageAText.indexOf('co') + 1;
  const propCompletionOffset = pageAText.indexOf('/>') - 1;

  fs.writeFileSync(componentPath, componentText);
  fs.writeFileSync(pageAPath, pageAText);
  fs.writeFileSync(pageBPath, pageBText);

  const workspaceUri = pathToFileURL(workspaceDirectory).href;

  await initializeWorkspace(session, workspaceUri, {
    workspaceFolders: true,
  });
  session.notify('textDocument/didOpen', {
    textDocument: {
      uri: pageAUri,
      languageId: 'kpa',
      version: 1,
      text: pageAText,
    },
  });

  const diagnosticsNotification = await session.waitForNotification(
    'textDocument/publishDiagnostics',
    (message) =>
      message.params.uri === pageAUri &&
      message.params.diagnostics.some(
        (diagnostic) => diagnostic.code === 'kpa.missing-component-prop',
      ),
  );
  const missingPropDiagnostic = diagnosticsNotification.params.diagnostics.find(
    (diagnostic) => diagnostic.code === 'kpa.missing-component-prop',
  );

  const expressionCompletions = await session.request(
    'textDocument/completion',
    {
      textDocument: { uri: pageAUri },
      position: positionAt(pageAText, completionOffset),
    },
  );
  const attributeCompletions = await session.request(
    'textDocument/completion',
    {
      textDocument: { uri: pageAUri },
      position: positionAt(pageAText, propCompletionOffset),
    },
  );
  const hover = await session.request('textDocument/hover', {
    textDocument: { uri: pageAUri },
    position: positionAt(pageAText, componentOffset),
  });
  const definitions = await session.request('textDocument/definition', {
    textDocument: { uri: pageAUri },
    position: positionAt(pageAText, componentOffset),
  });
  const references = await session.request('textDocument/references', {
    textDocument: { uri: pageAUri },
    position: positionAt(pageAText, componentOffset),
    context: {
      includeDeclaration: true,
    },
  });
  const prepareRename = await session.request('textDocument/prepareRename', {
    textDocument: { uri: pageAUri },
    position: positionAt(pageAText, componentOffset),
  });
  const renameEdit = await session.request('textDocument/rename', {
    textDocument: { uri: pageAUri },
    position: positionAt(pageAText, componentOffset),
    newName: 'AccountCard',
  });
  const codeActions = await session.request('textDocument/codeAction', {
    textDocument: { uri: pageAUri },
    range: missingPropDiagnostic.range,
    context: {
      diagnostics: diagnosticsNotification.params.diagnostics,
      only: ['quickfix'],
    },
  });
  const documentSymbols = await session.request('textDocument/documentSymbol', {
    textDocument: { uri: pageAUri },
  });
  const workspaceSymbols = await session.request('workspace/symbol', {
    query: 'buildUserCard',
  });

  assert(expressionCompletions.some((item) => item.label === 'count'));
  assert(attributeCompletions.some((item) => item.label === 'title'));
  assert.match(hover.contents.value, /component UserCard/);
  assert.match(hover.contents.value, /Props:/);
  assert(definitions.some((location) => location.uri === componentUri));
  assert(references.some((location) => location.uri === pageAUri));
  assert(references.some((location) => location.uri === pageBUri));
  assert.equal(prepareRename.placeholder, 'UserCard');
  assert(
    changesForUri(renameEdit, pageAUri).some(
      (edit) => edit.newText === 'AccountCard',
    ),
  );
  assert(
    changesForUri(renameEdit, pageBUri).some(
      (edit) => edit.newText === 'AccountCard',
    ),
  );
  assert(
    codeActions.some(
      (action) =>
        action.kind === 'quickfix' &&
        changesForUri(action.edit, pageAUri).some(
          (edit) => edit.newText === ` :title="''"`,
        ),
    ),
  );
  assert.deepEqual(
    documentSymbols.map((symbol) => symbol.name),
    ['[template]', '[ts]'],
  );
  assert(
    workspaceSymbols.some(
      (symbol) =>
        symbol.name === 'buildUserCard' && symbol.location.uri === componentUri,
    ),
  );
});
