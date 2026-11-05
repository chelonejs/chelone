import type { JsonObject } from "../guards";
import type { LngLatBox } from "./bounds";
import type { OsmTagFilter, OsmTagInput } from "./osm-tags";
import { tagToFilter } from "./osm-tags";

export type OsmElementType = "way" | "relation";

export interface OsmPreset {
  filters: OsmTagFilter[];
  /** Width to buffer line features to, so they can join a polygon. */
  bufferLinesMeters?: number;
  /** Defaults to both ways and relations. */
  elementTypes?: OsmElementType[];
}

const anyOf = (key: string): OsmPreset => ({ filters: [{ key, any: true }] });

export const OSM_PRESETS = {
  water: {
    filters: [
      { key: "natural", values: ["water", "bay", "strait"] },
      { key: "waterway", any: true },
    ],
  },
  buildings: anyOf("building"),
  forest: {
    filters: [
      { key: "natural", values: ["wood", "forest"] },
      { key: "landuse", value: "forest" },
    ],
  },
  roads: {
    filters: [
      { key: "highway", values: ["motorway", "trunk", "primary", "secondary"] },
    ],
    bufferLinesMeters: 15,
    elementTypes: ["way"],
  },
  natural: anyOf("natural"),
  building: anyOf("building"),
  landuse: anyOf("landuse"),
  amenity: anyOf("amenity"),
  leisure: anyOf("leisure"),
  boundary: anyOf("boundary"),
  place: anyOf("place"),
  man_made: anyOf("man_made"),
  shop: anyOf("shop"),
  tourism: anyOf("tourism"),
  historic: anyOf("historic"),
  highway: anyOf("highway"),
  railway: { ...anyOf("railway"), bufferLinesMeters: 5, elementTypes: ["way"] },
  waterway: { ...anyOf("waterway"), bufferLinesMeters: 5 },
  barrier: { ...anyOf("barrier"), bufferLinesMeters: 3 },
  power: { ...anyOf("power"), bufferLinesMeters: 3 },
} as const satisfies Record<string, OsmPreset>;

export type OsmPresetName = keyof typeof OSM_PRESETS;

function accepts(filter: OsmTagFilter, tags: Readonly<JsonObject>): boolean {
  const raw = tags[filter.key];
  if (raw === undefined || raw === null) return false;
  if ("any" in filter) return true;
  const actual = String(raw);
  return "values" in filter
    ? filter.values.includes(actual)
    : filter.value === actual;
}

/**
 * The first of `names` with a filter that accepts the feature's tags, so an
 * adapter can read its `bufferLinesMeters`; `null` when none does.
 */
export function findPresetForTags(
  tags: Readonly<JsonObject>,
  names: readonly OsmPresetName[],
): OsmPreset | null {
  for (const name of names) {
    const preset: OsmPreset = OSM_PRESETS[name];
    if (preset.filters.some((filter) => accepts(filter, tags))) return preset;
  }
  return null;
}

export interface OverpassQuerySources {
  presets?: readonly OsmPresetName[];
  tags?: readonly OsmTagInput[];
}

/** Escapes for an Overpass string; a newline cannot be escaped, so it throws. */
function quote(text: string): string {
  if (/[\r\n]/.test(text)) {
    throw new TypeError("An OSM tag cannot contain a newline");
  }
  return `"${text.replace(/[\\"]/g, "\\$&")}"`;
}

/** A regex alternative must match its text literally. */
const regexLiteral = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function filterToSelector(filter: OsmTagFilter): string {
  const key = quote(filter.key);
  if ("any" in filter) return `[${key}]`;
  if ("values" in filter) {
    const alternatives = filter.values.map(regexLiteral).join("|");
    return `[${key}~${quote(`^(${alternatives})$`)}]`;
  }
  return `[${key}=${quote(filter.value)}]`;
}

/**
 * Overpass QL for every feature matching a preset or a tag inside `bbox`
 * (`[west, south, east, north]`, written south, west, north, east).
 */
export function buildOverpassQuery(
  sources: OverpassQuerySources,
  bbox: LngLatBox,
): string {
  const [west, south, east, north] = bbox;
  const area = `(${south},${west},${north},${east})`;
  const clauses: string[] = [];
  const add = (filter: OsmTagFilter, types: readonly OsmElementType[]) => {
    const selector = filterToSelector(filter);
    for (const type of types) clauses.push(`  ${type}${selector}${area};`);
  };
  for (const name of sources.presets ?? []) {
    const preset: OsmPreset = OSM_PRESETS[name];
    for (const filter of preset.filters) {
      add(filter, preset.elementTypes ?? ["way", "relation"]);
    }
  }
  for (const tag of sources.tags ?? [])
    add(tagToFilter(tag), ["way", "relation"]);

  const union = clauses.length ? `(\n${clauses.join("\n")}\n);` : "();";
  return `[out:json][timeout:25];\n${union}\nout geom;`;
}
