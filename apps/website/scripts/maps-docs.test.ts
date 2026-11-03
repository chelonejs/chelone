// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../src/docs/content/app-config/maps.mdx");
// Prose phrases are matched on one line, however the page wraps them.
const flat = page.replace(/\s+/g, " ");
const meta = read("../src/docs/content/app-config/_meta.ts");

const SUBPATHS = ["maps", "maps/draw", "maps/osm"] as const;
type Subpath = (typeof SUBPATHS)[number];
const ENTRY_FILE: Record<Subpath, string> = {
  maps: "maps.ts",
  "maps/draw": "maps-draw.ts",
  "maps/osm": "maps-osm.ts",
};

/** The value exports of an entry file; `type` exports and comments are skipped. */
function valueExports(source: string): Set<string> {
  const names = new Set<string>();
  const code = source.replace(/\/\/[^\n]*/g, "");
  for (const block of code.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of block[1].split(",")) {
      const item = part.trim();
      if (!item || item.startsWith("type ")) continue;
      names.add(item.includes(" as ") ? item.split(" as ")[1].trim() : item);
    }
  }
  return names;
}

const entries = {
  react: {} as Record<Subpath, Set<string>>,
  vue: {} as Record<Subpath, Set<string>>,
};
for (const adapter of ["react", "vue"] as const) {
  for (const subpath of SUBPATHS) {
    entries[adapter][subpath] = valueExports(
      read(`../../../packages/${adapter}/src/${ENTRY_FILE[subpath]}`),
    );
  }
}

/** The subpath whose React entry exports `name`, if any. */
function ownerOf(name: string): Subpath | undefined {
  return SUBPATHS.find((subpath) => entries.react[subpath].has(name));
}

