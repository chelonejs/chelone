// A deployed demo must answer its own deep links: Cloudflare Pages serves the
// `404.html` nearest the requested path, so `/demo/posts` needs `demo/404.html`
// or it lands on the docs site's shell instead of the demo's.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";

import { DEMOS, copyDemoBuild } from "./copy-demo.mjs";

/** A stand-in for one demo's vite output: an index.html plus a hashed asset. */
const fixtureDist = (dir) => {
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "index.html"), '<!doctype html><html><body><div id="root"></div></body></html>\n');
  writeFileSync(join(dir, "assets", "app.js"), "console.log('demo');\n");
  return dir;
};

describe("DEMOS", () => {
  it("covers the React and Vue demos", () => {
    assert.deepEqual(
      DEMOS.map(({ app, name }) => [app, name]),
      [
        ["demo", "@chelone/demo"],
        ["vue-demo", "@chelone/vue-demo"],
      ],
    );
  });
});

describe("copyDemoBuild", () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  const run = () => {
    dir = mkdtempSync(join(tmpdir(), "copy-demo-"));
    const dist = fixtureDist(join(dir, "dist"));
    const dest = join(dir, "build/client/demo");
    copyDemoBuild({ dist, dest });
    return { dist, dest };
  };

  it("gives each demo folder a 404.html matching its index.html", () => {
    const { dest } = run();
    const index = readFileSync(join(dest, "index.html"), "utf8");
    const fallback = readFileSync(join(dest, "404.html"), "utf8");
    assert.equal(fallback, index);
    // The shell points at the demo's own assets, so the copy answers a deep link
    // with the demo and not with the docs site.
    assert.ok(existsSync(join(dest, "assets", "app.js")));
  });

  it("leaves no file from a prior build behind", () => {
    const { dist, dest } = run();
    writeFileSync(join(dest, "stale.js"), "left by the previous build\n");
    copyDemoBuild({ dist, dest });
    assert.equal(existsSync(join(dest, "stale.js")), false);
    assert.equal(readFileSync(join(dest, "404.html"), "utf8"), readFileSync(join(dest, "index.html"), "utf8"));
  });

  it("fails loudly when the build emitted no index.html", () => {
    dir = mkdtempSync(join(tmpdir(), "copy-demo-"));
    const dist = join(dir, "dist");
    mkdirSync(dist, { recursive: true });
    assert.throws(() => copyDemoBuild({ dist, dest: join(dir, "build/client/demo") }), /index\.html/);
  });

  it("fails loudly when the demo was never built", () => {
    dir = mkdtempSync(join(tmpdir(), "copy-demo-"));
    assert.throws(
      () => copyDemoBuild({ dist: resolve(dir, "nowhere"), dest: join(dir, "build/client/demo") }),
      /no demo build/,
    );
  });
});
