import { describe, expect, it, vi } from "vitest";
import * as nominatim from "./nominatim";
import { createNominatimProvider } from "./nominatim";

const ENDPOINT = "https://geo.example.test";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), init);
}

function stubFetch(body: unknown = [], init?: ResponseInit) {
  return vi.fn<typeof fetch>(async () => jsonResponse(body, init));
}

const hit = {
  display_name: "Paris, France",
  lat: "48.8588897",
  lon: "2.3200410",
  boundingbox: ["48.8155755", "48.9021560", "2.2241220", "2.4697602"],
  type: "administrative",
};

describe("createNominatimProvider search", () => {
  it("requests /search with q, format, limit, countrycodes and viewbox", async () => {
    const fetchStub = stubFetch();
    const provider = createNominatimProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
    });
    await provider.search("Paris");
    const first = new URL(String(fetchStub.mock.calls[0]?.[0]));
    expect(first.origin + first.pathname).toBe(`${ENDPOINT}/search`);
    expect(first.searchParams.get("q")).toBe("Paris");
    expect(first.searchParams.get("format")).toBe("json");
    expect(first.searchParams.get("limit")).toBe("10");
    expect(first.searchParams.has("countrycodes")).toBe(false);
    expect(first.searchParams.has("viewbox")).toBe(false);

    await provider.search("Rue de Rivoli", {
      limit: 3,
      countryCodes: ["fr", "be"],
      viewBox: [2, 48, 3, 49],
    });
    const second = new URL(String(fetchStub.mock.calls[1]?.[0]));
    expect(second.searchParams.get("limit")).toBe("3");
    expect(second.searchParams.get("countrycodes")).toBe("fr,be");
    expect(second.searchParams.get("viewbox")).toBe("2,48,3,49");
  });

  it("reorders boundingbox into west, south, east, north", async () => {
    const provider = createNominatimProvider({
      endpoint: ENDPOINT,
      minIntervalMs: 0,
      fetch: stubFetch([hit]),
    });
    const [result] = await provider.search("Paris");
    expect(result).toMatchObject({
      displayName: "Paris, France",
      lat: 48.8588897,
      lng: 2.320041,
      bbox: [2.224122, 48.8155755, 2.4697602, 48.902156],
      type: "administrative",
      raw: hit,
    });
  });

  it("drops hits with a non-finite coordinate", async () => {
    const provider = createNominatimProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch([{ ...hit, lat: "nope" }, hit, { ...hit, lon: null }]),
    });
    const results = await provider.search("Paris");
    expect(results.map((r) => r.displayName)).toEqual(["Paris, France"]);
  });

  it("sends Accept-Language and no User-Agent", async () => {
    const fetchStub = stubFetch();
    await createNominatimProvider({
      endpoint: ENDPOINT,
      language: "fr",
      fetch: fetchStub,
    }).search("Paris");
    const headers = new Headers(fetchStub.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Accept-Language")).toBe("fr");
    expect(headers.has("User-Agent")).toBe(false);

    const defaulted = stubFetch();
    await createNominatimProvider({
      endpoint: ENDPOINT,
      fetch: defaulted,
    }).search("Paris");
    expect(
      new Headers(defaulted.mock.calls[0]?.[1]?.headers).get("Accept-Language"),
    ).toBe("en");
  });

  it("keeps a path prefix on a custom endpoint", async () => {
    const fetchStub = stubFetch();
    await createNominatimProvider({
      endpoint: `${ENDPOINT}/nominatim/`,
      fetch: fetchStub,
    }).search("Paris");
    expect(String(fetchStub.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/geo\.example\.test\/nominatim\/search\?/,
    );
  });

  it("forwards the abort signal to fetch", async () => {
    const fetchStub = stubFetch();
    const { signal } = new AbortController();
    await createNominatimProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
    }).search("Paris", { signal });
    expect(fetchStub.mock.calls[0]?.[1]?.signal).toBe(signal);
  });

  it("throws with the status on a non-ok response", async () => {
    const provider = createNominatimProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch({}, { status: 429 }),
    });
    await expect(provider.search("Paris")).rejects.toThrow(
      "Nominatim search 429",
    );
  });
});

describe("createNominatimProvider", () => {
  it("throws a TypeError without an endpoint and exports no ready-made provider", () => {
    expect(() =>
      createNominatimProvider({} as { endpoint: string }),
    ).toThrow(TypeError);
    expect(() => createNominatimProvider({ endpoint: "" })).toThrow(
      /endpoint/,
    );
    expect(Object.keys(nominatim)).toEqual(["createNominatimProvider"]);
  });

  it("typeahead is false unless the option sets it", () => {
    expect(createNominatimProvider({ endpoint: ENDPOINT }).typeahead).toBe(
      false,
    );
    expect(
      createNominatimProvider({ endpoint: ENDPOINT, typeahead: true })
        .typeahead,
    ).toBe(true);
  });

  it("two concurrent searches are spaced by the minimum interval", async () => {
    let time = 5_000;
    const startedAt: number[] = [];
    const fetchStub = vi.fn<typeof fetch>(async () => {
      startedAt.push(time);
      return jsonResponse([]);
    });
    const provider = createNominatimProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
      now: () => time,
      sleep: async (ms) => {
        time += ms;
      },
    });
    await Promise.all([provider.search("Paris"), provider.search("Lyon")]);
    expect(startedAt).toHaveLength(2);
    expect((startedAt[1] ?? 0) - (startedAt[0] ?? 0)).toBeGreaterThanOrEqual(
      1000,
    );
  });
});

describe("createNominatimProvider reverse", () => {
  it("requests /reverse with lat, lon and format and maps the hit", async () => {
    const fetchStub = stubFetch(hit);
    const result = await createNominatimProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
    }).reverse(48.85, 2.35);
    const url = new URL(String(fetchStub.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/reverse");
    expect(url.searchParams.get("lat")).toBe("48.85");
    expect(url.searchParams.get("lon")).toBe("2.35");
    expect(url.searchParams.get("format")).toBe("json");
    expect(result?.displayName).toBe("Paris, France");
  });

  it("returns null for a non-ok response, an error body and a network failure", async () => {
    const reverse = (fetchStub: typeof fetch) =>
      createNominatimProvider({
        endpoint: ENDPOINT,
        minIntervalMs: 0,
        fetch: fetchStub,
      }).reverse(0, 0);
    await expect(reverse(stubFetch({}, { status: 500 }))).resolves.toBeNull();
    await expect(
      reverse(stubFetch({ error: "Unable to geocode" })),
    ).resolves.toBeNull();
    await expect(
      reverse(stubFetch({ lat: "1", lon: "2" })),
    ).resolves.toBeNull();
    await expect(
      reverse(
        vi.fn<typeof fetch>(async () => {
          throw new TypeError("Failed to fetch");
        }),
      ),
    ).resolves.toBeNull();
  });
});
