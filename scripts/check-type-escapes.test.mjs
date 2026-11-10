import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import { SKIP, classify, dropUnknownAsks, fileSites, startsFromUnknown } from "./check-type-escapes.mjs";

const ts = createRequire(import.meta.url)("typescript");

/** Whether the one cast in `code` starts from `unknown`, read by a real checker. */
function castStartsFromUnknown(code) {
  const fileName = "cast.ts";
  const options = { strict: true, noLib: true };
  const host = ts.createCompilerHost(options);
  const readSource = host.getSourceFile;
  host.getSourceFile = (name, version) =>
    name === fileName ? ts.createSourceFile(name, code, version, true) : readSource(name, version);
  const program = ts.createProgram([fileName], options, host);
  let cast;
  const visit = (node) => {
    if (classify(node) === "cast") cast = node;
    ts.forEachChild(node, visit);
  };
  visit(program.getSourceFile(fileName));
  return startsFromUnknown(cast, program.getTypeChecker());
}

const declarations = "type Meta = { schema?: string }; declare const raw: unknown; declare const known: Meta | undefined;";

test("a cast straight from unknown is caught", () => {
  assert.equal(castStartsFromUnknown(`${declarations} const meta = raw as Meta;`), true);
});

test("a fallback hides nothing: the checker reads `raw ?? {}` as `{}`, but the value is still unknown", () => {
  assert.equal(castStartsFromUnknown(`${declarations} const meta = (raw ?? {}) as Meta;`), true);
  assert.equal(castStartsFromUnknown(`${declarations} const meta = (raw || {}) as Meta;`), true);
});

test("a fallback on a typed value passes", () => {
  assert.equal(castStartsFromUnknown(`${declarations} const meta = (known ?? {}) as Meta;`), false);
});

/** The `loose-bound` sites in one file's text. */
const bounds = (file, text) => fileSites(file, text).filter((site) => site.kind === "loose-bound");

test("a LooseRecord bound is counted", () => {
  assert.deepEqual(
    bounds("field.ts", "export function Field<TRecord extends LooseRecord>(record: TRecord): TRecord {\n  return record;\n}\n"),
    [{ line: 1, kind: "loose-bound" }],
  );
});

test("a LooseRecord default is not counted", () => {
  assert.deepEqual(bounds("types.ts", "export interface List<TRecord = LooseRecord> { data: TRecord[] }\n"), []);
  assert.deepEqual(
    bounds("ops.ts", "export function patch<TRecord extends ResourceRecord = LooseRecord>(row: TRecord): TRecord {\n  return row;\n}\n"),
    [],
  );
  assert.deepEqual(bounds("chart.vue", '<script setup lang="ts" generic="TRow extends object = LooseRecord">\n</script>\n'), []);
});

test("a bound in a Vue generic attribute is counted", () => {
  assert.deepEqual(
    bounds(
      "board.vue",
      '<script lang="ts" generic="TRecord extends LooseRecord = LooseRecord">\nimport type { LooseRecord } from "@chelone/core";\n</script>\n',
    ),
    [{ line: 1, kind: "loose-bound" }],
  );
  assert.deepEqual(
    bounds("lazy.vue", '<script setup lang="ts"\n  generic="RecordType extends LooseRecord"\n>\n</script>\n'),
    [{ line: 2, kind: "loose-bound" }],
  );
});

test("only the opening tag's generic attribute is read", () => {
  assert.deepEqual(bounds("quoted.vue", "<script setup lang=\"ts\">\nconst s = 'generic=\"T extends LooseRecord\"';\n</script>\n"), []);
  assert.deepEqual(bounds("data.vue", '<script setup lang="ts" data-generic="T extends LooseRecord">\n</script>\n'), []);
  assert.deepEqual(
    bounds("nested.vue", '<script setup lang="ts" generic="T extends Array<LooseRecord>, U extends LooseRecord">\n</script>\n'),
    [{ line: 1, kind: "loose-bound" }],
  );
});

test("a comment does not excuse a bound", () => {
  assert.deepEqual(
    bounds(
      "field.ts",
      "// type-escape: the app names no record\nexport function Field<TRecord extends LooseRecord>(record: TRecord): TRecord {\n  return record;\n}\n",
    ),
    [{ line: 2, kind: "loose-bound" }],
  );
});

/** The form layer's label complaints in one file's text. */
const asks = (file, text) => fileSites(file, text).filter((site) => site.kind === "unlabelled");

const cast = "export const value = record as Post;\n";

test("a labelled comment passes in the form layer", () => {
  assert.deepEqual(fileSites("packages/core/src/form/form-handle.ts", `// type-escape: context: the ambient form names no record\n${cast}`), []);
});

test("a comment with no label fails in the form layer", () => {
  assert.deepEqual(asks("packages/core/src/form/form-handle.ts", `// type-escape: the ambient form names no record\n${cast}`), [
    { line: 1, kind: "unlabelled", at: "comment" },
  ]);
});

test("a comment with an unknown label fails", () => {
  assert.deepEqual(asks("packages/vue/src/form/use-form.ts", `// type-escape: database: a row read from any table\n${cast}`), [
    { line: 1, kind: "unlabelled", at: "comment" },
  ]);
});

test("an escape with no comment fails in the form layer, whatever main holds", () => {
  // `fileSites` is handed no base: the label rule is absolute, so the count comparison cannot stand in for it.
  assert.deepEqual(fileSites("packages/react/src/form/filter-live-form.tsx", cast), [
    { line: 1, kind: "cast" },
    { line: 1, kind: "unlabelled", at: "cast" },
  ]);
});

test("outside the form layer a plain type-escape comment still passes", () => {
  assert.deepEqual(fileSites("packages/react/src/components/rsc/read-field-value.ts", `// type-escape: a context cannot carry the record type\n${cast}`), []);
});

test("a test file in the form layer needs no label", () => {
  assert.deepEqual(fileSites("packages/core/src/form/form-handle.test.ts", cast), [{ line: 1, kind: "cast" }]);
});

test("a cast from unknown is not asked for a label", () => {
  // The syntactic half: a cast to a function taking `unknown`, counted comment or not.
  const sites = fileSites(
    "packages/core/src/form/input-binding.ts",
    "// type-escape: server: an app's opaque bag of any values.\nexport const text = (format as (value: unknown) => string)(raw);\n",
  );
  assert.deepEqual(sites.filter((site) => site.kind === "unknown-cast"), [{ line: 2, kind: "unknown-cast" }]);
  assert.deepEqual(sites.filter((site) => site.kind === "unlabelled"), []);
  // The checker's half: a cast whose operand it reads as `unknown`.
  const file = "packages/core/src/form/json-text.ts";
  assert.deepEqual(dropUnknownAsks([{ file, line: 4, kind: "unlabelled", at: "cast" }], [{ file, line: 4, kind: "unknown-cast" }]), []);
});

test("an honest unknown needs no comment", () => {
  const text =
    "export function isPost(value: unknown): value is Post {\n  return typeof value === 'object';\n}\nexport function text(error: unknown): string {\n  return String(error);\n}\n";
  assert.deepEqual(fileSites("packages/core/src/form/field-error.ts", text), []);
});

test("a generated route tree is skipped, and a hand-written file next to it is not", () => {
  assert.equal(SKIP.test("apps/start-demo/src/routeTree.gen.ts"), true);
  assert.equal(SKIP.test("src/routeTree.gen.tsx"), true);
  assert.equal(SKIP.test("apps/start-demo/src/router.tsx"), false);
  assert.equal(SKIP.test("apps/start-demo/src/routes/routeTree.gen_backup.ts"), false);
});
