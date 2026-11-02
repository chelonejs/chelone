import { type OverpassProvider, OverpassRateLimitError } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import fixture from "./__fixtures__/overpass-water-roads.json";
import { fetchOsmFeatures, osmToPolygons } from "./osm-features";

const bbox: [number, number, number, number] = [2.29, 48.84, 2.31, 48.86];

function fakeProvider(answer: unknown = fixture) {
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
    expect(road?.geometry?.type).toBe("Polygon");
    expect(road?.properties?.highway).toBe("primary");
    // The line runs along longitude 2.299; 15 m of buffer is about 0.0002 degrees.
    const ring = (road?.geometry as { coordinates: number[][][] })
      .coordinates[0] as number[][];
    const lons = ring.map((p) => p[0] as number);
    expect(Math.min(...lons)).toBeLessThan(2.2989);
    expect(Math.max(...lons)).toBeGreaterThan(2.2991);
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

  it("the converter puts OSM tags flat in feature properties", () => {
    const result = osmToPolygons(fixture, ["water"]);
    expect(result.features[0]?.properties).toMatchObject({
      natural: "water",
      name: "Etang",
    });
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
