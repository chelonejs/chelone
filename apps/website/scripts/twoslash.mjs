import path from "node:path";
import { fileURLToPath } from "node:url";
import { rendererRich, transformerTwoslash } from "@shikijs/twoslash";
import { createTwoslasher } from "twoslash";
import { createTwoslasher as createVueTwoslasher } from "twoslash-vue";
import ts from "typescript";
import { visit } from "unist-util-visit";

const websiteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsconfigPath = path.join(websiteDir, "tsconfig.app.json");

/**
 * Twoslash for the docs' code fences: a snippet is type-checked at build time,
 * so it can show an inferred type or a rejected typo, and it fails the build
 * when the types it cites move.
 *
 * A fence runs only when its meta says `twoslash`, so every page written today
 * renders exactly as it does now. `ts` and `tsx` run plain twoslash; `vue` runs
 * twoslash-vue, which checks a template and its script together.
 *
 * Two exports, one twoslasher behind both, so each snippet is type-checked once:
 *
 * - `remarkTwoslash` runs the snippets and throws. It has to happen before
 *   rehype-pretty-code highlights them: that plugin catches whatever a
 *   transformer throws and re-renders the fence as plaintext, so a drifted
 *   snippet would otherwise publish quietly.
 * - `twoslashTransformer` renders the run — hover popups, `// ^?` results and
 *   `// @errors` lines — through the rich renderer's markup.
 *
 * Compiler options come from `tsconfig.app.json`, so the `@/` paths inside
 * `@chelone/react` resolve here the way they do for `pnpm typecheck`.
 */

/** `ts`/`tsx` through twoslash, `vue` through twoslash-vue. */
const TWOSLASH_LANGS = ["ts", "tsx", "vue"];

/** The aliases `transformerTwoslash` applies before it filters a fence. */
const LANGUAGE_ALIASES = { typescript: "ts", json5: "json", yml: "yaml" };

const TRIGGER = /\btwoslash\b/;
const DISABLE_TRIGGERS = ["notwoslash", "no-twoslash"];

/** `// @annotate`, `// @log`, `// @warn` and `// @error` render as their own line. */
const CUSTOM_TAGS = ["annotate", "log", "warn", "error"];

/**
 * tsconfig.app.json's compiler options, so a snippet sees the same `@/` paths,
 * strictness and `jsx` as `pnpm typecheck`. `noUnusedLocals` and
 * `noUnusedParameters` are dropped: a snippet is a slice of a program, and an
 * import it never uses says nothing about the types.
 */
function snippetCompilerOptions() {
  const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (read.error) {
    throw new Error(
      `twoslash could not read ${tsconfigPath}: ${ts.flattenDiagnosticMessageText(read.error.messageText, " ")}`,
    );
  }
  const converted = ts.convertCompilerOptionsFromJson(
    read.config.compilerOptions,
    websiteDir,
    tsconfigPath,
  );
  if (converted.errors.length) {
    const messages = converted.errors
      .map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n"))
      .join("\n");
    throw new Error(`twoslash could not read ${tsconfigPath}:\n${messages}`);
  }
  const { noUnusedLocals, noUnusedParameters, composite, tsBuildInfoFile, ...options } =
    converted.options;
  return options;
}

const compilerOptions = snippetCompilerOptions();

/**
 * Options passed at run time rather than at creation: twoslash-vue reads the
 * compiler options of the run, and ignores the ones it was created with.
 */
const twoslashOptions = { compilerOptions, customTags: CUSTOM_TAGS };

// `vfsRoot` is the website folder, so tsconfig's relative `paths` land where
// `pnpm typecheck` puts them, whatever the build's cwd happens to be.
const tsTwoslasher = createTwoslasher({
  vfsRoot: websiteDir,
  tsModule: ts,
  compilerOptions,
});

const vueTwoslasher = createVueTwoslasher({
  vfsRoot: websiteDir,
  tsModule: ts,
  compilerOptions,
});

/** Each snippet's result, keyed by language + code, so the check and the render share one run. */
const runs = new Map();

/**
 * `// @errors: 2322` names the errors a snippet must raise. twoslash throws for
 * a raised error the line does not name, but says nothing when a named error
 * never happens, so the other half is checked here.
 */
