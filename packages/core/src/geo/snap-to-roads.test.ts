import type { LineString, Position } from "geojson";
import { describe, expect, it, vi } from "vitest";
import { createOsrmProvider } from "./snap-to-roads";

const ENDPOINT = "https://routing.example.test";

const line = (coordinates: Position[]): LineString => ({
  type: "LineString",
  coordinates,
});

const matched: Position[] = [
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

  it("matches a line of more than 100 positions in chunks", async () => {
    const many = Array.from({ length: 250 }, (_, i): Position => [i / 10, 0]);
    // Echoes each chunk back shifted north, so the join is visible.
    const fetchStub = vi.fn<typeof fetch>(async (input) => {
      const path = String(input).split("/match/v1/driving/")[1] ?? "";
      const coordinates = (path.split("?")[0] ?? "").split(";").map((pair) => {
        const [lng, lat] = pair.split(",").map(Number);
        return [lng, (lat ?? 0) + 1];
      });
      return new Response(
        JSON.stringify({
          code: "Ok",
          matchings: [{ geometry: { type: "LineString", coordinates } }],
        }),
      );
    });
    const provider = createOsrmProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
    });
    const snapped = await provider.snapToRoad(line(many));

    // 250 positions: chunks of 100 sharing end points are 0-99, 99-198, 198-249.
    expect(fetchStub).toHaveBeenCalledTimes(3);
    expect(snapped?.coordinates).toEqual(many.map(([x]) => [x, 1]));
  });

  it("returns null when any chunk of a long line fails", async () => {
    const many = Array.from({ length: 150 }, (_, i): Position => [i / 10, 0]);
    const fetchStub = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ code: "NoMatch" })),
    );
    const provider = createOsrmProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
    });
    await expect(provider.snapToRoad(line(many))).resolves.toBeNull();
  });

  it("returns null for a line of fewer than two positions without fetching", async () => {
    const fetchStub = stubFetch({});
    const provider = createOsrmProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
    });
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

  it("returns null when the trace is split into several matchings", async () => {
    const piece = (coordinates: Position[]) => ({
      geometry: { type: "LineString", coordinates },
    });
    const provider = createOsrmProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch({
        code: "Ok",
        matchings: [
          piece([
            [0, 0],
            [1, 1],
          ]),
          piece([
            [5, 5],
            [6, 6],
          ]),
        ],
      }),
    });
    await expect(provider.snapToRoad(twoPoints)).resolves.toBeNull();
  });

  it("keeps the caller's line when a matched coordinate is not a number", async () => {
    const provider = createOsrmProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch({
        code: "Ok",
        matchings: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [2.1, 48.1],
                [2.15, "48.15"],
              ],
            },
          },
        ],
      }),
    });
    await expect(provider.snapToRoad(twoPoints)).resolves.toBeNull();
  });

  it("keeps the caller's line when the match is not a LineString", async () => {
    const provider = createOsrmProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch({
        code: "Ok",
        matchings: [
          { geometry: { type: "MultiLineString", coordinates: [matched] } },
        ],
      }),
    });
    await expect(provider.snapToRoad(twoPoints)).resolves.toBeNull();
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
    expect(() => {
      // @ts-expect-error the options carry no endpoint, which the type requires
      createOsrmProvider({});
    }).toThrow(TypeError);
    expect(() => createOsrmProvider({ endpoint: " " })).toThrow(/endpoint/);
  });
});
