import { describe, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import { buildRecordTree } from "./record-tree";

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  meta: { parent: number };
}

const categories: Category[] = [];
const loose: (LooseRecord & { id: number })[] = [];

describe("buildRecordTree parentSource", () => {
  it("buildRecordTree accepts a path of the record", () => {
    buildRecordTree(categories, "parent_id");
    buildRecordTree(categories, "meta.parent");
  });

  it("buildRecordTree rejects a parentSource that is not a path", () => {
    // @ts-expect-error not a path of Category
    buildRecordTree(categories, "parent");
  });

  it("a loose record takes any string", () => {
    buildRecordTree(loose, "anything.at[0].all");
  });
});
