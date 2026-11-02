// Fails when a pull request adds duplicated code, or removes some without
// updating the baseline. Clones are counted per pair of files, so the count
// does not move when unrelated lines do.
//
//   pnpm check:duplication            compare with duplication-baseline.json
//   pnpm check:duplication --update   rewrite the baseline from the current tree
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "duplication-baseline.json");

const SEPARATOR = " <-> ";

function readClones() {
  const out = mkdtempSync(path.join(tmpdir(), "jscpd-"));
  try {
    const run = spawnSync(
      process.env.JSCPD_BIN ?? path.join(root, "node_modules", ".bin", "jscpd"),
      ["--silent", "--absolute", "--reporters", "json", "--output", out],
      { cwd: root, encoding: "utf8" },
    );
    if (run.error || run.status !== 0) {
      console.error(run.stdout, run.stderr, run.error ?? "");
      throw new Error("jscpd failed");
    }
    const report = JSON.parse(
      readFileSync(path.join(out, "jscpd-report.json"), "utf8"),
    );
    return report.duplicates.map((clone) => ({
      first: {
        file: path.relative(root, clone.firstFile.name),
        start: clone.firstFile.start,
        end: clone.firstFile.end,
      },
      second: {
        file: path.relative(root, clone.secondFile.name),
        start: clone.secondFile.start,
        end: clone.secondFile.end,
      },
    }));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

/** Groups clones by their pair of files; the pair's key lists the files in sorted order. */
function groupByPair(clones) {
  const pairs = new Map();
  for (const clone of clones) {
    const [a, b] = [clone.first, clone.second].sort(
      (x, y) => x.file.localeCompare(y.file) || x.start - y.start,
    );
    const key = `${a.file}${SEPARATOR}${b.file}`;
    const ranges = pairs.get(key) ?? [];
    ranges.push(
      `${a.file}:${a.start}-${a.end}${SEPARATOR}${b.file}:${b.start}-${b.end}`,
    );
    pairs.set(key, ranges);
  }
  return pairs;
}

function readBaseline() {
  try {
    return JSON.parse(readFileSync(baselinePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function writeBaseline(pairs) {
  const sorted = Object.fromEntries(
    [...pairs]
      .map(([key, ranges]) => [key, ranges.length])
      .sort(([x], [y]) => x.localeCompare(y)),
  );
  writeFileSync(baselinePath, `${JSON.stringify(sorted, null, 2)}\n`);
}

const pairs = groupByPair(readClones());

if (process.argv.includes("--update")) {
  writeBaseline(pairs);
  console.log(
    `duplication-baseline.json rewritten: ${pairs.size} file pairs, ${[...pairs.values()].reduce((n, r) => n + r.length, 0)} clones.`,
  );
  process.exit(0);
}

const baseline = readBaseline();
const added = [];
const removed = [];

for (const [key, ranges] of pairs) {
  const allowed = baseline[key] ?? 0;
  if (ranges.length > allowed) added.push({ key, ranges, allowed });
}
for (const [key, allowed] of Object.entries(baseline)) {
  const found = pairs.get(key)?.length ?? 0;
  if (found < allowed) removed.push({ key, found, allowed });
}

if (added.length > 0) {
  console.error("New duplication. Remove the copy, or move the shared code to core:\n");
  for (const { key, ranges, allowed } of added) {
    console.error(`${key}: ${ranges.length} clones, baseline allows ${allowed}`);
    for (const range of ranges) console.error(`  ${range}`);
  }
}
if (removed.length > 0) {
  if (added.length > 0) console.error("");
  console.error("Duplication was removed. Run pnpm check:duplication --update and commit the baseline:\n");
  for (const { key, found, allowed } of removed) {
    console.error(`${key}: ${found} clones, baseline has ${allowed}`);
  }
}

if (added.length > 0 || removed.length > 0) process.exit(1);
console.log(
  `No new duplication: ${pairs.size} file pairs match the baseline.`,
);
