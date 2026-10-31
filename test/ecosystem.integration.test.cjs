const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

test('published ecosystem builds a canonical .kpa application and agrees on diagnostics', async (t) => {
  const [
    { build },
    { default: koppajs },
    { runKpaCheck },
    { KpaLanguageService },
  ] = await Promise.all([
    import('vite'),
    import('@koppajs/koppajs-vite-plugin'),
    import('@koppajs/koppajs-kpa-check'),
    import('@koppajs/koppajs-language-core'),
  ]);
  // A repository-local fixture resolves the installed, published packages.
  const repositoryRoot = path.dirname(require.resolve('../package.json'));
  const root = fs.mkdtempSync(path.join(repositoryRoot, 'test', '.ecosystem-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const src = path.join(root, 'src');
  const page = path.join(src, 'home-page.kpa');
  const uri = pathToFileURL(page).href;
  const source = [
    '[template]',
    '  <div>{{count}}</div>',
    '[/template]',
    '[ts]',
    '  return { state: { count: 1 } };',
    '[/ts]',
    '',
  ].join('\n');

  fs.mkdirSync(src);
  fs.writeFileSync(path.join(root, 'tsconfig.json'), '{}\n');
  fs.writeFileSync(page, source);
  fs.writeFileSync(
    path.join(root, 'index.html'),
    '<div id="app"></div><script type="module" src="/src/main.ts"></script>\n',
  );
  fs.writeFileSync(
    path.join(src, 'main.ts'),
    [
      "import { Core } from '@koppajs/koppajs-core';",
      "import { KoppajsRouter } from '@koppajs/koppajs-router';",
      "import homePage from './home-page.kpa';",
      "Core.take(homePage, 'home-page');",
      'Core();',
      'const router = new KoppajsRouter({',
      '  outlet: document.getElementById("app")!,',
      '  routes: [{ path: "/", name: "home", title: "Home", description: "Home page", componentTag: "home-page" }],',
      '});',
      'router.init();',
      '',
    ].join('\n'),
  );

  const service = new KpaLanguageService();
  service.setWorkspaceRoots([root]);
  service.openDocument(uri, source);
  t.after(() => service.closeDocument(uri));

  function checkDiagnostics(expectedExitCode) {
    const stdout = [];
    const stderr = [];
    const exitCode = runKpaCheck(['--json', src], {
      cwd: root,
      io: {
        log: (message) => stdout.push(message),
        error: (message) => stderr.push(message),
      },
    });
    assert.equal(exitCode, expectedExitCode, stdout.join('\n'));
    assert.deepEqual(stderr, []);
    assert.equal(stdout.length, 1);
    const report = JSON.parse(stdout[0]);
    const diagnostics = service.getDiagnostics(uri);
    assert.equal(report.kind, 'check');
    assert.equal(report.status, expectedExitCode === 0 ? 'ok' : 'diagnostics');
    assert.equal(report.exitCode, expectedExitCode);
    assert.equal(report.summary.checkedFileCount, 1);
    assert.equal(report.summary.diagnosticCount, diagnostics.length);
    assert.deepEqual(
      report.diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        data: diagnostic.data,
        message: diagnostic.message,
        filePath: diagnostic.filePath,
        relativeFilePath: diagnostic.relativeFilePath,
        severity: diagnostic.severity,
        line: diagnostic.line,
        character: diagnostic.character,
      })),
      diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        data: diagnostic.data,
        message: diagnostic.message,
        filePath: page,
        relativeFilePath: path.join('src', 'home-page.kpa'),
        severity: 'warning',
        line: diagnostic.range.line + 1,
        character: diagnostic.range.startChar + 1,
      })),
    );
    return report;
  }

  assert.deepEqual(checkDiagnostics(0).diagnostics, []);

  // Build only: the emitted browser entry is never executed in Node.
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [koppajs()],
    build: { write: false, minify: false },
  });
  const outputs = Array.isArray(result) ? result : [result];
  const chunks = outputs.flatMap((output) =>
    'output' in output
      ? output.output.filter((chunk) => chunk.type === 'chunk')
      : [],
  );
  assert.ok(chunks.some((chunk) => chunk.isEntry));
  assert.ok(chunks.every((chunk) => chunk.imports.length === 0));
  const code = chunks.map((chunk) => chunk.code).join('\n');
  assert.ok(code.includes('home-page'));
  assert.ok(code.includes('Home page'));
  assert.ok(code.includes('contractVersion'));
  assert.ok(code.includes('data-k-struct'));
  assert.doesNotMatch(code, /from\s*["']@koppajs\//);

  const invalidSource = source.replace('{{count}}', '{{missing}}');
  fs.writeFileSync(page, invalidSource);
  service.updateDocument(uri, invalidSource);
  const report = checkDiagnostics(1);
  assert.equal(report.diagnostics.length, 1);
  assert.match(report.diagnostics[0].message, /missing/);
  assert.equal(report.diagnostics[0].line, 2);
  assert.equal(report.diagnostics[0].character, 10);
});
