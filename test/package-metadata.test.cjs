const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function readPackageManifest() {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  );
}

test('package manifest publishes the scoped server package against the released core dependency', () => {
  const packageManifest = readPackageManifest();

  assert.equal(packageManifest.name, '@koppajs/koppajs-language-server');
  assert.equal(packageManifest.version, '0.2.1');
  assert.equal(
    packageManifest.dependencies['@koppajs/koppajs-language-core'],
    '^0.2.1',
  );
  assert.equal(
    packageManifest.dependencies['@koppajs/language-core'],
    undefined,
  );
  assert.equal(packageManifest.engines.node, '^22.13.0 || ^24.0.0 || >=26.0.0');
  const coreManifest = JSON.parse(
    fs.readFileSync(
      path.join(
        path.dirname(require.resolve('@koppajs/koppajs-language-core')),
        '..',
        'package.json',
      ),
      'utf8',
    ),
  );

  assert.equal(coreManifest.version, '0.2.1');
  assert.equal(packageManifest.engines.node, coreManifest.engines.node);
  for (const name of [
    '@koppajs/koppajs-core',
    '@koppajs/koppajs-router',
    '@koppajs/koppajs-vite-plugin',
    '@koppajs/koppajs-kpa-check',
    'vite',
  ]) {
    assert(
      packageManifest.devDependencies[name],
      `${name} is a test dependency`,
    );
    assert.equal(packageManifest.dependencies[name], undefined);
  }
  assert.equal(packageManifest.scripts.prepack, 'npm run validate');
  assert.equal(
    packageManifest.scripts['release:check'],
    'npm pack --dry-run --ignore-scripts',
  );
  assert.equal(
    packageManifest.scripts['check:docs'],
    'npm run check:docs:contract && npm run check:docs:semantics',
  );
  assert.equal(
    packageManifest.scripts['check:meta'],
    'node scripts/check-meta-layer.mjs',
  );
  assert.deepEqual(packageManifest.files, [
    'dist',
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
  ]);
  assert.deepEqual(Object.keys(packageManifest.exports).sort(), ['.']);
  assert.equal(packageManifest.main, './dist/server.js');
  assert.equal(packageManifest.types, './dist/server.d.ts');
  assert.equal(packageManifest.publishConfig.access, 'public');
});
