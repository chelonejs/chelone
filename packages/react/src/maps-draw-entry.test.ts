// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "maplibre-gl",
  () => import("./components/maps/__fixtures__/fake-maplibre"),
);
vi.mock(
  "terra-draw",
  () => import("./components/maps-draw/__fixtures__/fake-terra-draw"),
);
vi.mock(
  "terra-draw-maplibre-gl-adapter",
  () => import("./components/maps-draw/__fixtures__/fake-terra-draw"),
);

const root = fileURLToPath(new URL("..", import.meta.url));
const src = resolve(root, "src");

describe("the maps/draw entry", () => {
  it("exports exactly ShapeInput, DrawToolbar, useTerraDraw and toolMode", async () => {
    const entry = await import("./maps-draw");
    expect(Object.keys(entry).sort()).toEqual(
      ["DrawToolbar", "ShapeInput", "toolMode", "useTerraDraw"].sort(),
    );
  });

  it("the maps entry exports no Terra Draw name", async () => {
    const entry = await import("./maps");
    const draw = await import("./maps-draw");
    for (const name of Object.keys(draw)) {
      expect(Object.keys(entry), name).not.toContain(name);
    }
    const text = readFileSync(resolve(src, "maps.ts"), "utf8");
    expect(text).not.toMatch(/terra-draw|maps-draw/);
  });
});
