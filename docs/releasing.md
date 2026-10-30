# Releasing

## One-time setup

1. Create the `@chelone` npm organization and grant the publishing account access.
2. Create an npm automation token with permission to publish all three packages.
   Keep the repository Actions secret `NPM_TOKEN` unset until the first changeset merges.
3. In Settings > Actions > General > Workflow permissions, allow GitHub Actions
   to create and approve pull requests.

## First release

1. Run `pnpm install --frozen-lockfile`, then `pnpm changeset`.
   Select a package and bump type, write the release notes, and commit the changeset.
   The fixed group releases `@chelone/core`, `@chelone/react`, and `@chelone/vue`
   at the same version. Apps remain unversioned.
2. Merge the changeset to `main` before adding `NPM_TOKEN`. The changesets step skips
   while the secret is unset, preventing an initial publish at `0.0.0`.
3. Add the token as the repository Actions secret `NPM_TOKEN`. In Actions > Release >
   Run workflow, select `main` and run it manually to open the version PR.
4. Review the versions and changelogs, then merge that PR to `main`.
   The workflow builds, checks the package tarballs, and publishes all three to npm.
   pnpm applies `publishConfig` and replaces `workspace:*` with the package version.
5. Check the workflow result and the three npm package versions.

For later releases, add and merge a changeset, then merge the resulting version PR.
Regular PRs need no changeset. The workflow runs only in `chelonejs/chelone`, on pushes
to `main` or manual runs. It requests no provenance while the repository is private.
The npm organization, token, and secret require maintainer setup and cannot be verified here.
