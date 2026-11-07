import { type BlockDocNode, isBlockDoc } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { landingPageDocument } from "./landing-page";
import { seedData } from "./seed";

function blocksOf(node: BlockDocNode, type: string): BlockDocNode[] {
  const inside = (node.content ?? []).flatMap((child) => blocksOf(child, type));
  return node.type === type ? [node, ...inside] : inside;
}

function textAttr(block: BlockDocNode, key: string): string {
  const value = block.attrs?.[key];
  if (typeof value !== "string") {
    throw new Error(`${block.type} has no string attr "${key}"`);
  }
  return value;
}

function textListAttr(block: BlockDocNode, key: string): string[] {
  const value = block.attrs?.[key];
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

describe("landingPageDocument", () => {
  const tables: Record<string, readonly object[]> = seedData(
    new Date("2026-11-06T12:00:00.000Z"),
  );
  const doc = landingPageDocument();

  it("is a block document", () => {
    expect(isBlockDoc(doc)).toBe(true);
  });

  it("holds charts and a record list", () => {
    expect(blocksOf(doc, "chart").length).toBeGreaterThan(0);
    expect(blocksOf(doc, "recordList").length).toBeGreaterThan(0);
  });

  it("returns a fresh document each call, so an edit never reaches the next mount", () => {
    expect(landingPageDocument()).not.toBe(doc);
    expect(landingPageDocument()).toEqual(doc);
  });

  it.each(["chart", "recordList"])(
    "each %s block reads a seeded resource whose rows have its fields",
    (type) => {
      for (const block of blocksOf(doc, type)) {
        const resource = textAttr(block, "resource");
        const rows = tables[resource];
        expect(rows, `${resource} is not seeded`).toBeDefined();
        const keys = new Set(Object.keys(rows?.[0] ?? {}));
        const named =
          type === "chart"
            ? [textAttr(block, "category"), textAttr(block, "value")].filter(
                (key) => key !== "",
              )
            : textListAttr(block, "fields");
        for (const field of named) {
          expect(keys.has(field), `${resource} has no "${field}"`).toBe(true);
        }
      }
    },
  );
});
