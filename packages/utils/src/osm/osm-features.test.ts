import {
  geoBounds,
  isOverpassAnswer,
  type LngLatBox,
  type OverpassAnswer,
  type OverpassProvider,
  OverpassRateLimitError,
} from "@chelone/core";
import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import raw from "./__fixtures__/overpass-water-roads.json";
import { fetchOsmFeatures, hasOsmSources, osmToPolygons } from "./osm-features";

if (!isOverpassAnswer(raw)) {
  throw new Error("overpass-water-roads.json is not an Overpass answer");
}

const fixture: OverpassAnswer = raw;

const bbox: LngLatBox = [2.29, 48.84, 2.31, 48.86];

function fakeProvider(answer: OverpassAnswer = fixture) {
  const query = vi.fn<OverpassProvider["query"]>(async () => answer);
  const provider: OverpassProvider = { name: "fake", query };
  return { provider, query };
}

const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("osmToPolygons", () => {
  it("keeps the water and building polygons and drops the road when roads is not a preset", () => {
    const result = osmToPolygons(fixture, ["water", "buildings"]);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features.map((f) => f.geometry?.type)).toEqual([
      "Polygon",
      "Polygon",
    ]);
    expect(result.features.map((f) => f.properties?.id)).toEqual([
      "way/1001",
      "way/1002",
    ]);
  });

  it("buffers the road into a polygon when the roads preset is named", () => {
    const result = osmToPolygons(fixture, ["roads"]);
    expect(result.features.map((f) => f.properties?.id)).toEqual([
      "way/1001",
      "way/1002",
      "way/1003",
    ]);
    const road = result.features[2];
    expect(road?.properties?.highway).toBe("primary");
    const geometry = road?.geometry;
    if (geometry?.type !== "Polygon") {
      throw new Error("the buffered road is not a Polygon");
    }
    const box = geoBounds(geometry);
    if (!box) throw new Error("the buffered road has no bounds");
    // The line runs along longitude 2.299; 15 m of buffer is about 0.0002 degrees.
    expect(box[0]).toBeLessThan(2.2989);
    expect(box[2]).toBeGreaterThan(2.2991);
  });

  it("drops points and an unbufferable line", () => {
    // The cafe node is a point, and the primary road is a line no preset here
    // buffers; only the two polygons remain.
    const result = osmToPolygons(fixture, ["amenity", "water"]);
    expect(result.features.map((f) => f.properties?.id)).toEqual([
      "way/1001",
      "way/1002",
    ]);
    expect(result.features.every((f) => f.geometry?.type === "Polygon")).toBe(
      true,
    );
  });

  it("buffers a line when a later named preset buffers it, even if an earlier one matches without buffering", () => {
    // `highway` matches the road first and has no buffer; `roads` buffers it.
    const result = osmToPolygons(fixture, ["highway", "roads"]);
    expect(result.features.map((f) => f.properties?.id)).toContain("way/1003");
    expect(
      result.features.find((f) => f.properties?.id === "way/1003")?.geometry
        ?.type,
    ).toBe("Polygon");
  });

  it("the converter puts OSM tags flat in feature properties", () => {
    const result = osmToPolygons(fixture, ["water"]);
    expect(result.features[0]?.properties).toMatchObject({
      natural: "water",
      name: "Etang",
    });
  });
});

describe("hasOsmSources", () => {
  it("is false for no presets and no tags", () => {
    expect(hasOsmSources({})).toBe(false);
    expect(hasOsmSources({ presets: [], tags: [] })).toBe(false);
  });

  it("is true for one preset or one tag", () => {
    expect(hasOsmSources({ presets: ["water"] })).toBe(true);
    expect(hasOsmSources({ tags: ["natural=water"] })).toBe(true);
  });
});

describe("fetchOsmFeatures", () => {
  it("returns null and sends no request for a null bbox or empty sources", async () => {
    const { provider, query } = fakeProvider();
    const client = newClient();
    expect(
      await fetchOsmFeatures(
        client,
        null,
        { presets: ["water"] },
        { provider },
      ),
    ).toBeNull();
    expect(await fetchOsmFeatures(client, bbox, {}, { provider })).toBeNull();
    expect(
      await fetchOsmFeatures(
        client,
        bbox,
        { presets: [], tags: [] },
        { provider },
      ),
    ).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("sends the built query and returns polygons", async () => {
    const { provider, query } = fakeProvider();
    const result = await fetchOsmFeatures(
      newClient(),
      bbox,
      { presets: ["water"] },
      { provider },
    );
    expect(query).toHaveBeenCalledTimes(1);
    const sent = query.mock.calls[0]?.[0] ?? "";
    expect(sent).toContain("(48.84,2.29,48.86,2.31)");
    expect(sent).toContain('"natural"');
    expect(result?.features.length).toBeGreaterThan(0);
  });

  it("rejects on the caller's abort without failing a shared request of another caller", async () => {
    let finish: (answer: OverpassAnswer) => void = () => {};
    const query = vi.fn<OverpassProvider["query"]>(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const provider: OverpassProvider = { name: "slow", query };
    const client = newClient();
    const sources = { presets: ["water" as const] };
    const abort = new AbortController();
    const first = fetchOsmFeatures(client, bbox, sources, {
      provider,
      signal: abort.signal,
    });
    const second = fetchOsmFeatures(client, bbox, sources, { provider });
    const firstResult = expect(first).rejects.toThrow();
    abort.abort();
    await firstResult;
    finish(fixture);
    expect((await second)?.features.length).toBeGreaterThan(0);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("rejects with OverpassRateLimitError on a 429", async () => {
    const provider: OverpassProvider = {
      name: "limited",
      query: async () => {
        throw new OverpassRateLimitError();
      },
    };
    await expect(
      fetchOsmFeatures(newClient(), bbox, { presets: ["water"] }, { provider }),
    ).rejects.toBeInstanceOf(OverpassRateLimitError);
  });
});
