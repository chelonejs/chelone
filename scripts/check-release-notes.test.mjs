import assert from "node:assert/strict";
import { test } from "node:test";

import { findTagLikeText } from "./check-release-notes.mjs";

const section = (line) =>
  `<details><summary>@chelone/core: 0.8.0</summary>\n\n## 0.8.0\n\n* ${line}\n</details>\n`;

test("release-please's own details and summary tags pass", () => {
  assert.deepEqual(findTagLikeText(section("a plain subject")), []);
});

test("a tag inside backticks is caught, since the parser ignores markdown", () => {
  assert.deepEqual(findTagLikeText(section("`FieldBinding<unknown>` is unchanged")), [
    { line: 5, text: "* `FieldBinding<unknown>` is unchanged" },
  ]);
});

test("an escaped tag is caught, since the parser decodes it on its second pass", () => {
  assert.equal(findTagLikeText(section("&lt;CanAccess&gt; takes a record")).length, 1);
});

test("an unclosed tag is caught, since the parser finds its end on a later line", () => {
  assert.equal(findTagLikeText(section("a <b and more")).length, 1);
});

test("comparisons and arrows pass", () => {
  assert.deepEqual(findTagLikeText(section("`a < b` and `a => b`")), []);
});
