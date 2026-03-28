# Change Log

All notable changes to **@koppajs/koppajs-language-server** are documented in this file.

This project uses a **manual, tag-driven release process**.
Only tagged versions represent official releases.

This changelog documents **intentional milestones and guarantees**,
not every internal refactor.

---

## [Unreleased]

This section is intentionally empty.

---

## 0.1.2

- raise the repository Node.js minimum to `>=22` and expand CI validation to
  Node.js 22 and 24
- add semantic documentation/meta-layer guards, align maintainer Node defaults,
  and extend stdio-LSP coverage for workspace component, semantic request, and
  quick-fix flows

---

## 0.1.1

- widen the supported `@koppajs/koppajs-language-core` range to `^0.1.3`
- add the governed repository documentation contract, local `check:docs`
  validation, and the matching Husky pre-commit hook
- align the Node ESM import paths and ESLint config with the current module and
  script layout

---

## 0.1.0

- publish the language-server package as `@koppajs/koppajs-language-server`
- consume the released `@koppajs/koppajs-language-core@^0.1.2` package
- register watched-file notifications for `.kpa`, JS/TS, and project-config
  inputs when the client supports dynamic registration
- add package-manifest checks, stdio-LSP integration tests, and CI/release
  workflows
