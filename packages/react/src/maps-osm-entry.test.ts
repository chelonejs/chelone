// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "maplibre-gl",
  () => import("./components/maps/__fixtures__/fake-maplibre"),
);

const src = resolve(fileURLToPath(new URL("..", import.meta.url)), "src");

describe("the maps/osm entry", () => {
  it("exports exactly GeocodingInput, MapWithSearch and useGeocode", async () => {
    const entry = await import("./maps-osm");
    expect(Object.keys(entry).sort()).toEqual(
      ["GeocodingInput", "MapWithSearch", "useGeocode"].sort(),
    );
  });

  it("the maps entry exports no geocoding name", async () => {
    const entry = await import("./maps");
    const osm = await import("./maps-osm");
    for (const name of Object.keys(osm)) {
      expect(Object.keys(entry), name).not.toContain(name);
    }
    const text = readFileSync(resolve(src, "maps.ts"), "utf8");
    expect(text).not.toMatch(/maps-osm|geocod/i);
  });
});
