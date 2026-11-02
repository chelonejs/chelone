// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as entry from "./csv-import";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("the csv-import entry", () => {
  it("the csv-import entry exports CsvImport and useCsvImport", () => {
    expect(Object.keys(entry).sort()).toEqual(["CsvImport", "useCsvImport"]);
    expect(typeof entry.CsvImport).toBe("function");
    expect(typeof entry.useCsvImport).toBe("function");
  });

  it("is not re-exported from the main entry", () => {
    const main = readFileSync(resolve(root, "src/index.ts"), "utf8");
    expect(main).not.toMatch(/csv-import/);
  });
});
