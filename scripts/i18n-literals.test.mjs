// Three checks over every production file under `packages/*/src`.
//
// Percent placeholders. Core interpolates `{name}` only, so react-admin's
// `%{name}` keeps its percent sign on screen: `Run %delete_post?`,
// `Invalid JSON: %Unexpected token`. The check fails on a `%{word}` that sits
// in code rather than in a comment, so a comment that names react-admin's
// syntax stays legal while a fallback that copies it does not.
//
// Catalog coverage. A key written as a plain string literal must be in a
// catalog, or a translator cannot list it and the two adapters can word it
// differently. Keys built from a template string (`chelone.action.${action}`) are
// not checked: only part of them is a key.
//
// The `ra.*` namespace. Every key lives under `chelone.*` (#1773), so a file
// that still names an `ra.*` key fails the last check.

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** `%{word}`: the placeholder core's `interpolate` never touches. */
const percentPlaceholder = /%\{\w+\}/g;

const sourceExtensions = new Set([".ts", ".tsx", ".vue"]);
/** Test files may quote react-admin's own catalogs to prove core leaves them alone. */
const testFile = /\.(test|test-d)\.[cm]?[jt]sx?$/;

/** Index just past the string literal that starts at `start`. */
function endOfString(text, start) {
  const quote = text[start];
  for (let i = start + 1; i < text.length; ) {
    const char = text[i];
    if (char === "\\") {
      i += 2;
      continue;
    }
    // A template literal's interpolation holds code, which can hold strings.
    if (quote === "`" && char === "$" && text[i + 1] === "{") {
      i = endOfBrace(text, i + 1);
      continue;
    }
    if (char === quote) return i + 1;
    i += 1;
  }
  return text.length;
}