/** Rows of the table under `## Exports`: subpath cell, then the names in the next cell. */
function exportsTable(): { subpath: Subpath; names: string[] }[] {
  const section = page.split(/^## Exports$/m)[1]?.split(/^## /m)[0] ?? "";
  const rows: { subpath: Subpath; names: string[] }[] = [];
  for (const line of section.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    const subpath = cells[1]?.match(
      /^`@chelone\/react\/(maps(?:\/\w+)?)`$/,
    )?.[1];
    if (!subpath) continue;
    const names = [...(cells[2] ?? "").matchAll(/`([^`]+)`/g)].map(
      (match) => match[1],
    );
    rows.push({ subpath: subpath as Subpath, names });
  }
  return rows;
}

/** The leading identifier of each backticked component, hook or function. */
function namedExports(mdx: string): string[] {
  const names = new Set<string>();
  for (const match of mdx.matchAll(/`([^`\n]+)`/g)) {
    const token = match[1].match(
      /^<?([A-Z][A-Za-z0-9]*|use[A-Z][A-Za-z0-9]*|fetchOsmFeatures)\b/,
    );
    if (token) names.add(token[1]);
  }
  return [...names];
}

const fences = [...page.matchAll(/^```(\w+)[^\n]*\n([\s\S]*?)^```/gm)].map(
  (match) => ({ lang: match[1], code: match[2] }),
);

it("the maps page names the three subpaths, the install routes, messages and the four required inputs", () => {
  expect(page).toMatch(/^title: "Maps"$/m);
  expect(page).toMatch(/^description: ".+"$/m);
  expect(page).not.toContain("**");
  expect(meta).toMatch(
    /slug: "realtime", title: "Realtime" \},\s*\{ slug: "maps", title: "Maps" \}/,
  );

  for (const block of ["maps", "maps-draw", "maps-osm"]) {
    expect(page, `block ${block}`).toContain(`\`@chelone/${block}\``);
  }
  for (const subpath of SUBPATHS) {
    expect(page).toContain(`\`@chelone/react/${subpath}\``);
    expect(page).toContain(`\`@chelone/vue/${subpath}\``);
  }
  expect(page).toContain("npx shadcn add @chelone/maps-draw");
  expect(flat).toMatch(/also installs `maps`/);
  expect(flat).toMatch(/main entry and `@chelone\/core` never import/);
  expect(flat).toMatch(/`maps` never imports `maps\/draw` or `maps\/osm`/);

  for (const peer of [
    "maplibre-gl",
    "terra-draw",
    "terra-draw-maplibre-gl-adapter",
    "@turf/difference",
    "@turf/simplify",
    "@turf/buffer",
    "@turf/union",
    "osm2geojson-lite",
  ]) {
    expect(page, peer).toContain(`\`${peer}\``);
  }
  expect(flat).toMatch(
    /only shows maps installs `maplibre-gl` and nothing else/,
  );

  expect(page).toContain("`mapMessages`");
  expect(page).toContain("`defaultMessages`");
  expect(page).toContain("`chelone.map.");
  expect(page).toContain("`chelone.validation.");

  for (const input of [
    "mapStyle",
    "geocoder",
    "overpass",
    "router",
    "snapToRoads",
    "provider",
    "MapsProvider",
    "rasterTileStyle",
    "createNominatimProvider",
    "createOverpassProvider",
    "createOsrmProvider",
  ]) {
    expect(page, input).toContain(`\`${input}`);
  }
  expect(flat).toMatch(
    /throws an error that names the prop and `MapsProvider`/,
  );
});

it("every component the maps page names is exported by the same maps, maps/draw or maps/osm entry in both adapters", () => {
  const table = exportsTable();
  expect(table.map((row) => row.subpath)).toEqual([...SUBPATHS]);

  const tabled = new Set<string>();
  for (const { subpath, names } of table) {
    expect(names.length, subpath).toBeGreaterThan(0);
    for (const name of names) {
      tabled.add(name);
      expect(
        entries.react[subpath],
        `React ${subpath} exports ${name}`,
      ).toContain(name);
      expect(entries.vue[subpath], `Vue ${subpath} exports ${name}`).toContain(
        name,
      );
    }
  }

  // Any other backticked name an entry exports is in the table, under its own entry.
  for (const name of namedExports(page)) {
    const owner = ownerOf(name);
    if (owner === undefined) continue;
    expect(tabled, `${name} is in the exports table`).toContain(name);
    expect(entries.vue[owner], `Vue ${owner} exports ${name}`).toContain(name);
  }

  for (const name of [
    "MapCanvas",
    "MapMarker",
    "MapsProvider",
    "LatLngField",
    "LatLngInput",
    "GeoJsonField",
    "BBoxField",
    "ShapeInput",
    "BBoxInput",
    "SimplifyInput",
    "DrawToolbar",
    "PolygonInput",
    "GeocodingInput",
    "MapWithSearch",
    "ReverseGeocodeField",
    "OsmFeatureSubtract",
    "OsmFeatureAdd",
    "fetchOsmFeatures",
    "useOsmFeatures",
  ]) {
    expect(tabled, name).toContain(name);
  }
});

it("the maps page says BBoxInput takes no tools prop", () => {
  expect(flat).toMatch(/`BBoxInput` also leaves out `tools`/);
  expect(flat).toMatch(/except on `BBoxInput`, which takes no `tools`/);
});

it("every maps page example imports a name from the subpath that exports it", () => {
  const examples = fences.filter((fence) =>
    ["ts", "tsx", "vue"].includes(fence.lang),
  );
  expect(examples.length).toBeGreaterThan(5);

  const subpathsImported = new Set<string>();
  for (const { code } of examples) {
    const imported = new Map<string, string>();
    for (const match of code.matchAll(
      /import\s*\{([^}]*)\}\s*from\s*"(@chelone\/(react|vue)(?:\/(maps(?:\/\w+)?))?|@chelone\/core)"/g,
    )) {
      const adapter = match[3] as "react" | "vue" | undefined;
      const subpath = match[4] as Subpath | undefined;
      for (const part of match[1].split(",")) {
        const name = part.trim().replace(/^type\s+/, "");
        if (!name) continue;
        imported.set(name, match[2]);
        if (adapter && subpath) {
          subpathsImported.add(subpath);
          expect(
            entries[adapter][subpath],
            `${name} is exported by ${match[2]}`,
          ).toContain(name);
        }
      }
    }
    // A name an entry exports is imported from that entry, not another module.
    for (const word of new Set(code.match(/\b[A-Za-z][A-Za-z0-9]*\b/g))) {
      const owner = ownerOf(word);
      if (owner === undefined || !imported.has(word)) continue;
      expect(imported.get(word), `${word} import`).toMatch(
        new RegExp(`^@chelone/(react|vue)/${owner}$`),
      );
    }
    for (const word of new Set(code.match(/<([A-Z][A-Za-z0-9]*)/g))) {
      const name = word.slice(1);
      const owner = ownerOf(name);
      if (owner === undefined) continue;
      expect(imported.get(name), `${name} is imported`).toMatch(
        new RegExp(`^@chelone/(react|vue)/${owner}$`),
      );
    }
  }
  expect([...subpathsImported].sort()).toEqual([...SUBPATHS].sort());
});

it("the maps page has no unresolved doc links", () => {
  expect(unresolvedDocLinks(page)).toEqual([]);
  expect(page).toContain("](/docs/vue/differences)");
});

it("the maps page gives the OpenStreetMap attribution and says each public service suits demos and light use only", () => {
  expect(page).toContain("© OpenStreetMap contributors");
  expect(page).toContain("https://www.openstreetmap.org/copyright");
  for (const server of [
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    "https://nominatim.openstreetmap.org",
    "https://overpass-api.de/api/interpreter",
    "https://router.project-osrm.org",
  ]) {
    expect(page, server).toContain(server);
  }
  expect(flat).toMatch(/suit demos and light use only/);
  expect(flat).toMatch(
    /production apps point each helper at their own server or a paid provider/,
  );
});

it("the maps page states the Nominatim, Overpass, OSRM and OpenStreetMap tile usage limits", () => {
  expect(flat).toMatch(/tile servers allow light use and development/);
  expect(flat).toMatch(/Nominatim allows about one request per second/);
  expect(flat).toMatch(/forbids search-as-you-type/);
  expect(flat).toMatch(/Overpass instance limits query load/);
  expect(flat).toMatch(/OSRM demo server is for trying it out/);
  expect(flat).toMatch(/about 16 WebGL contexts per page/);
  expect(flat).toMatch(/jsdom has no WebGL/);
});
