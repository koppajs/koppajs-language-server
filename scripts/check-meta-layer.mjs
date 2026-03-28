import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredDirectories = [
  '.github',
  '.github/workflows',
  'docs',
  'docs/adr',
  'docs/architecture',
  'docs/meta',
  'docs/quality',
  'docs/specs',
  'scripts',
  'src',
  'test',
];

const requiredPaths = [
  '.github/workflows/README.md',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  '.husky/pre-commit',
  '.nvmrc',
  '.npmrc',
  'AI_CONSTITUTION.md',
  'ARCHITECTURE.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'DECISION_HIERARCHY.md',
  'DEVELOPMENT_RULES.md',
  'README.md',
  'RELEASE.md',
  'ROADMAP.md',
  'TESTING_STRATEGY.md',
  'docs/adr/README.md',
  'docs/architecture/README.md',
  'docs/architecture/module-boundaries.md',
  'docs/architecture/runtime-flow.md',
  'docs/meta/README.md',
  'docs/meta/maintenance.md',
  'docs/meta/tooling-baseline.md',
  'docs/meta/version-compatibility.md',
  'docs/quality/README.md',
  'docs/quality/manual-smoke-checklist.md',
  'docs/quality/quality-gates.md',
  'docs/quality/validation-baseline.md',
  'docs/specs/README.md',
  'docs/specs/language-server-lsp-contract.md',
  'docs/specs/repository-documentation-contract.md',
  'eslint.config.mjs',
  'package-lock.json',
  'package.json',
  'prettier.config.mjs',
  'scripts/check-doc-contract.mjs',
  'scripts/check-doc-semantics.mjs',
  'scripts/check-meta-layer.mjs',
  'src/protocol.ts',
  'src/server.ts',
  'test/package-metadata.test.cjs',
  'test/protocol.test.cjs',
  'test/server.integration.test.cjs',
  'tsconfig.build.json',
  'tsconfig.json',
];

let failed = false;

for (const directory of requiredDirectories) {
  const absolutePath = path.join(root, directory);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isDirectory()) {
    console.error(`Missing required directory: ${directory}/`);
    failed = true;
  }
}

for (const file of requiredPaths) {
  const absolutePath = path.join(root, file);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required path: ${file}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('Meta layer check passed.');
