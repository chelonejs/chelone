// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "maplibre-gl",
  () => import("./components/maps/__fixtures__/fake-maplibre"),
);

const root = fileURLToPath(new URL("..", import.meta.url));
const src = resolve(root, "src");

describe("the maps/osm entry", () => {
  it("the maps/osm entry exports GeocodingInput, MapWithSearch and useGeocode", async () => {
    const entry = await import("./maps-osm");
    expect(Object.keys(entry)).toEqual(
      expect.arrayContaining(["GeocodingInput", "MapWithSearch", "useGeocode"]),
    );
  });

  it("the maps/osm entry also exports fetchOsmFeatures, useOsmFeatures, osmToPolygons, unionAll and subtractMask", async () => {
    const entry = await import("./maps-osm");
    expect(Object.keys(entry)).toEqual(
      expect.arrayContaining([
        "fetchOsmFeatures",
        "osmToPolygons",
        "subtractMask",
        "unionAll",
        "useOsmFeatures",
      ]),
    );
  });

  it("the maps/osm entry also exports the operators, ReverseGeocodeField and useReverseGeocode", async () => {
    const entry = await import("./maps-osm");
    expect(Object.keys(entry).sort()).toEqual(
      [
        "GeocodingInput",
        "MapWithSearch",
        "OsmFeatureAdd",
        "OsmFeatureOperator",
        "OsmFeatureSubtract",
        "ReverseGeocodeField",
        "fetchOsmFeatures",
        "osmToPolygons",
        "subtractMask",
        "unionAll",
        "useGeocode",
        "useOsmFeatures",
        "useReverseGeocode",
      ].sort(),
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
