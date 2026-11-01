import { describe, expect, it, vi } from "vitest";
import type { GeoLineString, GeoPosition } from "./geojson";
import { createOsrmProvider } from "./snap-to-roads";

const ENDPOINT = "https://routing.example.test";

const line = (coordinates: GeoPosition[]): GeoLineString => ({
  type: "LineString",
  coordinates,
});

const matched: GeoPosition[] = [
  [2.1, 48.1],
  [2.15, 48.15],
  [2.2, 48.2],
];

const twoPoints = line([
  [0, 0],
  [1, 1],
]);

function stubFetch(body: unknown, init?: ResponseInit) {
  return vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(body), init),
  );
}

describe("createOsrmProvider", () => {
  it("joins lng,lat pairs with semicolons and returns the matching line", async () => {
    const fetchStub = stubFetch({
      code: "Ok",
      matchings: [{ geometry: { type: "LineString", coordinates: matched } }],
    });
    const provider = createOsrmProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
    });
    const snapped = await provider.snapToRoad(
      line([
        [2.1, 48.1],
        [2.2, 48.2],
      ]),
    );
    expect(fetchStub.mock.calls[0]?.[0]).toBe(
      `${ENDPOINT}/match/v1/driving/2.1,48.1;2.2,48.2?geometries=geojson&overview=full`,
    );
    expect(snapped).toEqual({ type: "LineString", coordinates: matched });
  });

  it("uses the given profile and keeps a path prefix", async () => {
    const fetchStub = stubFetch({ code: "NoMatch" });
    await createOsrmProvider({
      endpoint: `${ENDPOINT}/osrm/`,
      profile: "foot",
      fetch: fetchStub,
    }).snapToRoad(twoPoints);
    expect(String(fetchStub.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/routing\.example\.test\/osrm\/match\/v1\/foot\/0,0;1,1\?/,
    );
  });

  it("returns null over 100 positions without fetching", async () => {
    const fetchStub = stubFetch({});
    const provider = createOsrmProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
    });
    const many = Array.from(
      { length: 101 },
      (_, i): GeoPosition => [i / 10, 0],
    );
    await expect(provider.snapToRoad(line(many))).resolves.toBeNull();
    await expect(provider.snapToRoad(line([[0, 0]]))).resolves.toBeNull();
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("returns null for a non-ok response, a code other than Ok and no matchings", async () => {
    const snap = (fetchStub: typeof fetch) =>
      createOsrmProvider({ endpoint: ENDPOINT, fetch: fetchStub }).snapToRoad(
        twoPoints,
      );
    await expect(snap(stubFetch({}, { status: 500 }))).resolves.toBeNull();
    await expect(snap(stubFetch({ code: "NoMatch" }))).resolves.toBeNull();
    await expect(
      snap(stubFetch({ code: "Ok", matchings: [] })),
    ).resolves.toBeNull();
  });

  it("returns null on a network error", async () => {
    const provider = createOsrmProvider({
      endpoint: ENDPOINT,
      fetch: vi.fn<typeof fetch>(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });
    await expect(provider.snapToRoad(twoPoints)).resolves.toBeNull();
  });

  it("throws a TypeError without an endpoint", () => {
    expect(() => createOsrmProvider({} as { endpoint: string })).toThrow(
      TypeError,
    );
    expect(() => createOsrmProvider({ endpoint: " " })).toThrow(/endpoint/);
  });
});
