# Meta Layer Guide

The meta layer is the repository's architecture memory and decision framework.
It exists to keep implementation, docs, and collaboration rules aligned.

## Contents

- root governance docs define the top-level rules for architecture,
  development, testing, and decision precedence
- `docs/architecture/` stores deeper structure and runtime-flow detail
- `docs/adr/` stores architectural decisions and their rationale
- `docs/specs/` stores the package's client-visible contract
- `docs/quality/` stores quality gates and manual verification procedures
- `docs/meta/tooling-baseline.md` records the active tooling baseline and
  deliberate exclusions
- `docs/meta/version-compatibility.md` defines how the server tracks compatible
  `@koppajs/koppajs-language-core` versions
- `docs/meta/maintenance.md` defines how the meta layer evolves with the codebase

## Operating Rule

If the system changes, the meta layer changes in the same pull request. Drift is
a defect.
