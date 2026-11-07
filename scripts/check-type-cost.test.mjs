import assert from "node:assert/strict";
import { test } from "node:test";

import { budgetFrom, overBudget, readCounters } from "./check-type-cost.mjs";

const diagnostics = "Files:  10\nTypes:  1200\nInstantiations:  5000\nCheck time:  1.20s\n";

test("the counters are read from tsc's diagnostics, and times are left out", () => {
  assert.deepEqual(readCounters(diagnostics), { Instantiations: 5000, Types: 1200 });
});

test("output with no counters fails loudly, since a budget that reads nothing always passes", () => {
  assert.throws(() => readCounters("error TS5083: Cannot read file"), /Instantiations/);
});

test("a count at its budget passes", () => {
  const counts = { core: { Instantiations: 5000, Types: 1200 } };
  assert.deepEqual(overBudget(counts, { core: { Instantiations: 5000, Types: 1200 } }), []);
});

test("each counter over its budget is named", () => {
  const counts = { core: { Instantiations: 5001, Types: 1200 } };
  assert.deepEqual(overBudget(counts, { core: { Instantiations: 5000, Types: 1200 } }), [
    { name: "core", counter: "Instantiations", count: 5001, allowed: 5000 },
  ]);
});

test("a package missing from the budget is over it", () => {
  const counts = { core: { Instantiations: 1, Types: 1 } };
  assert.equal(overBudget(counts, {}).length, 2);
});

test("the budget is the count plus headroom, rounded up to a thousand", () => {
  assert.deepEqual(budgetFrom({ core: { Instantiations: 615116, Types: 195699 } }), {
    core: { Instantiations: 677000, Types: 216000 },
  });
});
