/**
 * useOsmFeatures tests. The composable runs inside a component under the
 * query client, with a fake `OverpassProvider`, so no test touches the network.
 */

import { OverpassError, type OverpassProvider } from "@chelone/core";
import { QueryClient, VUE_QUERY_CLIENT } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, provide, ref } from "vue";
import { MapsProvider } from "../maps/use-map";
import { waterRoadsAnswer as fixture } from "./__fixtures__/water-roads-answer";
import { useOsmFeatures } from "./use-osm-features";

type Box = [number, number, number, number];
const bbox: Box = [2.29, 48.84, 2.31, 48.86];

function fakeProvider(query: OverpassProvider["query"] = async () => fixture) {
  const spy = vi.fn<OverpassProvider["query"]>(query);
  return { provider: { name: "fake", query: spy } as OverpassProvider, spy };
}

const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Runs `use` in a component's setup under the client and `MapsProvider`. */
function run<T>(
  use: () => T,
  {
    client = newClient(),
    overpass,
  }: { client?: QueryClient; overpass?: OverpassProvider } = {},
) {
  let result!: T;
  const Probe = defineComponent({
    setup() {
      result = use();
      return () => null;
    },
  });
  const wrapper = mount(
    defineComponent({
      setup() {
        provide(VUE_QUERY_CLIENT, client);
        return () => h(MapsProvider, { overpass }, () => h(Probe));
      },
    }),
  );
  return { result, wrapper, client };
}

describe("useOsmFeatures", () => {
  it("follows a changed overpass prop of MapsProvider", async () => {
    const a = fakeProvider();
    const b = fakeProvider();
    const overpass = ref<OverpassProvider>(a.provider);
    const box = ref<Box>(bbox);
    let result!: ReturnType<typeof useOsmFeatures>;
    const Probe = defineComponent({
      setup() {
        result = useOsmFeatures(box, { presets: ["water"] });
        return () => null;
      },
    });
    mount(
      defineComponent({
        setup() {
          provide(VUE_QUERY_CLIENT, newClient());
          return () =>
            h(MapsProvider, { overpass: overpass.value }, () => h(Probe));
        },
      }),
    );
    await vi.waitFor(() => expect(result.data.value).toBeDefined());
    overpass.value = b.provider;
    box.value = [2.3, 48.85, 2.32, 48.87];
    await vi.waitFor(() => expect(b.spy).toHaveBeenCalledTimes(1));
    expect(a.spy).toHaveBeenCalledTimes(1);
  });

  it("is idle while the bbox is null or sources are empty", async () => {
    const { provider, spy } = fakeProvider();
    const noBbox = run(() =>
      useOsmFeatures(null, { presets: ["water"] }, { provider }),
    );
    const noSources = run(() =>
      useOsmFeatures(bbox, { presets: [], tags: [] }, { provider }),
    );
    await flushPromises();
    expect(noBbox.result.fetchStatus.value).toBe("idle");
    expect(noSources.result.fetchStatus.value).toBe("idle");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns polygons once the bbox ref is set", async () => {
    const { provider } = fakeProvider();
    const box = ref<Box | null>(null);
    const { result } = run(() =>
      useOsmFeatures(box, { presets: ["water"] }, { provider }),
    );
    await flushPromises();
    expect(result.data.value).toBeUndefined();
    box.value = bbox;
    await nextTick();
    await vi.waitFor(() => expect(result.data.value).toBeDefined());
    expect(result.data.value?.type).toBe("FeatureCollection");
    expect(result.data.value?.features.map((f) => f.properties?.id)).toEqual([
      "way/1001",
      "way/1002",
    ]);
  });

  it("takes getters for the bbox and sources", async () => {
    const { provider, spy } = fakeProvider();
    const sources = ref<{ presets: ("water" | "buildings")[] }>({
      presets: [],
    });
    const { result } = run(() =>
      useOsmFeatures(
        () => bbox,
        () => sources.value,
        { provider },
      ),
    );
    await flushPromises();
    expect(spy).not.toHaveBeenCalled();
    sources.value = { presets: ["water"] };
    await vi.waitFor(() => expect(result.data.value).toBeDefined());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("stays idle when enabled is false", async () => {
    const { provider, spy } = fakeProvider();
    const { result } = run(() =>
      useOsmFeatures(
        bbox,
        { presets: ["water"] },
        { provider, enabled: false },
      ),
    );
    await flushPromises();
    expect(result.fetchStatus.value).toBe("idle");
    expect(spy).not.toHaveBeenCalled();
  });

  it("refetches an answer older than staleTime", async () => {
    const { provider, spy } = fakeProvider();
    const client = newClient();
    const options = { provider, staleTime: 0 };
    const first = run(
      () => useOsmFeatures(bbox, { presets: ["water"] }, options),
      { client },
    );
    await vi.waitFor(() => expect(first.result.data.value).toBeDefined());
    run(() => useOsmFeatures(bbox, { presets: ["water"] }, options), {
      client,
    });
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it("reuses the cached answer for the same query", async () => {
    const { provider, spy } = fakeProvider();
    const client = newClient();
    const first = run(
      () => useOsmFeatures(bbox, { presets: ["water"] }, { provider }),
      { client },
    );
    await vi.waitFor(() => expect(first.result.data.value).toBeDefined());
    const second = run(
      () => useOsmFeatures(bbox, { presets: ["water"] }, { provider }),
      { client },
    );
    await vi.waitFor(() => expect(second.result.data.value).toBeDefined());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("surfaces an Overpass error", async () => {
    const { provider } = fakeProvider(async () => {
      throw new OverpassError("boom", 500);
    });
    const { result } = run(() =>
      useOsmFeatures(bbox, { presets: ["water"] }, { provider }),
    );
    await vi.waitFor(() => expect(result.isError.value).toBe(true));
    expect(result.error.value).toBeInstanceOf(OverpassError);
  });

  it("takes the provider from MapsProvider and throws an error naming provider and MapsProvider when neither is set", async () => {
    const { provider, spy } = fakeProvider();
    const configured = run(() => useOsmFeatures(bbox, { presets: ["water"] }), {
      overpass: provider,
    });
    await vi.waitFor(() => expect(configured.result.data.value).toBeDefined());
    expect(spy).toHaveBeenCalledTimes(1);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(() =>
        run(() => useOsmFeatures(bbox, { presets: ["water"] })),
      ).toThrowError(/provider.*MapsProvider|MapsProvider.*provider/s);
    } finally {
      warn.mockRestore();
    }
  });
});
