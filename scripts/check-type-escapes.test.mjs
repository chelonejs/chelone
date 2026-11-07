import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import { classify, startsFromUnknown } from "./check-type-escapes.mjs";

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
