# Releasing

## One-time setup

1. Create the `@chelone` npm organization and grant the publishing account access.
2. Create an npm automation token with permission to publish all three packages.
3. Add the token as the repository Actions secret `NPM_TOKEN`.
4. In Settings > Actions > General > Workflow permissions, allow GitHub Actions
   to create and approve pull requests.

## Cut a release

1. Run `pnpm install --frozen-lockfile`, then `pnpm changeset`.
   Select a package and bump type, write the release notes, and commit the changeset.
   The fixed group releases `@chelone/core`, `@chelone/react`, and `@chelone/vue`
   at the same version. Apps remain unversioned.
2. Merge the changeset to `main`. The Release workflow opens or updates a version PR.
3. Review the versions and changelogs, then merge that PR to `main`.
   The workflow builds, checks the package tarballs, and publishes all three to npm.
   pnpm applies `publishConfig` and replaces `workspace:*` with the package version.
4. Check the workflow result and the three npm package versions.

Regular PRs need no changeset, and CI does not require one. Add one when cutting a release.
The workflow runs only in `chelonejs/chelone` on pushes to `main`.
It does not request npm provenance while the repository is private.
The npm organization, token, and secret require maintainer setup and cannot be verified here.
