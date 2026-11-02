/**
 * Maps display tests. jsdom has no WebGL, so `maplibre-gl` is the stand-in in
 * `__fixtures__/fake-maplibre.ts`; the tests mount components under the
 * provider and assert DOM and what the map was asked to do.
 */

import {
  createI18n,
  fakeDataProvider,
  mapMessages,
  rasterTileStyle,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h, ref, type VNode } from "vue";
import { provideCheloneContext } from "../../context";
import { provideRecordContext } from "../../record/record-context";
import {
  liveMaps,
  liveMarkers,
  maps,
  markers,
  resetFake,
} from "./__fixtures__/fake-maplibre";
import LatLngField, { type LatLngFieldProps } from "./lat-lng-field.vue";
import MapCanvas from "./map-canvas.vue";
import { MapMarker, MapsProvider, useMap } from "./use-map";

vi.mock("maplibre-gl", () => import("./__fixtures__/fake-maplibre"));

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

const mounted: { unmount(): void }[] = [];

beforeEach(resetFake);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

/** Mounts `content` under the Chelone context, with the catalog when given. */
function mountMaps(
  content: () => VNode | VNode[],
  options: {
    messages?: Record<string, string>;
    record?: Record<string, unknown>;
  } = {},
) {
  const i18n = options.messages
    ? createI18n({ locale: "en", messages: { en: options.messages } })
    : undefined;
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
        i18n,
      });
      if (options.record) provideRecordContext(options.record);
      return content;
    },
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

/** Lets the fake map's microtask `load` fire and Vue render what follows. */
const loaded = () => flushPromises();

describe("MapCanvas", () => {
  it("creates one map in the container with the style it is given", async () => {
    const wrapper = mountMaps(() => h(MapCanvas, { mapStyle: style }));
    await loaded();

    expect(maps).toHaveLength(1);
    const slot = wrapper.find('[data-slot="map-canvas"]');
    expect(slot.exists()).toBe(true);
    expect(maps[0]?.options.container).toBe(slot.element);
    expect(maps[0]?.options.style).toEqual(style);
  });

  it("passes a style URL through when mapStyle is a string", async () => {
    mountMaps(() =>
      h(MapCanvas, { mapStyle: "https://styles.example.test/a.json" }),
    );
    await loaded();

    expect(maps[0]?.options.style).toBe("https://styles.example.test/a.json");
  });

  it("takes the style from MapsProvider and lets the mapStyle prop win", async () => {
    const fromProvider = rasterTileStyle({
      tileUrl: "https://provider.example.test/{z}/{x}/{y}.png",
      attribution: "Provider",
    });
    mountMaps(() =>
      h(MapsProvider, { mapStyle: fromProvider }, () => [
        h(MapCanvas),
        h(MapCanvas, { mapStyle: "https://styles.example.test/own.json" }),
      ]),
    );
    await loaded();

    expect(maps.map((map) => map.options.style)).toEqual([
      fromProvider,
      "https://styles.example.test/own.json",
    ]);
  });

  it("throws an error naming mapStyle and MapsProvider when neither is set", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(() => mountMaps(() => h(MapCanvas))).toThrowError(
        /mapStyle.*MapsProvider|MapsProvider.*mapStyle/s,
      );
    } finally {
      warn.mockRestore();
    }
    expect(maps).toHaveLength(0);
  });

  it("passes center to MapLibre as lng, lat", async () => {
    mountMaps(() =>
      h(MapCanvas, { mapStyle: style, center: [48.85, 2.35], zoom: 9 }),
    );
    await loaded();

    expect(maps[0]?.options.center).toEqual([2.35, 48.85]);
    expect(maps[0]?.options.zoom).toBe(9);
  });

  it("defaults to the origin at zoom 13 and 300 pixels high", async () => {
    const wrapper = mountMaps(() => h(MapCanvas, { mapStyle: style }));
    await loaded();

    expect(maps[0]?.options.center).toEqual([0, 0]);
    expect(maps[0]?.options.zoom).toBe(13);
    expect(
      wrapper.get<HTMLElement>('[data-slot="map-canvas"]').element.style.height,
    ).toBe("300px");
  });

  it("takes a CSS length for height", async () => {
    const wrapper = mountMaps(() =>
      h(MapCanvas, { mapStyle: style, height: "20rem" }),
    );
    await loaded();

    expect(
      wrapper.get<HTMLElement>('[data-slot="map-canvas"]').element.style.height,
    ).toBe("20rem");
  });

  it("renders its slot only after the load event", async () => {
    const wrapper = mountMaps(() =>
      h(MapCanvas, { mapStyle: style }, () => h("p", "child")),
    );
    expect(wrapper.text()).not.toContain("child");

    await loaded();
    expect(wrapper.text()).toContain("child");
  });

  it("shows the load error panel when the style fails before load", async () => {
    const wrapper = mountMaps(
      () =>
        h(
          MapCanvas,
          { mapStyle: "https://styles.example.test/missing.json" },
          () => h("p", "child"),
        ),
      { messages: mapMessages as unknown as Record<string, string> },
    );
    maps[0]?.emit("error", { error: new Error("404") });
    await loaded();

    expect(wrapper.get('[data-slot="map-canvas-error"]').text()).toBe(
      "The map could not be loaded",
    );
    expect(wrapper.text()).not.toContain("child");
  });

  it("falls back to the default text when no catalog has the load error key", async () => {
    const wrapper = mountMaps(() => h(MapCanvas, { mapStyle: style }));
    maps[0]?.emit("error", { error: new Error("blocked") });
    await loaded();

    expect(wrapper.get('[data-slot="map-canvas-error"]').text()).toBe(
      "The map could not be loaded",
    );
  });

  it("keeps the map after an error once loaded", async () => {
    const wrapper = mountMaps(() =>
      h(MapCanvas, { mapStyle: style }, () => h("p", "child")),
    );
    await loaded();
    maps[0]?.emit("error", { error: new Error("one tile 404") });
    await loaded();

    expect(wrapper.text()).toContain("child");
    expect(wrapper.find('[data-slot="map-canvas-error"]').exists()).toBe(false);
  });

  it("removes its map on unmount", async () => {
    const wrapper = mountMaps(() =>
      h(MapCanvas, { mapStyle: style }, () => h("p", "child")),
    );
    await loaded();
    expect(liveMaps()).toHaveLength(1);

    wrapper.unmount();
    expect(liveMaps()).toHaveLength(0);
  });

  it("turns scroll zoom off when scrollZoom is false", async () => {
    mountMaps(() => [
      h(MapCanvas, { mapStyle: style, scrollZoom: false }),
      h(MapCanvas, { mapStyle: style }),
    ]);
    await loaded();

    expect(maps[0]?.options.scrollZoom).toBe(false);
    expect(maps[1]?.options.scrollZoom).toBe(true);
  });

  it("passes class to the container", async () => {
    const wrapper = mountMaps(() =>
      h(MapCanvas, { mapStyle: style, class: "rounded-xl" }),
    );
    await loaded();

    expect(
      wrapper
        .get('[data-slot="map-canvas"]')
        .element.classList.contains("rounded-xl"),
    ).toBe(true);
  });
});

