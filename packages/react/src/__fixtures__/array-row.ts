import type { ArrayRow } from "@chelone/core";

/**
 * A whole `ArrayRow` with defaults a test never drives: the verbs are no-ops,
 * so a test overrides only the `id`, `index` and `name` it asserts on.
 */
export function fakeArrayRow(overrides: Partial<ArrayRow> = {}): ArrayRow {
  return {
    id: "row-0",
    index: 0,
    name: "tags[0]",
    remove: async () => {},
    reOrder: () => {},
    ...overrides,
  };
}
