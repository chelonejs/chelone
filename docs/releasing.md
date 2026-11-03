# Releasing

## One-time setup

1. Create the `@chelone` npm organization and grant the publishing account access.
2. Create an npm automation token with permission to publish all five packages.
   Keep the repository Actions secret `NPM_TOKEN` unset until the first changeset merges.
3. In Settings > Actions > General > Workflow permissions, allow GitHub Actions
   to create and approve pull requests.

## First release

1. The first changeset, `.changeset/first-release.md`, is already merged to `main`. Do not
   add another. It bumps the fixed group `@chelone/core`, `@chelone/react`, `@chelone/vue`,
   `@chelone/supabase`, and `@chelone/rest` to `0.1.0` together. Apps remain unversioned.
2. Add the token as the repository Actions secret `NPM_TOKEN`. The changesets step skips
   while the secret is unset, preventing an initial publish at `0.0.0`. In Actions > Release >
   Run workflow, select `main` and run it manually to open the Version Packages PR.
3. The docs already read as released: the install page has no not-on-npm note and the changelog
   page is titled 0.1.0. They go live when merged to `main`, so run steps 2 and 4 soon after.
4. Review the versions and changelogs, then merge the PR to `main`. Merging it publishes `0.1.0`.
   The workflow lints, typechecks, tests, builds, checks tarballs, and publishes all five.
   pnpm applies `publishConfig` and replaces `workspace:*` with the package version.
5. Check the workflow result and the five npm package versions.

For later releases, add and merge a changeset, then merge the resulting version PR.
Regular PRs need no changeset. The workflow runs only in `chelonejs/chelone` on `main`,
on pushes or manual runs. It requests no provenance while the repository is private.
The npm organization, token, and secret require maintainer setup and cannot be verified here.