describe("useMap", () => {
  const probe = (seen: { map?: unknown }): Component =>
    defineComponent({
      setup() {
        seen.map = useMap();
        return () => null;
      },
    });

  it("throws outside a MapCanvas", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(() => mountMaps(() => h(probe({})))).toThrowError(/MapCanvas/);
    } finally {
      warn.mockRestore();
    }
  });

  it("returns the map to the slot", async () => {
    const seen: { map?: unknown } = {};
    mountMaps(() => h(MapCanvas, { mapStyle: style }, () => h(probe(seen))));
    await loaded();

    expect(seen.map).toBe(maps[0]);
  });
});

describe("MapMarker", () => {
  it("places a marker at lng, lat and moves it when position changes", async () => {
    const position = ref<[number, number]>([48.85, 2.35]);
    mountMaps(() =>
      h(MapCanvas, { mapStyle: style }, () =>
        h(MapMarker, { position: position.value }),
      ),
    );
    await loaded();

    expect(markers).toHaveLength(1);
    expect(markers[0]?.map).toBe(maps[0]);
    expect(markers[0]?.lngLats.at(-1)).toEqual([2.35, 48.85]);
    expect(markers[0]?.options.anchor).toBe("bottom");
    expect(markers[0]?.getElement().querySelector("svg")).not.toBeNull();

    position.value = [40.7, -74];
    await flushPromises();
    expect(markers).toHaveLength(1);
    expect(markers[0]?.lngLats.at(-1)).toEqual([-74, 40.7]);
  });

  it("removes the marker on unmount", async () => {
    const shown = ref(true);
    mountMaps(() =>
      h(MapCanvas, { mapStyle: style }, () =>
        shown.value ? h(MapMarker, { position: [1, 2] }) : null,
      ),
    );
    await loaded();
    expect(liveMarkers()).toHaveLength(1);

    shown.value = false;
    await flushPromises();
    expect(liveMarkers()).toHaveLength(0);
  });

  it("makes the marker draggable on request", async () => {
    mountMaps(() =>
      h(MapCanvas, { mapStyle: style }, () =>
        h(MapMarker, { position: [1, 2], draggable: true }),
      ),
    );
    await loaded();

    expect(markers[0]?.draggable).toBe(true);
  });

  it("emits dragEnd with lat and lng", async () => {
    const onDragEnd = vi.fn();
    mountMaps(() =>
      h(MapCanvas, { mapStyle: style }, () =>
        h(MapMarker, { position: [1, 2], draggable: true, onDragEnd }),
      ),
    );
    await loaded();

    markers[0]?.dragTo(2.35, 48.85);
    expect(onDragEnd).toHaveBeenCalledExactlyOnceWith(48.85, 2.35);
  });
});

