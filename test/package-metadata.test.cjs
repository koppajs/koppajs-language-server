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
  assert.equal(
    packageManifest.dependencies['@koppajs/koppajs-language-core'],
    '^0.1.3',
  );
  assert.equal(
    packageManifest.dependencies['@koppajs/language-core'],
    undefined,
  );
  assert.equal(packageManifest.scripts.prepack, 'npm run validate');
  assert.equal(packageManifest.scripts['release:check'], 'npm pack --dry-run');
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
