import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  console.error(message);
  failed = true;
}

function expectIncludes(relativePath, content, snippet) {
  if (!content.includes(snippet)) {
    fail(`Semantic doc check failed in ${relativePath}: missing -> ${snippet}`);
  }
}

function expectMatches(relativePath, content, pattern, description) {
  if (!pattern.test(content)) {
    fail(
      `Semantic doc check failed in ${relativePath}: missing -> ${description}`,
    );
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let failed = false;

const packageManifest = JSON.parse(read('package.json'));
const readme = read('README.md');
const contributing = read('CONTRIBUTING.md');
const release = read('RELEASE.md');
const testingStrategy = read('TESTING_STRATEGY.md');
const workflowReadme = read('.github/workflows/README.md');
const qualityReadme = read('docs/quality/README.md');
const qualityGates = read('docs/quality/quality-gates.md');
const validationBaseline = read('docs/quality/validation-baseline.md');
const toolingBaseline = read('docs/meta/tooling-baseline.md');
const specsReadme = read('docs/specs/README.md');
const ciWorkflow = read('.github/workflows/ci.yml');
const releaseWorkflow = read('.github/workflows/release.yml');
const nvmrc = read('.nvmrc').trim();
const npmrc = read('.npmrc');

const expectedNode = packageManifest.engines.node;
const expectedNpm = packageManifest.engines.npm;

const requiredScripts = [
  'build',
  'check',
  'check:docs',
  'check:docs:contract',
  'check:docs:semantics',
  'check:meta',
  'format:check',
  'lint',
  'release:check',
  'test',
  'typecheck',
  'validate',
];

for (const scriptName of requiredScripts) {
  if (!packageManifest.scripts?.[scriptName]) {
    fail(`package.json is missing required script: ${scriptName}`);
  }
}

if (
  !packageManifest.scripts['check:docs']?.includes('check:docs:contract') ||
  !packageManifest.scripts['check:docs']?.includes('check:docs:semantics')
) {
  fail(
    'package.json check:docs script must chain both structural and semantic documentation checks.',
  );
}

expectMatches(
  'README.md',
  readme,
  new RegExp(
    `Node\\.js\\s+>=\\s*${escapeRegExp(expectedNode.replace('>=', ''))}`,
  ),
  `Node.js ${expectedNode}`,
);
expectMatches(
  'README.md',
  readme,
  new RegExp(`npm\\s+>=\\s*${escapeRegExp(expectedNpm.replace('>=', ''))}`),
  `npm ${expectedNpm}`,
);
expectIncludes('README.md', readme, 'Node.js 22 and Node.js 24');
for (const scriptName of [
  'check:docs',
  'check:meta',
  'format:check',
  'lint',
  'typecheck',
  'build',
  'validate',
  'release:check',
]) {
  expectIncludes('README.md', readme, `npm run ${scriptName}`);
}

expectMatches(
  'CONTRIBUTING.md',
  contributing,
  new RegExp(
    `Node\\.js\\s+>=\\s*${escapeRegExp(expectedNode.replace('>=', ''))}`,
  ),
  `Node.js ${expectedNode}`,
);
expectMatches(
  'CONTRIBUTING.md',
  contributing,
  new RegExp(`npm\\s+>=\\s*${escapeRegExp(expectedNpm.replace('>=', ''))}`),
  `npm ${expectedNpm}`,
);
expectIncludes(
  'CONTRIBUTING.md',
  contributing,
  'The local pre-commit hook runs the same documentation guard and `npm run check:meta`',
);
for (const scriptName of [
  'check:docs',
  'check:meta',
  'check',
  'validate',
  'release:check',
]) {
  expectIncludes('CONTRIBUTING.md', contributing, `npm run ${scriptName}`);
}

expectIncludes('RELEASE.md', release, 'Node.js 22 or newer');
expectIncludes('RELEASE.md', release, 'npm 10 or newer');
expectIncludes('RELEASE.md', release, 'npm run validate');
expectIncludes('RELEASE.md', release, 'npm run release:check');

expectIncludes(
  'TESTING_STRATEGY.md',
  testingStrategy,
  '`npm run check:docs` combines structural and semantic documentation validation',
);
expectIncludes(
  'TESTING_STRATEGY.md',
  testingStrategy,
  '`npm run check:meta` validates the repository shape',
);
expectIncludes(
  'TESTING_STRATEGY.md',
  testingStrategy,
  'workspace-registered component flows discovered through `Core.take(...)`',
);

expectIncludes(
  '.github/workflows/README.md',
  workflowReadme,
  'Node.js 22 and 24',
);
expectIncludes(
  '.github/workflows/README.md',
  workflowReadme,
  'npm run validate',
);
expectIncludes(
  '.github/workflows/README.md',
  workflowReadme,
  'npm run release:check',
);

for (const scriptName of [
  'check:docs',
  'check:meta',
  'format:check',
  'lint',
  'typecheck',
  'test',
  'check',
  'validate',
  'release:check',
]) {
  expectIncludes(
    'docs/quality/README.md',
    qualityReadme,
    `npm run ${scriptName}`,
  );
}

expectIncludes(
  'docs/quality/quality-gates.md',
  qualityGates,
  '`npm run check:meta` passes',
);
expectIncludes(
  'docs/quality/quality-gates.md',
  qualityGates,
  'Node.js 22 and Node.js 24',
);

expectIncludes(
  'docs/quality/validation-baseline.md',
  validationBaseline,
  'Node.js 22 and 24',
);
expectIncludes(
  'docs/quality/validation-baseline.md',
  validationBaseline,
  'The tracked `.npmrc` enforces compatible Node.js and npm versions during',
);
expectIncludes(
  'docs/quality/validation-baseline.md',
  validationBaseline,
  'The tracked `.nvmrc` keeps the maintainer-default Node.js line on `22`.',
);

expectIncludes(
  'docs/meta/tooling-baseline.md',
  toolingBaseline,
  'Node-based repository scripts for structural docs, semantic docs, and',
);
expectIncludes('docs/meta/tooling-baseline.md', toolingBaseline, '.nvmrc');
expectIncludes('docs/meta/tooling-baseline.md', toolingBaseline, '.npmrc');

if (nvmrc !== '22') {
  fail(`.nvmrc must pin the maintainer default to 22, got: ${nvmrc}`);
}

expectIncludes('.npmrc', npmrc, 'engine-strict=true');

if (!/fail-fast:\s*false/.test(ciWorkflow)) {
  fail('.github/workflows/ci.yml should disable matrix fail-fast.');
}

if (!/node-version:\s*\$\{\{\s*matrix\.node-version\s*\}\}/.test(ciWorkflow)) {
  fail(
    '.github/workflows/ci.yml no longer uses the documented Node.js test matrix.',
  );
}

for (const version of ['22', '24']) {
  if (
    !new RegExp(
      `-\\s+${escapeRegExp(version)}|\\[.*\\b${escapeRegExp(version)}\\b.*\\]`,
    ).test(ciWorkflow)
  ) {
    fail(
      `.github/workflows/ci.yml is missing Node.js ${version} in the test matrix.`,
    );
  }
}

expectIncludes(
  '.github/workflows/release.yml',
  releaseWorkflow,
  "node-version-file: '.nvmrc'",
);
expectIncludes(
  '.github/workflows/release.yml',
  releaseWorkflow,
  'npm run validate',
);
expectIncludes(
  '.github/workflows/release.yml',
  releaseWorkflow,
  'npm run release:check',
);

const specFiles = readdirSync(path.join(root, 'docs/specs'))
  .filter((fileName) => fileName.endsWith('.md') && fileName !== 'README.md')
  .sort();

for (const specFile of specFiles) {
  expectIncludes('docs/specs/README.md', specsReadme, `\`${specFile}\``);
}

if (failed) {
  process.exit(1);
}

console.log('Documentation semantics check passed.');
