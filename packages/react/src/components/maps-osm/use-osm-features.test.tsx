import { OverpassError, type OverpassProvider } from "@chelone/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapsProvider } from "../maps/maps-provider";
import { waterRoadsAnswer as fixture } from "./__fixtures__/water-roads-answer";
import { useOsmFeatures } from "./use-osm-features";

const bbox: [number, number, number, number] = [2.29, 48.84, 2.31, 48.86];

afterEach(cleanup);

function fakeProvider(query: OverpassProvider["query"] = async () => fixture) {
  const spy = vi.fn<OverpassProvider["query"]>(query);
  const provider: OverpassProvider = { name: "fake", query: spy };
  return { provider, spy };
}

function setup(overpass?: OverpassProvider) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MapsProvider overpass={overpass}>{children}</MapsProvider>
    </QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useOsmFeatures", () => {
  it("is idle while the bbox is null or sources are empty", () => {
    const { provider, spy } = fakeProvider();
    const { wrapper } = setup();
    const noBbox = renderHook(
      () => useOsmFeatures(null, { presets: ["water"] }, { provider }),
      { wrapper },
    );
    const noSources = renderHook(
      () => useOsmFeatures(bbox, { presets: [], tags: [] }, { provider }),
      { wrapper },
    );
    expect(noBbox.result.current.fetchStatus).toBe("idle");
    expect(noSources.result.current.fetchStatus).toBe("idle");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns polygons once the bbox is set", async () => {
    const { provider } = fakeProvider();
    const { wrapper } = setup();
    const initialProps: { box: typeof bbox | null } = { box: null };
    const { result, rerender } = renderHook(
      ({ box }: typeof initialProps) =>
        useOsmFeatures(box, { presets: ["water"] }, { provider }),
      { wrapper, initialProps },
    );
    expect(result.current.data).toBeUndefined();
    rerender({ box: bbox });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.type).toBe("FeatureCollection");
    expect(result.current.data?.features.map((f) => f.properties?.id)).toEqual([
      "way/1001",
      "way/1002",
    ]);
  });

  it("reuses the cached answer for the same query", async () => {
    const { provider, spy } = fakeProvider();
    const { wrapper } = setup();
    const first = renderHook(
      () => useOsmFeatures(bbox, { presets: ["water"] }, { provider }),
      { wrapper },
    );
    await waitFor(() => expect(first.result.current.data).toBeDefined());
    const second = renderHook(
      () => useOsmFeatures(bbox, { presets: ["water"] }, { provider }),
      { wrapper },
    );
    await waitFor(() => expect(second.result.current.data).toBeDefined());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("surfaces an Overpass error", async () => {
    const { provider } = fakeProvider(async () => {
      throw new OverpassError("boom", 500);
    });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useOsmFeatures(bbox, { presets: ["water"] }, { provider }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(OverpassError);
  });

  it("takes the provider from MapsProvider and throws an error naming provider and MapsProvider when neither is set", async () => {
    const { provider, spy } = fakeProvider();
    const configured = setup(provider);
    const { result } = renderHook(
      () => useOsmFeatures(bbox, { presets: ["water"] }),
      { wrapper: configured.wrapper },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(spy).toHaveBeenCalledTimes(1);

    const bare = setup();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() =>
        renderHook(() => useOsmFeatures(bbox, { presets: ["water"] }), {
          wrapper: bare.wrapper,
        }),
      ).toThrowError(/provider.*MapsProvider|MapsProvider.*provider/s);
    } finally {
      error.mockRestore();
    }
  });
});
