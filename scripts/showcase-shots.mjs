// Photographs the docs page and demo of each component a change touched, and writes the pull
// request body's section beside the images. Run it after `pnpm build`.
//
//   node scripts/showcase-shots.mjs --base HEAD^1           shoot into .showcase-shots
//   node scripts/showcase-shots.mjs --base HEAD^1 --count   print how many shots that takes
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadComponents, loadManifest, loadPrevious, readBase, root, targets } from "./showcase.mjs";

const OUT = path.join(root, ".showcase-shots");
const PORT = 4374;
const VIEWPORT = { width: 1280, height: 800 };
const VISIBLE_WITHIN_MS = 20_000;
const PAGES_AT_ONCE = 4;

export const MARKER = "<!-- showcase-shots -->";

export const fileName = ({ name, adapter, view }) => `${name}-${adapter}-${view}.png`;

// `{{shots}}` is the image folder's URL, which the job that publishes the images fills in.
export function section({ results, owed }) {
  const cell = (shot) =>
    shot ? (shot.error ? `failed: \`${shot.error}\`` : `![${shot.view}]({{shots}}/${fileName(shot)})`) : "";
  const rows = [...new Set(results.map((r) => `${r.name}/${r.adapter}`))].map((key) => {
    const [name, adapter] = key.split("/");
    const find = (view) => results.find((r) => r.name === name && r.adapter === adapter && r.view === view);
    return `| \`${name}\` | ${adapter} | ${cell(find("docs"))} | ${cell(find("demo"))} |`;
  });
  return [
    MARKER,
    "## Showcase",
    ...(rows.length > 0 ? [["| Component | Adapter | Docs page | Demo |", "| --- | --- | --- | --- |", ...rows].join("\n")] : []),
    ...(owed.length > 0 ? [`Not in the showcase yet: ${owed.map((name) => `\`${name}\``).join(", ")}`] : []),
  ].join("\n\n");
}

function changedFiles(base) {
  return execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

function serve() {
  const server = spawn("node", ["apps/website/scripts/preview-static.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "inherit"],
  });
  return new Promise((resolve, reject) => {
    server.once("exit", (code) => reject(new Error(`preview-static exited with ${code}`)));
    server.stdout.once("data", () => resolve(server));
  });
}

// The component a shot photographs. A docs page shows its Vue demo inside an iframe of
// the Vue demo app, so the selector sits in that frame; a docs page's own heading sits
// on the page. Whichever answers first wins.
const VUE_DEMO_FRAME = "iframe[title^='Vue demo']";

// A `see` scoped to `.not-prose` is scoped to the docs page's own content area, so it
// can never match inside the Vue demo frame, whose document has no `.not-prose`. The
// frame looks for the same selector with that scope dropped.
export function frameSee(see) {
  return see.replace(/^\.not-prose(?:\s*>>\s*|\s+)/, "");
}

async function component(page, shot) {
  const roots = [page.locator(shot.see).first()];
  if (shot.adapter === "vue" && shot.view === "docs") {
    const frame = page.locator(VUE_DEMO_FRAME).first().contentFrame();
    roots.push(frame.locator(frameSee(shot.see)).first());
  }
  const visible = roots.map(async (root) => {
    await root.waitFor({ state: "visible", timeout: VISIBLE_WITHIN_MS });
    return root;
  });
  try {
    return await Promise.any(visible);
  } catch (error) {
    // Report the selector that never appeared, not the frame it was looked for in.
    throw error instanceof AggregateError ? error.errors[0] : error;
  }
}

async function shoot(browser, shot) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    await page.goto(`http://localhost:${PORT}${shot.path}`);
    for (const selector of shot.click ?? []) {
      await page.locator(selector).first().click({ timeout: VISIBLE_WITHIN_MS });
    }
    const target = await component(page, shot);
    await target.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, fileName(shot)) });
    return shot;
  } catch (error) {
    return { ...shot, error: `${shot.path}: ${error.message.split("\n")[0]}` };
  } finally {
    await page.close();
  }
}

async function main() {
  const base = readBase(process.argv);
  const { shots, owed } = targets({
    manifest: loadManifest(),
    previous: loadPrevious(base),
    components: loadComponents(),
    changedFiles: changedFiles(base),
  });
  if (process.argv.includes("--count")) {
    console.log(shots.length);
    return;
  }
  rmSync(OUT, { recursive: true, force: true });
  if (shots.length === 0 && owed.length === 0) return;
  mkdirSync(OUT);

  const results = [];
  if (shots.length > 0) {
    const { chromium } = await import("playwright");
    const server = await serve();
    const browser = await chromium.launch();
    const next = shots.entries();
    const photograph = async () => {
      for (const [index, shot] of next) results[index] = await shoot(browser, shot);
    };
    await Promise.all(Array.from({ length: PAGES_AT_ONCE }, photograph));
    await browser.close();
    server.removeAllListeners("exit");
    server.kill();
  }
  writeFileSync(path.join(OUT, "section.md"), section({ results, owed }));

  const failed = results.filter((result) => result.error);
  for (const { name, adapter, view, error } of failed) console.error(`${name} ${adapter}.${view}: ${error}`);
  if (failed.length > 0) process.exit(1);
  console.log(`${results.length} shot(s), ${owed.length} component(s) not in the showcase yet.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
