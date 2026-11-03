// Pushes a git tag and creates a GitHub release for each package whose current
// version is on npm but has no tag on the remote. `changesets/action` does this
// by reading `New tag:` lines from the publish output, which @changesets/cli 3
// no longer prints, so the release workflow runs this after the action.
//
//   node scripts/release-tags.mjs                 tag and release what is missing
//   node scripts/release-tags.mjs --dry-run       print what it would do, change nothing
//   node scripts/release-tags.mjs --remote <name> look for tags on <name> instead of origin
//
// A package whose tag is already on the remote is skipped, so a rerun is safe.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The body under `## <version>` in a changesets CHANGELOG, or null. */
export function changelogSection(changelog, version) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return null;
  const end = lines.findIndex(
    (line, i) => i > start && line.startsWith("## "),
  );
  const body = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
  return body === "" ? null : body;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
}

function runOrThrow(command, args) {
  const result = run(command, args);
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`,
    );
  }
  return result.stdout;
}

function onRemote(remote, tag) {
  const out = runOrThrow("git", [
    "ls-remote",
    "--tags",
    remote,
    `refs/tags/${tag}`,
  ]);
  return out.trim() !== "";
}

// `npm view` exits non-zero for a version that does not exist, and for a
// network failure. Only the first means "not published".
function onNpm(name, version) {
  const result = run("npm", ["view", `${name}@${version}`, "version"]);
  if (result.status === 0) return result.stdout.trim() === version;
  if (/E404|404 Not Found/.test(result.stderr)) return false;
  throw new Error(`npm view ${name}@${version} failed:\n${result.stderr}`);
}

function readPackages() {
  const dir = path.join(root, "packages");
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const packageDir = path.join(dir, entry.name);
      let manifest;
      try {
        manifest = JSON.parse(
          readFileSync(path.join(packageDir, "package.json"), "utf8"),
        );
      } catch {
        return [];
      }
      if (manifest.private) return [];
      return [{ name: manifest.name, version: manifest.version, packageDir }];
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const remoteFlag = args.indexOf("--remote");
  const remote = remoteFlag === -1 ? "origin" : args[remoteFlag + 1];
  if (!remote) throw new Error("--remote needs a remote name");
  const notesDir = dryRun
    ? null
    : mkdtempSync(path.join(tmpdir(), "release-notes-"));

  for (const { name, version, packageDir } of readPackages()) {
    const tag = `${name}@${version}`;
    if (onRemote(remote, tag)) {
      console.log(`${tag}: tag already exists on ${remote}, nothing to do`);
      continue;
    }
    if (!onNpm(name, version)) {
      console.log(`${tag}: not on npm yet, skipping`);
      continue;
    }

    const changelogPath = path.join(packageDir, "CHANGELOG.md");
    const notes = changelogSection(readFileSync(changelogPath, "utf8"), version);
    if (notes === null) {
      throw new Error(
        `${tag}: no "## ${version}" section in ${path.relative(root, changelogPath)}`,
      );
    }
    const changelogLabel = `${path.relative(root, changelogPath)} section ${version}`;

    if (dryRun) {
      console.log(
        `${tag}: would tag HEAD, push to ${remote}, and create a GitHub release from ${changelogLabel}`,
      );
      continue;
    }

    // `changeset publish` already tags locally in CI; reuse that tag.
    const localTag = run("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
    if (localTag.status !== 0) runOrThrow("git", ["tag", tag, "HEAD"]);
    runOrThrow("git", ["push", remote, `refs/tags/${tag}`]);
    const notesFile = path.join(
      notesDir,
      `${name.replace(/[^\w.-]/g, "_")}-${version}.md`,
    );
    writeFileSync(notesFile, `${notes}\n`);
    runOrThrow("gh", [
      "release",
      "create",
      tag,
      "--title",
      tag,
      "--notes-file",
      notesFile,
    ]);
    console.log(`${tag}: tagged, pushed, and released from ${changelogLabel}`);
  }
}

const isEntry =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntry) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
