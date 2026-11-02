import { describe, expect, it } from "vitest";
import type { OsmPresetName } from "./osm-presets";
import {
  buildOverpassQuery,
  findPresetForTags,
  OSM_PRESETS,
} from "./osm-presets";

const BBOX = [2.2, 48.8, 2.5, 48.9] as const;
const BOX = "(48.8,2.2,48.9,2.5)";

/** The clause lines between the union's parentheses. */
function clauses(query: string): string[] {
  return query
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(way|relation)\[/.test(line));
}

describe("buildOverpassQuery", () => {
  it("the water preset compiles to natural and waterway clauses for ways and relations", () => {
    const query = buildOverpassQuery({ presets: ["water"] }, [...BBOX]);
    expect(query.startsWith("[out:json][timeout:25];")).toBe(true);
    expect(query.trimEnd().endsWith("out geom;")).toBe(true);
    expect(clauses(query)).toEqual([
      `way["natural"~"^(water|bay|strait)$"]${BOX};`,
      `relation["natural"~"^(water|bay|strait)$"]${BOX};`,
      `way["waterway"]${BOX};`,
      `relation["waterway"]${BOX};`,
    ]);
  });

  it("the roads preset is ways only and buffers 15 m", () => {
    const query = buildOverpassQuery({ presets: ["roads"] }, [...BBOX]);
    expect(clauses(query)).toEqual([
      `way["highway"~"^(motorway|trunk|primary|secondary)$"]${BOX};`,
    ]);
    expect(OSM_PRESETS.roads.bufferLinesMeters).toBe(15);
    expect(OSM_PRESETS.roads.elementTypes).toEqual(["way"]);
  });

  it("the bbox is written south, west, north, east", () => {
    const query = buildOverpassQuery({ tags: ["building=*"] }, [-1, -2, 3, 4]);
    expect(clauses(query)).toEqual([
      'way["building"](-2,-1,4,3);',
      'relation["building"](-2,-1,4,3);',
    ]);
  });

  it("presets and tags merge into one query", () => {
    const query = buildOverpassQuery(
      { presets: ["buildings", "forest"], tags: ["amenity=school"] },
      [...BBOX],
    );
    expect(clauses(query)).toEqual([
      `way["building"]${BOX};`,
      `relation["building"]${BOX};`,
      `way["natural"~"^(wood|forest)$"]${BOX};`,
      `relation["natural"~"^(wood|forest)$"]${BOX};`,
      `way["landuse"="forest"]${BOX};`,
      `relation["landuse"="forest"]${BOX};`,
      `way["amenity"="school"]${BOX};`,
      `relation["amenity"="school"]${BOX};`,
    ]);
    expect(query.match(/out geom;/g)).toHaveLength(1);
  });

  it("each category preset emits its key", () => {
    const categories = [
      "natural",
      "building",
      "landuse",
      "amenity",
      "leisure",
      "boundary",
      "place",
      "man_made",
      "shop",
      "tourism",
      "historic",
      "highway",
      "railway",
      "waterway",
      "barrier",
      "power",
    ] as const satisfies readonly OsmPresetName[];
    for (const name of categories) {
      const query = buildOverpassQuery({ presets: [name] }, [...BBOX]);
      expect(clauses(query)).toContain(`way["${name}"]${BOX};`);
    }
    expect(OSM_PRESETS.railway).toMatchObject({
      bufferLinesMeters: 5,
      elementTypes: ["way"],
    });
    expect(OSM_PRESETS.waterway.bufferLinesMeters).toBe(5);
    expect(OSM_PRESETS.barrier.bufferLinesMeters).toBe(3);
    expect(OSM_PRESETS.power.bufferLinesMeters).toBe(3);
    expect(OSM_PRESETS.natural.bufferLinesMeters).toBeUndefined();
  });

  it("renders a value as an equality", () => {
    const query = buildOverpassQuery({ tags: ["name=a.b"] }, [...BBOX]);
    expect(clauses(query)[0]).toBe(`way["name"="a.b"]${BOX};`);
  });

  it("a quote in a tag value is escaped", () => {
    const query = buildOverpassQuery(
      { tags: ['name=say "hi"\\', 'we"ird=x'] },
      [...BBOX],
    );
    expect(clauses(query)[0]).toBe(`way["name"="say \\"hi\\"\\\\"]${BOX};`);
    expect(clauses(query)[2]).toBe(`way["we\\"ird"="x"]${BOX};`);
  });

  it("throws on a newline in a tag", () => {
    expect(() =>
      buildOverpassQuery({ tags: ["name=a\nb"] }, [...BBOX]),
    ).toThrow();
    expect(() =>
      buildOverpassQuery({ tags: ["na\rme=b"] }, [...BBOX]),
    ).toThrow();
  });

  it("gives an empty union for no sources", () => {
    const query = buildOverpassQuery({}, [...BBOX]);
    expect(clauses(query)).toEqual([]);
    expect(query).toContain("();");
  });
});

describe("findPresetForTags", () => {
  it("matches a value, a value list and an any filter and returns null for no match", () => {
    expect(findPresetForTags({ landuse: "forest" }, ["forest"])).toBe(
      OSM_PRESETS.forest,
    );
    expect(findPresetForTags({ natural: "bay" }, ["water"])).toBe(
      OSM_PRESETS.water,
    );
    expect(findPresetForTags({ waterway: "stream" }, ["water"])).toBe(
      OSM_PRESETS.water,
    );
    expect(findPresetForTags({ highway: "primary" }, ["roads"])).toBe(
      OSM_PRESETS.roads,
    );
    expect(findPresetForTags({ highway: "residential" }, ["roads"])).toBeNull();
    expect(findPresetForTags({ name: "x" }, ["water", "roads"])).toBeNull();
    expect(findPresetForTags({}, ["water"])).toBeNull();
  });

  it("returns the first named preset that accepts the tags", () => {
    const tags = { highway: "primary", waterway: "canal" };
    expect(findPresetForTags(tags, ["waterway", "roads"])).toBe(
      OSM_PRESETS.waterway,
    );
    expect(findPresetForTags(tags, ["roads", "waterway"])).toBe(
      OSM_PRESETS.roads,
    );
    expect(findPresetForTags(tags, ["buildings"])).toBeNull();
  });
});
