// Holds every component to its entry in showcase.json: a docs page and a place in each demo.
// The entry names the page and what must be visible on it, so CI can photograph both.
//
//   pnpm check:showcase                  compare with origin/main
//   pnpm check:showcase --base HEAD^1    compare with another commit
//
// `null` is an entry still owed. Only components that predate the rule may hold one.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The docs site cannot render a Vue demo yet, so `vue` owes no docs page until it can.
const REQUIRED = { react: ["docs", "demo"], vue: ["demo"] };
const VIEWS = ["docs", "demo"];
const REGISTERED = ["registry:component", "registry:block"];
const RENDERS = /\.(tsx|vue)$/;

export function readBase(args) {
  const flag = args.indexOf("--base");
  return flag === -1 ? "origin/main" : args[flag + 1];
}

// Each adapter's registry items that render something, as name -> repo-relative paths.
export function componentsIn(registry, adapter) {
  return new Map(
    registry.items
      .filter((item) => REGISTERED.includes(item.type))
      .map((item) => [item.name, item.files.map((file) => `packages/${adapter}/${file.path}`)])
      .filter(([, files]) => files.some((file) => RENDERS.test(file))),
  );
}

export function loadComponents() {
  return Object.fromEntries(
    Object.keys(REQUIRED).map((adapter) => {
      const file = path.join(root, "packages", adapter, "registry.json");
      return [adapter, componentsIn(JSON.parse(readFileSync(file, "utf8")), adapter)];
    }),
  );
}

export function loadManifest() {
  return JSON.parse(readFileSync(path.join(root, "showcase.json"), "utf8"));
}

// showcase.json on `base`, or null on a commit from before it existed.
export function loadPrevious(base) {
  try {
    const text = execFileSync("git", ["show", `${base}:showcase.json`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function docsPageHasDemo(page) {
  const folder = path.join(root, "apps/website/src/docs/content", page.replace(/^\/docs\//, ""));
  const demos = path.join(folder, "demos");
  return existsSync(demos) && readdirSync(demos).length > 0;
}

// The entry that shows `name`, following `shownBy` to the component that renders it.
export function owner(manifest, name) {
  const seen = new Set();
  let current = name;
  while (manifest[current]?.shownBy) {
    if (seen.has(current)) return null;
    seen.add(current);
    current = manifest[current].shownBy;
  }
  return current;
}

function shotProblems(name, adapter, view, shot, hasDemo) {
  const where = `${name}: ${adapter}.${view}`;
  if (!shot.path?.startsWith("/")) return [`${where} needs a path starting with /`];
  if (!shot.see) return [`${where} needs \`see\`: a Playwright selector for the component`];
  if (view === "docs" && adapter === "react" && !hasDemo(shot.path)) {
    return [`${where}: ${shot.path} has no demo in its demos folder`];
  }
  return [];
}

function entryProblems(name, entry, components, hasDemo) {
  return Object.keys(REQUIRED).flatMap((adapter) => {
    if (!components[adapter].has(name)) return [];
    return VIEWS.flatMap((view) => {
      const shot = entry[adapter]?.[view];
      if (shot) return shotProblems(name, adapter, view, shot, hasDemo);
      return REQUIRED[adapter].includes(view) ? [`${name}: ${adapter}.${view} is missing`] : [];
    });
  });
}

export function problems({ manifest, previous, components, hasDemo }) {
  const registered = new Set(Object.values(components).flatMap((names) => [...names.keys()]));
  const unlisted = [...registered]
    .filter((name) => !(name in manifest))
    .map((name) => `${name} has no entry in showcase.json`);
  const listed = Object.entries(manifest).flatMap(([name, entry]) => {
    if (!registered.has(name)) return [`${name} is in showcase.json but in no registry`];
    if (entry === null) {
      const owedBefore = previous === null || previous[name] === null;
      return owedBefore ? [] : [`${name} is null, which only a component older than the rule may be`];
    }
    if (entry.shownBy) {
      const shownBy = owner(manifest, name);
      if (shownBy === null) return [`${name}: its shownBy chain loops`];
      return shownBy in manifest ? [] : [`${name}: shownBy names ${shownBy}, which has no entry`];
    }
    return entryProblems(name, entry, components, hasDemo);
  });
  return [...unlisted, ...listed];
}

// What a change has to photograph: each component it touched or whose entry it edited.
export function targets({ manifest, previous, components, changedFiles }) {
  const changed = new Set(changedFiles);
  const touched = Object.entries(components).flatMap(([adapter, names]) =>
    [...names]
      .filter(([, files]) => files.some((file) => changed.has(file)))
      .map(([name]) => ({ adapter, name: owner(manifest, name) ?? name })),
  );
  const edited = Object.keys(manifest)
    .filter((name) => JSON.stringify(manifest[name]) !== JSON.stringify(previous?.[name] ?? null))
    .flatMap((name) =>
      Object.keys(components)
        .filter((adapter) => components[adapter].has(name))
        .map((adapter) => ({ adapter, name: owner(manifest, name) ?? name })),
    );
  const unique = [...new Map([...touched, ...edited].map((t) => [`${t.name}/${t.adapter}`, t])).values()];
  return {
    owed: [...new Set(unique.filter((t) => !manifest[t.name]).map((t) => t.name))].sort(),
    shots: unique
      .filter((t) => manifest[t.name])
      .flatMap(({ name, adapter }) =>
        VIEWS.filter((view) => manifest[name][adapter]?.[view]).map((view) => ({
          name,
          adapter,
          view,
          ...manifest[name][adapter][view],
        })),
      )
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function main() {
  const base = readBase(process.argv);
  const found = problems({
    manifest: loadManifest(),
    previous: loadPrevious(base),
    components: loadComponents(),
    hasDemo: docsPageHasDemo,
  });
  for (const problem of found) console.error(problem);
  if (found.length > 0) {
    console.error(`\n${found.length} showcase problem(s). The showcase rule is in CLAUDE.md.`);
    process.exit(1);
  }
  console.log("Every component has its showcase entry.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
