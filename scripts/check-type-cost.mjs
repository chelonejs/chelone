// Fails when a package costs the compiler more than type-cost-budget.json allows. It reads
// Instantiations and Types from `--extendedDiagnostics`: those two do not move between runs,
// where the times do, so a type that balloons fails here and not in every consumer's editor.
//
//   pnpm check:type-cost            compare with type-cost-budget.json
//   pnpm check:type-cost --update   rewrite the budget from the current tree, plus headroom
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const budgetPath = path.join(root, "type-cost-budget.json");

const PACKAGES = ["core", "utils", "rest", "supabase", "react", "vue"];
const COUNTERS = ["Instantiations", "Types"];
const HEADROOM = 1.1;

export function readCounters(output) {
  return Object.fromEntries(
    COUNTERS.map((counter) => {
      const match = new RegExp(`^${counter}:\\s+(\\d+)`, "m").exec(output);
      if (!match) throw new Error(`No ${counter} in the compiler's output:\n${output}`);
      return [counter, Number(match[1])];
    }),
  );
}

export function overBudget(counts, budget) {
  return Object.entries(counts).flatMap(([name, perCounter]) =>
    COUNTERS.flatMap((counter) => {
      const allowed = budget[name]?.[counter] ?? 0;
      const count = perCounter[counter];
      return count > allowed ? [{ name, counter, count, allowed }] : [];
    }),
  );
}

export function budgetFrom(counts) {
  const withHeadroom = (count) => Math.ceil((count * HEADROOM) / 1000) * 1000;
  return Object.fromEntries(
    Object.entries(counts).map(([name, perCounter]) => [
      name,
      Object.fromEntries(COUNTERS.map((counter) => [counter, withHeadroom(perCounter[counter])])),
    ]),
  );
}

function measure(name) {
  const compiler = name === "vue" ? "packages/vue/node_modules/.bin/vue-tsc" : "node_modules/.bin/tsc";
  const run = spawnSync(path.join(root, compiler), ["--noEmit", "--extendedDiagnostics", "--incremental", "false"], {
    cwd: path.join(root, "packages", name),
    encoding: "utf8",
  });
  if (run.error) throw run.error;
  return readCounters(run.stdout);
}

function main() {
  const counts = Object.fromEntries(PACKAGES.map((name) => [name, measure(name)]));
  if (process.argv.includes("--update")) {
    writeFileSync(budgetPath, `${JSON.stringify(budgetFrom(counts), null, 2)}\n`);
    console.log("Wrote type-cost-budget.json.");
    return;
  }
  const over = overBudget(counts, JSON.parse(readFileSync(budgetPath, "utf8")));
  if (over.length > 0) {
    console.error(
      "Over the type cost budget. `tsc --generateTrace <dir>` in the package shows where it went (its own numbers run high). If the change needs the cost, run `pnpm check:type-cost --update` and say why in the pull request.\n",
    );
    for (const { name, counter, count, allowed } of over) console.error(`${name}: ${count} ${counter}, budget ${allowed}`);
    process.exit(1);
  }
  console.log(`Within the type cost budget: ${PACKAGES.length} packages.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