function checkDeclaredErrors(result, lang, code) {
  const declared = result.meta?.handbookOptions?.errors ?? [];
  if (declared.length === 0) return result;
  const raised = new Set(
    result.nodes.filter((node) => node.type === "error").map((node) => node.code),
  );
  const neverRaised = declared.filter((code) => !raised.has(code));
  if (neverRaised.length === 0) return result;
  const found = raised.size === 0 ? "no error at all" : [...raised].map((c) => `TS${c}`).join(", ");
  throw new Error(
    `// @errors: ${declared.join(" ")} names TS${neverRaised.join("/TS")}, but the ${lang} snippet raises ${found}.\n\n${code}`,
  );
}

/** Type-check one snippet, once, and hand the same result to the renderer. */
function runTwoslasher(code, lang, options = {}) {
  const key = `${lang}\u0000${code}`;
  const cached = runs.get(key);
  if (cached) return cached;
  const twoslasher = lang === "vue" ? vueTwoslasher : tsTwoslasher;
  const result = checkDeclaredErrors(twoslasher(code, lang, options), lang, code);
  runs.set(key, result);
  return result;
}

/** Whether a fence's language and meta ask for twoslash — the same test both exports use. */
function asksForTwoslash(lang, meta) {
  const aliased = LANGUAGE_ALIASES[lang] ?? lang;
  if (!TWOSLASH_LANGS.includes(aliased)) return false;
  if (!TRIGGER.test(meta)) return false;
  return !DISABLE_TRIGGERS.some((trigger) => meta.includes(trigger));
}

/**
 * A fence the gate cannot run: `// @include:` pulls in another fence's code, and
 * only the transformer holds that map. The same shape `@shikijs/twoslash` uses to
 * name a reusable fence in its meta.
 */
const INCLUDE_META = /\binclude\s+[\w-]+\b/;
const INCLUDE_MARKER = /\/\/ @include:/;

/** Each fence the highlighter could not report, kept until its page's hast is done. */
const swallowed = [];

function pageOf(file) {
  return path.relative(path.resolve(websiteDir, "..", ".."), path.resolve(file.path));
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The build gate: run every `twoslash` fence before it is highlighted, and throw
 * with the page and the snippet named. `rehypeTwoslashAssert` covers the fences
 * this one skips.
 */
export function remarkTwoslash() {
  return (tree, file) => {
    visit(tree, "code", (node) => {
      const lang = node.lang ?? "";
      if (!asksForTwoslash(lang, node.meta ?? "")) return;
      if (INCLUDE_META.test(node.meta ?? "") || INCLUDE_MARKER.test(node.value)) return;
      try {
        runTwoslasher(node.value, LANGUAGE_ALIASES[lang] ?? lang, twoslashOptions);
      } catch (error) {
        throw new Error(`twoslash failed in ${pageOf(file)} (${lang} fence):\n${messageOf(error)}`, {
          cause: error,
        });
      }
    });
  };
}

/**
 * The rehype-pretty-code transformer: renders the fences the gate already ran.
 *
 * `onTwoslashError` is here because rehype-pretty-code wraps `codeToHtml` in a
 * try/catch and re-highlights whatever a transformer throws as plaintext. A
 * fence only the transformer can check would then ship with no types and no
 * word about it, so the failure is kept for `rehypeTwoslashAssert` to raise.
 */
export const twoslashTransformer = transformerTwoslash({
  langs: TWOSLASH_LANGS,
  explicitTrigger: true,
  twoslasher: runTwoslasher,
  twoslashOptions,
  renderer: rendererRich(),
  onTwoslashError: (error, code, lang) => {
    swallowed.push({ error, code, lang });
    return false;
  },
});

/**
 * The other half of the gate, placed after rehype-pretty-code: raise what the
 * highlighter swallowed for this page.
 */
export function rehypeTwoslashAssert() {
  return (_tree, file) => {
    const failures = swallowed.splice(0, swallowed.length);
    if (failures.length === 0) return;
    const listed = failures
      .map(({ error, code, lang }) => `${lang} fence:\n${messageOf(error)}\n\n${code}`)
      .join("\n\n");
    throw new Error(`twoslash failed in ${pageOf(file)}:\n${listed}`);
  };
}