/** Index just past the `{` at `start`, reading nested strings and braces. */
function endOfBrace(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' || char === "'" || char === "`") {
      i = endOfString(text, i) - 1;
    } else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return text.length;
}

/** Whether a value can start at `i`: the character before it ends a token. */
function afterBreak(text, i) {
  return i === 0 || !/[\w$]/.test(text[i - 1]);
}

/** Whether a line comment can start at `i`: markup text like `https://x` is not one. */
function afterSpace(text, i) {
  return i === 0 || /\s/.test(text[i - 1]);
}

/**
 * `[start, end)` for every comment in `text`. Strings are read first, so a `//`
 * inside one is no comment. A `//` starts a comment only where a value could
 * start, and a quote opens a string only there too, so markup text keeps its
 * own reading: a URL is no comment and `Don't` is no string. `htmlComments`
 * covers a `.vue` template's `<!-- -->`.
 */
export function commentRanges(text, { htmlComments = false } = {}) {
  const ranges = [];
  for (let i = 0; i < text.length; ) {
    const char = text[i];
    const next = text[i + 1];
    if (char === "/" && next === "/" && afterSpace(text, i)) {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? text.length : end;
      ranges.push([i, stop]);
      i = stop;
    } else if (char === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      ranges.push([i, stop]);
      i = stop;
    } else if (htmlComments && text.startsWith("<!--", i)) {
      const end = text.indexOf("-->", i + 4);
      const stop = end === -1 ? text.length : end + 3;
      ranges.push([i, stop]);
      i = stop;
    } else if (char === "`" || ((char === '"' || char === "'") && afterBreak(text, i))) {
      i = endOfString(text, i);
    } else {
      i += 1;
    }
  }
  return ranges;
}

/** Every line in `text` with a `%{word}` outside a comment, as `{ line, text }`. */
export function percentPlaceholders(text, { htmlComments = false } = {}) {
  const comments = commentRanges(text, { htmlComments });
  const found = [];
  for (const match of text.matchAll(percentPlaceholder)) {
    const at = match.index;
    if (comments.some(([start, end]) => at >= start && at < end)) continue;
    const line = text.slice(0, at).split("\n").length;
    if (found.some((hit) => hit.line === line)) continue;
    const startOfLine = text.lastIndexOf("\n", at - 1) + 1;
    const endOfLine = text.indexOf("\n", at);
    found.push({
      line,
      text: text
        .slice(startOfLine, endOfLine === -1 ? text.length : endOfLine)
        .trim(),
    });
  }
  return found;
}

/**
 * A translation key written as a whole `'…'` or `"…"` literal. The `ra`
 * alternative is kept on purpose: no catalog defines an `ra.*` key any more, so
 * one left behind by the rename is caught as a key no catalog holds.
 */
const literalKey = /(["'])((?:ra|chelone)(?:\.[A-Za-z0-9_]+)+)\1/g;

/** The same shape where it is a catalog entry: the key is followed by a `:`. */
const catalogEntry = /(["'])((?:ra|chelone)(?:\.[A-Za-z0-9_]+)+)\1(?=\s*:)/g;

/**
 * `chelone.*` literals that name no translation key: `chelone.sort.sort_by` is
 * the key a caller's own label is looked up under (`<SortButton label>`), so a
 * catalog entry would shadow it, and `chelone.inspector.position` is a store key
 * that only borrows the prefix.
 */
const notTranslationKeys = new Set([
  "chelone.inspector.position",
  "chelone.sort.sort_by",
]);

/**
 * Every `chelone.*` key `text` passes as a quoted literal, outside a
 * comment. A backtick is left out on purpose: a template string is either a
 * built key or a sentence, and neither is a literal key.
 */
export function literalTranslationKeys(text, { htmlComments = false } = {}) {
  const comments = commentRanges(text, { htmlComments });
  const keys = new Set();
  for (const match of text.matchAll(literalKey)) {
    const at = match.index;
    if (comments.some(([start, end]) => at >= start && at < end)) continue;
    if (!afterBreak(text, at)) continue;
    keys.add(match[2]);
  }
  return keys;
}

/** Every key `text` defines: a catalog key is the one followed by a `:`. */
function catalogKeys(text) {
  if (!text.includes("defineMessages(")) return [];
  return [...text.matchAll(catalogEntry)].map((match) => match[2]);
}

/**
 * Production `.ts`, `.tsx` and `.vue` files under `dir`: test files and the
 * test-only `__fixtures__` folders are left out, so a test can quote
 * react-admin's own catalog to prove core leaves it alone.
 */
async function productionFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__fixtures__") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await productionFiles(path)));
      continue;
    }
    if (!sourceExtensions.has(extname(entry.name))) continue;
    if (testFile.test(entry.name)) continue;
    files.push(path);
  }
  return files;
}

// Every `packages/<name>/src` folder that exists.
async function packageSources() {
  const sources = [];
  const packages = join(repoRoot, "packages");
  for (const entry of await readdir(packages, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const src = join(packages, entry.name, "src");
    try {
      await readdir(src);
    } catch {
      continue;
    }
    sources.push(src);
  }
  return sources;
}

describe("percentPlaceholders", () => {
  it("catches a percent placeholder in a string", () => {
    assert.deepEqual(percentPlaceholders('const title = "Run %{name}?";'), [
      { line: 1, text: 'const title = "Run %{name}?";' },
    ]);
  });

  it("catches one in a template literal and in its interpolation", () => {
    assert.deepEqual(
      percentPlaceholders("const a = `Run %{name}?`;\nconst b = `${x ?? \"%{id}\"}`;"),
      [
        { line: 1, text: "const a = `Run %{name}?`;" },
        { line: 2, text: 'const b = `${x ?? "%{id}"}`;' },
      ],
    );
  });

  it("leaves a comment that names react-admin's syntax alone", () => {
    assert.deepEqual(
      percentPlaceholders(
        "// Interpolation is single-brace `{name}` (not react-admin's `%{name}`).\n/* %{provider} written {provider}. */\nconst ok = \"Run {name}?\";\n",
      ),
      [],
    );
  });

  it("reads a string after a URL, whose // is no comment", () => {
    assert.deepEqual(percentPlaceholders('const a = "https://example.com/x";\nconst b = "Delete %{name}";'), [
      { line: 2, text: 'const b = "Delete %{name}";' },
    ]);
  });

  it("reads a Vue template's text and attributes, and skips its comments", () => {
    assert.deepEqual(
      percentPlaceholders(
        '<template>\n  <!-- %{name} is react-admin\'s form -->\n  <p>Run %{name}?</p>\n  <span :title="\'Delete %{name}\'" />\n</template>\n',
        { htmlComments: true },
      ),
      [
        { line: 3, text: "<p>Run %{name}?</p>" },
        { line: 4, text: `<span :title="'Delete %{name}'" />` },
      ],
    );
  });

  it("reads markup text after a URL, whose // is no comment there", () => {
    assert.deepEqual(
      percentPlaceholders(
        '<template>\n  <p>See https://example.com, then run %{name}</p>\n</template>\n',
        { htmlComments: true },
      ),
      [{ line: 2, text: "<p>See https://example.com, then run %{name}</p>" }],
    );
  });

  it("reads a template apostrophe as text, not as the start of a string", () => {
    assert.deepEqual(
      percentPlaceholders("<template>\n  <p>Don't run %{name}?</p>\n</template>\n", {
        htmlComments: true,
      }),
      [{ line: 2, text: "<p>Don't run %{name}?</p>" }],
    );
  });

  it("does not let a template apostrophe swallow the comments after it", () => {
    assert.deepEqual(
      percentPlaceholders(
        "<template>\n  <p>Don't run it</p>\n  <!-- react-admin writes %{name} -->\n</template>\n",
        { htmlComments: true },
      ),
      [],
    );
  });

  it("leaves a line comment in a Vue script alone", () => {
    assert.deepEqual(
      percentPlaceholders(
        '<script setup lang="ts">\n// react-admin writes %{name}\nconst ok = "Run {name}?";\n</script>\n',
        { htmlComments: true },
      ),
      [],
    );
  });
});

describe("literalTranslationKeys", () => {
  it("catches a key passed to translate, in single or double quotes", () => {
    assert.deepEqual(
      [
        ...literalTranslationKeys(
          'translate("chelone.comments.empty", { _: "No comments yet" })\ntranslate(\'chelone.action.delete\', { _: "Delete" })',
        ),
      ],
      ["chelone.comments.empty", "chelone.action.delete"],
    );
  });

  it("catches a key inside a Vue attribute, and skips a commented one", () => {
    assert.deepEqual(
      [
        ...literalTranslationKeys(
          '<template>\n  <!-- chelone.comments.post is the label -->\n  <Textarea :placeholder="translate(\'chelone.comments.placeholder\', { _: \'Write a comment\' })" />\n</template>\n',
          { htmlComments: true },
        ),
      ],
      ["chelone.comments.placeholder"],
    );
  });

  it("leaves a built key and a word that only looks like one alone", () => {
    assert.deepEqual(
      [
        ...literalTranslationKeys(
          'translate(`chelone.action.${action}`, { _: action })\nconst path = "packages/core/src/i18n.ts"',
        ),
      ],
      [],
    );
  });
});

describe("production code", () => {
  it("no string in production code uses a percent placeholder", async () => {
    const problems = [];
    for (const src of await packageSources()) {
      for (const file of await productionFiles(src)) {
        const text = await readFile(file, "utf8");
        for (const hit of percentPlaceholders(text, {
          htmlComments: extname(file) === ".vue",
        })) {
          problems.push(`${relative(repoRoot, file)}:${hit.line}: ${hit.text}`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  it("every literal translation key is in the catalog", async () => {
    const catalog = new Set();
    for (const src of await packageSources()) {
      for (const file of await productionFiles(src)) {
        for (const key of catalogKeys(await readFile(file, "utf8"))) {
          catalog.add(key);
        }
      }
    }

    const missing = [];
    for (const src of await packageSources()) {
      for (const file of await productionFiles(src)) {
        const text = await readFile(file, "utf8");
        for (const key of literalTranslationKeys(text, {
          htmlComments: extname(file) === ".vue",
        })) {
          if (catalog.has(key) || notTranslationKeys.has(key)) continue;
          missing.push(`${relative(repoRoot, file)}: ${key}`);
        }
      }
    }
    assert.deepEqual(missing.sort(), []);
  });

  it("no production file names an ra.* key", async () => {
    const left = [];
    for (const src of await packageSources()) {
      for (const file of await productionFiles(src)) {
        const text = await readFile(file, "utf8");
        for (const [, key] of text.matchAll(/\bra\.[A-Za-z_][A-Za-z0-9_.]*/g)) {
          left.push(`${relative(repoRoot, file)}: ${key}`);
        }
      }
    }
    assert.deepEqual(left.sort(), []);
  });
});
