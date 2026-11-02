// @vitest-environment node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "maplibre-gl",
  () => import("./components/maps/__fixtures__/fake-maplibre"),
);

const root = fileURLToPath(new URL("..", import.meta.url));
const src = resolve(root, "src");

/** Every source file under a folder, test files and fixtures aside. */
function sourceFiles(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__fixtures__" ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test(-d)?\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

describe("the maps entry", () => {
  it("exports exactly MapCanvas, MapMarker, MapsProvider, useMap, useMapsConfig and LatLngField", async () => {
    const entry = await import("./maps");
    expect(Object.keys(entry).sort()).toEqual(
      [
        "LatLngField",
        "MapCanvas",
        "MapMarker",
        "MapsProvider",
        "useMap",
        "useMapsConfig",
      ].sort(),
    );
  });

  it("is not re-exported from the main entry", () => {
    const main = readFileSync(resolve(src, "index.ts"), "utf8");
    expect(main).not.toMatch(/from\s+["']\.\/maps["']/);
    expect(main).not.toMatch(/components\/maps/);
  });

  it("names no public tile, geocoding, Overpass or routing URL in a maps, maps-draw or maps-osm source file or any maps entry", () => {
    const files = [
      ...sourceFiles(resolve(src, "components/maps")),
      ...sourceFiles(resolve(src, "components/maps-draw")),
      ...sourceFiles(resolve(src, "components/maps-osm")),
      ...readdirSync(src)
        .filter((name) => /^maps(-[a-z]+)?\.ts$/.test(name))
        .map((name) => resolve(src, name)),
    ];
    // Guards the walk: an empty list would pass vacuously.
    expect(files.map((f) => relative(src, f))).toEqual(
      expect.arrayContaining(["maps.ts", "components/maps/map-canvas.tsx"]),
    );

    // A host that serves tiles, geocoding, Overpass or routing, or a tile template.
    const publicService =
      /https?:\/\/[^\s"'`)]*(openstreetmap|nominatim|overpass|osrm|maptiler|mapbox|carto|stadiamaps|arcgis|tile)|\{z\}\/\{x\}\/\{y\}/i;
    const offenders = files.filter((file) =>
      publicService.test(readFileSync(file, "utf8")),
    );
    expect(offenders.map((f) => relative(src, f))).toEqual([]);
  });
});
