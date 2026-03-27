# Release Process for `@koppajs/koppajs-language-server`

This document describes the repository-specific release workflow for
`@koppajs/koppajs-language-server`.

The project uses a manual, tag-driven release process.
Only tagged versions are official releases.

The effective flow is:

1. Finalize the release content on `develop`
2. Create a `release/*` branch from that state
3. Merge the release branch into `main`
4. Tag the release commit on `main` as `vX.Y.Z`
5. Push `main` and then push the tag
6. Let GitHub Actions validate and publish the release
7. Merge the updated `main` back into `develop`

## Release Model

This repository does not use automated versioning tools such as Changesets or
semantic-release.

The release is controlled by:

- the version in `package.json`
- the release entry in `CHANGELOG.md`
- the merge of the release-ready state into `main`
- the Git tag in the form `vX.Y.Z`
- the GitHub Actions workflow in `.github/workflows/release.yml`

Important consequences:

- a merge to `main` alone does not publish anything
- a tag push is the technical release trigger
- the tag version must exactly match `package.json`
- the tag must point to a commit that is already on `main`
- after a successful release, `main` should be merged back into `develop`

Do not tag `develop`.
Do not tag the `release/*` branch.
Tag only the release commit that is already on `main`.

## Preconditions

Before cutting a release, ensure all of the following are true:

- the intended release scope is already complete on `develop`
- `package.json.name` is exactly `@koppajs/koppajs-language-server`
- `package.json` contains the target version
- `CHANGELOG.md` contains the corresponding release notes
- `package-lock.json` is up to date
- the release content has been reviewed
- the repository secrets required by GitHub Actions are configured

Tooling expectations for local verification:

- Node.js 20 or newer
- npm 10 or newer

## Local Validation Before Branching

Before creating the release branch, validate the exact release candidate
locally.

Recommended commands:

```bash
npm ci
npm run validate
npm run release:check
```

Why this matters:

- the release workflow runs the same validation gates again in CI
- failing locally is cheaper than failing after tagging
- `npm run release:check` verifies the publishable package payload

Before tagging, also review
[docs/meta/version-compatibility.md](./docs/meta/version-compatibility.md)
and confirm that the declared
`@koppajs/koppajs-language-core` range is the range you intend to support.

The published package contents are controlled by the `files` field in
`package.json`. The intended publish payload is:

- `dist`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`

## Step-by-Step Release Workflow

### 1. Finalize the release on `develop`

Ensure `develop` already contains the exact release content.

Typical release preparation includes:

- updating `package.json` from the previous version to the next release version
- moving the relevant notes into the final section in `CHANGELOG.md`
- committing any last release fixes

Do not create the tag at this stage.

### 2. Create the `release/*` branch

Create a release branch from the validated `develop` state.

Example:

```bash
git checkout -b release/X.Y.Z
```

### 3. Merge the release branch into `main`

Merge `release/*` into `main` using the repository's normal process.

The critical requirement is:

- `main` must contain the final release commit before tagging

### 4. Tag the release commit on `main`

After the release branch has been merged, create the Git tag on the release
commit that is now on `main`.

Example:

```bash
git checkout main
git pull
git tag vX.Y.Z
```

The tag format is mandatory:

- `vX.Y.Z` is valid
- `X.Y.Z` is not valid for this workflow

### 5. Push `main` and the tag

Push the merged `main` branch and then the tag.

Example:

```bash
git push origin main
git push origin vX.Y.Z
```

The release workflow is triggered by the tag push.
Without the tag push, no npm release happens.
