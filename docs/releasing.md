# Releasing

Releases run from `.github/workflows/release.yml` with release-please, in `chelonejs/chelone` on
`main` only.

1. Every push to `main` updates one open release pull request. It bumps `@chelone/core`,
   `@chelone/react`, `@chelone/vue`, `@chelone/supabase`, and `@chelone/rest` to one shared
   version and writes each package's `CHANGELOG.md` from the conventional commits since the last
   release. `feat`, `fix`, `perf`, `refactor`, and `revert` commits are listed; other types are
   not. Apps stay unversioned.
2. Review the versions and changelogs, editing the pull request's body and the `CHANGELOG.md`
   files on its branch if an entry needs rewording. The GitHub release notes come from the body.
3. Merge it with an empty merge commit body (`gh pr merge <n> --merge --body ""`). release-please
   reads every commit body line that looks like a conventional commit as another commit, so
   GitHub's default body, the pull request title, lists the change twice.
4. The next run tags `@chelone/<name>@<version>`, creates the GitHub releases, and publishes.
   The publish job lints, typechecks, tests, builds, checks tarballs, packs each package with pnpm
   (which applies `publishConfig` and replaces `workspace:*` with the version), and publishes the
   tarballs with npm.

Publishing uses npm trusted publishing: each package's trusted publisher on npmjs.com names
`chelonejs/chelone` and `release.yml`, there is no npm token, and every version carries
provenance. To retry a failed publish, run the Release workflow by hand on `main`: the publish job
skips any version npm already has.

A breaking change before 1.0 bumps the minor version. To force a version, add a `Release-As: x.y.z`
footer to a commit.