describe("LatLngField", () => {
  const field = (props: Partial<LatLngFieldProps> = {}) =>
    h(LatLngField, {
      latSource: "lat",
      lngSource: "lng",
      mapStyle: style,
      record: { lat: 48.85, lng: 2.35 },
      ...props,
    });

  it("marks the record's coordinates", async () => {
    const wrapper = mountMaps(() => field());
    await loaded();

    expect(wrapper.find('[data-slot="lat-lng-field"]').exists()).toBe(true);
    expect(maps).toHaveLength(1);
    expect(maps[0]?.options.center).toEqual([2.35, 48.85]);
    expect(maps[0]?.options.scrollZoom).toBe(false);
    expect(liveMarkers()).toHaveLength(1);
    expect(markers[0]?.lngLats.at(-1)).toEqual([2.35, 48.85]);
  });

  it("reads numeric strings, as a backend may send them", async () => {
    mountMaps(() => field({ record: { lat: "48.85", lng: "2.35" } }));
    await loaded();

    expect(markers[0]?.lngLats.at(-1)).toEqual([2.35, 48.85]);
  });

  it("treats 0, 0 as a position", async () => {
    const wrapper = mountMaps(() => field({ record: { lat: 0, lng: 0 } }));
    await loaded();

    expect(wrapper.find('[data-slot="lat-lng-field-empty"]').exists()).toBe(
      false,
    );
    expect(markers[0]?.lngLats.at(-1)).toEqual([0, 0]);
  });

  it("follows the ambient record when its coordinates change", async () => {
    const record = ref<Record<string, unknown>>({ lat: 48.85, lng: 2.35 });
    const Harness = defineComponent({
      setup() {
        provideRecordContext(record);
        return () => field({ record: undefined });
      },
    });
    mountMaps(() => h(Harness));
    await loaded();

    record.value = { lat: 40.7, lng: -74 };
    await loaded();

    expect(liveMaps()).toHaveLength(1);
    expect(maps.at(-1)?.options.center).toEqual([-74, 40.7]);
    expect(liveMarkers()).toHaveLength(1);
  });

  it.each([
    ["null", { lat: null, lng: 2.35 }],
    ["undefined", { lat: 48.85 }],
    ["NaN", { lat: Number.NaN, lng: 2.35 }],
    ["text", { lat: "north", lng: 2.35 }],
    ["a latitude above 90", { lat: 95, lng: 2.35 }],
    ["a latitude below -90", { lat: -120, lng: 2.35 }],
    ["a longitude above 180", { lat: 48.85, lng: 200 }],
    ["a longitude below -180", { lat: 48.85, lng: -181 }],
  ])("shows the translated empty text for %s", (_label, record) => {
    const wrapper = mountMaps(() => field({ record }), {
      messages: mapMessages as unknown as Record<string, string>,
    });

    expect(wrapper.get('[data-slot="lat-lng-field-empty"]').text()).toBe(
      "No coordinates",
    );
    expect(maps).toHaveLength(0);
  });

  it("falls back to the default text when no catalog has the key", () => {
    const wrapper = mountMaps(() =>
      field({ record: { lat: null, lng: null } }),
    );

    expect(wrapper.get('[data-slot="lat-lng-field-empty"]').text()).toBe(
      "No coordinates available",
    );
  });

  it("prefers a record prop over the ambient record", async () => {
    mountMaps(
      () => [
        field({ record: { lat: 1, lng: 2 } }),
        field({ record: undefined }),
      ],
      { record: { lat: 10, lng: 20 } },
    );
    await loaded();

    expect(maps.map((map) => map.options.center)).toEqual([
      [2, 1],
      [20, 10],
    ]);
  });
});
