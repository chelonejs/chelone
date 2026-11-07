# Releasing

Releases run from `.github/workflows/release.yml` with release-please, in `chelonejs/chelone` on
`main` only.

Merge every pull request with an empty merge commit body: `gh pr merge <n> --merge --body ""`.
release-please reads any commit body line that looks like a conventional commit as one more
commit, so GitHub's default body, the pull request title, lists the change twice.

1. Every push to `main` updates one open release pull request. It bumps `@chelone/core`,
   `@chelone/react`, `@chelone/vue`, `@chelone/supabase`, `@chelone/rest`, and `@chelone/utils` to
   one shared version and writes each package's `CHANGELOG.md` from the conventional commits since the last
   release. `feat`, `fix`, `perf`, `refactor`, and `revert` commits are listed; other types are
   not. Apps stay unversioned.
2. Review the versions and changelogs, editing the pull request's body and the `CHANGELOG.md`
   files on its branch if an entry needs rewording. The GitHub release notes come from the body,
   or from `release-notes.md` on the `release-please--branches--main--release-notes` branch once
   they outgrow it.
3. Merge it.
4. The next run tags `@chelone/<name>@<version>`, creates the GitHub releases, and publishes.
   The publish job lints, typechecks, tests, builds, checks tarballs, packs each package with pnpm
   (which applies `publishConfig` and replaces `workspace:*` with the version), and publishes the
   tarballs with npm.

Publishing uses npm trusted publishing: each package's trusted publisher on npmjs.com names
`chelonejs/chelone` and `release.yml`, there is no npm token, and every version carries
provenance. To retry a failed publish, run the Release workflow by hand on `main`: the publish job
skips any version npm already has.

A new package needs its first version published by hand, since npm only takes a trusted publisher
for a package that exists: `pnpm pack` it, `npm publish <tarball> --access public`, then set its
trusted publisher before the next release. The publish job goes dependencies first and skips
private packages, so nothing else changes.

release-please reads at most `commit-search-depth` commits back, merge commits included, and
silently drops anything older from the notes. Raise it in `release-please-config.json` if a release
ever covers more than that.

release-please reads the notes as HTML and does not see markdown, so a `<word>` in a commit subject
or a `BREAKING CHANGE` footer, even in backticks or escaped as `&lt;word&gt;`, runs that package's
notes into the next one or loses a package's release. `pnpm check:release-notes <n>` fails the
release pull request on one. Reword the line where the notes live and rerun the check, just before
merging, since the next Release run writes the notes again.

A breaking change before 1.0 bumps the minor version. To force a version, add a `Release-As: x.y.z`
footer to a commit.
