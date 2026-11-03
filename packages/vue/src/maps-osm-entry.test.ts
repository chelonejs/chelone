// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock(
  "maplibre-gl",
  () => import("./components/maps/__fixtures__/fake-maplibre"),
);

const root = fileURLToPath(new URL("..", import.meta.url));
const src = resolve(root, "src");

describe("the maps/osm entry", () => {
  let osm: typeof import("./maps-osm");
  let maps: typeof import("./maps");

  // The cold import compiles every SFC and turf module behind the entry, which
  // can outlast the 5 s test timeout on a busy runner.
  beforeAll(async () => {
    osm = await import("./maps-osm");
    maps = await import("./maps");
  }, 30_000);

  it("the maps/osm entry exports GeocodingInput, MapWithSearch and useGeocode", () => {
    const entry = osm;
    expect(Object.keys(entry)).toEqual(
      expect.arrayContaining(["GeocodingInput", "MapWithSearch", "useGeocode"]),
    );
  });

  it("the maps/osm entry also exports fetchOsmFeatures, useOsmFeatures, osmToPolygons, unionAll and subtractMask", () => {
    const entry = osm;
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

  it("the maps/osm entry also exports the operators, ReverseGeocodeField and useReverseGeocode", () => {
    const entry = osm;
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

  it("the maps entry exports no geocoding name", () => {
    const entry = maps;
    for (const name of Object.keys(osm)) {
      expect(Object.keys(entry), name).not.toContain(name);
    }
    const text = readFileSync(resolve(src, "maps.ts"), "utf8");
    expect(text).not.toMatch(/maps-osm|geocod/i);
  });
});
