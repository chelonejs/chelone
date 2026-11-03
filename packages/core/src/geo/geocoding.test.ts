import { QueryClient, QueryObserver } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import {
  type GeocodingProvider,
  geocodeQueryOptions,
  reverseGeocodeQueryOptions,
} from "./geocoding";
import { createNominatimProvider } from "./nominatim";

function fakeProvider(name = "fake") {
  const search = vi.fn<GeocodingProvider["search"]>(async () => []);
  const reverse = vi.fn<GeocodingProvider["reverse"]>(async () => null);
  const provider: GeocodingProvider = { name, search, reverse };
  return { provider, search, reverse };
}

describe("geocodeQueryOptions", () => {
  it("is disabled below minChars and keys on the provider name", () => {
    const { provider } = fakeProvider("acme");
    const short = geocodeQueryOptions(provider, "  ab ");
    expect(short.enabled).toBe(false);

    const long = geocodeQueryOptions(provider, "  Paris ", {
      countryCodes: ["fr"],
      viewBox: [1, 2, 3, 4],
      limit: 5,
    });
    expect(long.enabled).toBe(true);
    expect(long.queryKey).toContain("acme");
    expect(long.queryKey).toContain("Paris");
    expect(long.queryKey).toEqual(
      expect.arrayContaining([["fr"], [1, 2, 3, 4], 5]),
    );
    expect(long.staleTime).toBe(5 * 60 * 1000);

    const other = fakeProvider("other").provider;
    expect(geocodeQueryOptions(other, "Paris").queryKey).not.toEqual(
      geocodeQueryOptions(provider, "Paris").queryKey,
    );
  });

  it("keys a search by the provider's cacheKey", () => {
    const { provider } = fakeProvider("acme");
    const keyed = { ...provider, cacheKey: "acme|fr" };
    const searchKey = geocodeQueryOptions(keyed, "Paris").queryKey;
    expect(searchKey).toContain("acme|fr");
    expect(searchKey).not.toContain("acme");
    expect(
      geocodeQueryOptions({ ...provider, cacheKey: "acme|de" }, "Paris")
        .queryKey,
    ).not.toEqual(searchKey);

    const reverseKey = reverseGeocodeQueryOptions(keyed, {
      lat: 1,
      lng: 2,
    }).queryKey;
    expect(reverseKey).toContain("acme|fr");
    expect(reverseKey).not.toContain("acme");
  });

  it("two Nominatim providers in different languages do not share a key", () => {
    const endpoint = "https://nominatim.example.test";
    const english = createNominatimProvider({ endpoint, language: "en" });
    const french = createNominatimProvider({ endpoint, language: "fr" });
    expect(geocodeQueryOptions(english, "Paris").queryKey).not.toEqual(
      geocodeQueryOptions(french, "Paris").queryKey,
    );
    expect(
      reverseGeocodeQueryOptions(english, { lat: 1, lng: 2 }).queryKey,
    ).not.toEqual(
      reverseGeocodeQueryOptions(french, { lat: 1, lng: 2 }).queryKey,
    );
    const elsewhere = createNominatimProvider({
      endpoint: "https://other.example.test",
      language: "en",
    });
    expect(geocodeQueryOptions(english, "Paris").queryKey).not.toEqual(
      geocodeQueryOptions(elsewhere, "Paris").queryKey,
    );
    const sameAgain = createNominatimProvider({ endpoint, language: "en" });
    expect(geocodeQueryOptions(english, "Paris").queryKey).toEqual(
      geocodeQueryOptions(sameAgain, "Paris").queryKey,
    );
  });

  it("honours a custom minChars", () => {
    const { provider } = fakeProvider();
    expect(geocodeQueryOptions(provider, "ab", { minChars: 2 }).enabled).toBe(
      true,
    );
  });

  it("queryFn forwards the abort signal to the provider", async () => {
    const { provider, search } = fakeProvider();
    const { signal } = new AbortController();
    await geocodeQueryOptions(provider, " Paris ", {
      limit: 3,
      countryCodes: ["fr"],
    }).queryFn({ signal });
    expect(search).toHaveBeenCalledWith("Paris", {
      signal,
      limit: 3,
      countryCodes: ["fr"],
      viewBox: undefined,
    });
  });

  it("does not retry a failed search", async () => {
    const { provider, search } = fakeProvider();
    search.mockRejectedValue(new Error("429"));
    // The default of 3 retries is what an app's own QueryClient brings.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: 3, retryDelay: 1000 } },
    });
    const observer = new QueryObserver(
      client,
      geocodeQueryOptions(provider, "Paris"),
    );
    const unsubscribe = observer.subscribe(() => {});
    try {
      await vi.waitFor(
        () => expect(observer.getCurrentResult().status).toBe("error"),
        { timeout: 500 },
      );
      expect(search).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
      client.clear();
    }
  });
});

describe("reverseGeocodeQueryOptions", () => {
  it("rounds the key to 5 decimals and is disabled for NaN", () => {
    const { provider } = fakeProvider("acme");
    const near = reverseGeocodeQueryOptions(provider, {
      lat: 48.8566001,
      lng: 2.3522199,
    });
    expect(near.enabled).toBe(true);
    expect(near.queryKey).toEqual(
      reverseGeocodeQueryOptions(provider, { lat: 48.8566, lng: 2.35222 })
        .queryKey,
    );
    expect(near.queryKey).toContain("acme");
    expect(near.queryKey).toContain(48.8566);
    expect(near.queryKey).toContain(2.35222);

    expect(
      reverseGeocodeQueryOptions(provider, { lat: Number.NaN, lng: 2 }).enabled,
    ).toBe(false);
    expect(
      reverseGeocodeQueryOptions(provider, { lat: 1, lng: Infinity }).enabled,
    ).toBe(false);
  });

  it("queryFn forwards the abort signal to the provider", async () => {
    const { provider, reverse } = fakeProvider();
    const { signal } = new AbortController();
    await reverseGeocodeQueryOptions(provider, { lat: 1.5, lng: 2.5 }).queryFn({
      signal,
    });
    expect(reverse).toHaveBeenCalledWith(1.5, 2.5, { signal });
  });
});
