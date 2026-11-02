/**
 * OsmFeatureOperator tests. `./osm-features` is mocked, so no test calls the
 * network; the geometry maths (`subtractMask`, `unionAll`) is the real one.
 */

import {
  createI18n,
  createNotificationStore,
  fakeDataProvider,
  type GeoFeature,
  type GeoPolygon,
  type MessageCatalog,
  mapMessages,
  type Notification,
  type OverpassProvider,
  OverpassRateLimitError,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import { MapsProvider } from "../maps/use-map";
import { OsmFeatureAdd, OsmFeatureSubtract } from "./osm-feature-operators";
import { fetchOsmFeatures } from "./osm-features";

vi.mock("./osm-features", () => ({ fetchOsmFeatures: vi.fn() }));

const fetchMock = vi.mocked(fetchOsmFeatures);

const mounted: VueWrapper[] = [];
beforeEach(() => {
  fetchMock.mockReset();
});
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const rect = (
  west: number,
  south: number,
  east: number,
  north: number,
): GeoPolygon => ({
  type: "Polygon",
  coordinates: [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ],
});

/** About 1.24 km², at the equator. */
const field = rect(0, 0, 0.01, 0.01);
const feature = (geometry: GeoPolygon): GeoFeature => ({
  type: "Feature",
  properties: {},
  geometry,
});
const collection = (...geometries: GeoPolygon[]) => ({
  type: "FeatureCollection" as const,
  features: geometries.map(feature),
});
/** Covers the right half of `field`. */
const rightHalf = rect(0.005, -1, 1, 1);
/** Covers all of `field`. */
const cover = rect(-1, -1, 1, 1);
/** Sits beside `field`, to its east. */
const neighbour = rect(0.01, 0, 0.02, 0.01);

const overpass: OverpassProvider = {
  name: "fake",
  query: async () => ({}),
};

const catalog: MessageCatalog = {
  ...mapMessages,
  "chelone.map.osm.subtracted": "Subtracted {area}",
};

/**
 * Mounts `operator` as the only input of a form with one `area` field, under
 * `MapsProvider` and `Admin`.
 */
async function setup(
  operator: () => VNode,
  initial: unknown = field,
  maps: { overpass?: OverpassProvider } = { overpass },
) {
  // Admin's toast drains the store, so keep what was pushed.
  const notifications = createNotificationStore();
  const pushed: Notification[] = [];
  notifications.subscribe(() => {
    for (const item of notifications.getSnapshot()) {
      if (!pushed.some((seen) => seen.id === item.id)) pushed.push(item);
    }
  });
  let form: UseFormReturn<{ area: unknown }> | undefined;
  const FormHost = defineComponent({
    setup() {
      form = useForm<{ area: unknown }>({
        record: { area: initial },
        onSubmit: async () => undefined,
      });
      return () => operator();
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(MapsProvider, { overpass: maps.overpass }, () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient(),
              i18n: createI18n({ locale: "en", messages: { en: catalog } }),
              notifications,
            },
            { default: () => h(FormHost) },
          ),
        );
    },
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  const state = () => {
    if (!form) throw new Error("form not mounted");
    return form.form.store.state;
  };
  const button = () => wrapper.get("button");
  return {
    wrapper,
    pushed: () =>
      pushed.map(({ message, type, messageArgs }) => ({
        message,
        type,
        messageArgs,
      })),
    button,
    value: () => state().values.area,
    dirty: () => state().fieldMeta.area?.isDirty ?? false,
    /** Sets the field from outside the operator, as another input on the form would. */
    set: async (value: unknown) => {
      form?.form.setFieldValue("area", value);
      await flushPromises();
    },
    click: async () => {
      await button().trigger("click");
      await flushPromises();
    },
  };
}

const subtract =
  (props: Record<string, unknown> = {}) =>
  () =>
    h(OsmFeatureSubtract, { source: "area", presets: ["water"], ...props });
const add =
  (props: Record<string, unknown> = {}) =>
  () =>
    h(OsmFeatureAdd, { source: "area", presets: ["buildings"], ...props });

describe("OsmFeatureSubtract", () => {
  it("warns and sends no request when there are no presets or tags", async () => {
    const m = await setup(subtract({ presets: undefined }));
    await m.click();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(m.pushed()).toEqual([
      {
        message: "chelone.map.osm.no_sources",
        type: "warning",
        messageArgs: undefined,
      },
    ]);
  });

  it("warns and sends no request when the polygon is empty", async () => {
    const empty = await setup(subtract(), null);
    await empty.click();
    expect(empty.pushed().map((n) => n.message)).toEqual([
      "chelone.map.osm.no_polygon",
    ]);

    const point = await setup(subtract(), {
      type: "Point",
      coordinates: [0, 0],
    });
    await point.click();
    expect(point.pushed()[0]).toMatchObject({
      message: "chelone.map.osm.no_polygon",
      type: "warning",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches with the polygon's bounds and writes the reduced polygon with the area notice", async () => {
    fetchMock.mockResolvedValue(collection(rightHalf));
    const m = await setup(subtract());
    await m.click();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, bbox, sources, options] = fetchMock.mock.calls[0] ?? [];
    expect(bbox).toEqual([0, 0, 0.01, 0.01]);
    expect(sources).toEqual({ presets: ["water"], tags: undefined });
    expect(options?.provider).toBe(overpass);

    expect(m.value()).toEqual(rect(0, 0, 0.005, 0.01));
    expect(m.pushed()).toEqual([
      {
        message: "chelone.map.osm.subtracted",
        type: "success",
        messageArgs: { area: "0.620 km²" },
      },
    ]);
  });

  it("tells the user when nothing matches and leaves the polygon alone", async () => {
    fetchMock.mockResolvedValue(collection());
    const m = await setup(subtract());
    await m.click();

    expect(m.value()).toEqual(field);
    expect(m.dirty()).toBe(false);
    expect(m.pushed()).toEqual([
      {
        message: "chelone.map.osm.no_match",
        type: "info",
        messageArgs: undefined,
      },
    ]);
  });

  it("clears the value and warns when the polygon is entirely covered", async () => {
    fetchMock.mockResolvedValue(collection(cover));
    const m = await setup(subtract());
    await m.click();

    expect(m.value()).toBeNull();
    expect(m.pushed().map((n) => [n.message, n.type])).toEqual([
      ["chelone.map.osm.covered", "warning"],
    ]);
  });

  it("shows the rate limit message for a 429 and the error message for another failure", async () => {
    fetchMock.mockRejectedValueOnce(new OverpassRateLimitError());
    const m = await setup(subtract());
    await m.click();
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    await m.click();

    expect(m.pushed().map((n) => [n.message, n.type])).toEqual([
      ["chelone.map.osm.rate_limited", "error"],
      ["chelone.map.osm.error", "error"],
    ]);
    expect(m.value()).toEqual(field);
    expect(m.button().element.disabled).toBe(false);
  });

  it("disables the button with a spinner while the request runs", async () => {
    let finish: (value: ReturnType<typeof collection>) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const m = await setup(subtract());
    expect(m.button().element.disabled).toBe(false);
    expect(m.button().find('[role="status"]').exists()).toBe(false);

    await m.click();
    expect(m.button().element.disabled).toBe(true);
    expect(m.button().find('[role="status"]').exists()).toBe(true);

    finish(collection());
    await flushPromises();
    expect(m.button().element.disabled).toBe(false);
    expect(m.button().find('[role="status"]').exists()).toBe(false);
  });

  it("takes the provider from MapsProvider and throws an error naming provider and MapsProvider when neither is set", async () => {
    const other: OverpassProvider = { name: "other", query: async () => ({}) };
    const providerOfLastCall = () => fetchMock.mock.lastCall?.[3].provider;
    fetchMock.mockResolvedValue(collection());

    await (await setup(subtract())).click();
    expect(providerOfLastCall()).toBe(overpass);

    // The prop wins over MapsProvider.
    await (await setup(subtract({ provider: other }))).click();
    expect(providerOfLastCall()).toBe(other);

    // The prop alone is enough.
    await (await setup(subtract({ provider: other }), field, {})).click();
    expect(providerOfLastCall()).toBe(other);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const quiet = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(setup(subtract(), field, {})).rejects.toThrow(
        /`provider`.*MapsProvider/,
      );
    } finally {
      quiet.mockRestore();
    }
  });

  it("aborts the request on unmount and writes nothing", async () => {
    let signal: AbortSignal | undefined;
    let finish: (value: ReturnType<typeof collection>) => void = () => {};
    fetchMock.mockImplementation((_client, _bbox, _sources, options) => {
      signal = options.signal;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const m = await setup(subtract());
    await m.click();
    expect(signal?.aborted).toBe(false);

    m.wrapper.unmount();
    expect(signal?.aborted).toBe(true);
    finish(collection(rightHalf));
    await flushPromises();
    expect(m.value()).toEqual(field);
    expect(m.pushed()).toEqual([]);
  });

  it("writes nothing when the polygon changed while the request ran", async () => {
    let finish: (value: ReturnType<typeof collection>) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const m = await setup(subtract());
    await m.click();
    const redrawn = rect(5, 5, 6, 6);
    await m.set(redrawn);
    finish(collection(rightHalf));
    await flushPromises();

    expect(m.value()).toEqual(redrawn);
    expect(m.pushed()).toEqual([]);
    expect(m.button().element.disabled).toBe(false);
  });

  it("ignores an AbortError", async () => {
    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));
    const m = await setup(subtract());
    await m.click();
    expect(m.pushed()).toEqual([]);
  });

  it("marks the form dirty after a write", async () => {
    fetchMock.mockResolvedValue(collection(rightHalf));
    const m = await setup(subtract());
    expect(m.dirty()).toBe(false);
    await m.click();
    expect(m.dirty()).toBe(true);
  });

  it("replaces the icon with the icon slot", async () => {
    const m = await setup(() =>
      h(
        OsmFeatureSubtract,
        { source: "area", presets: ["water"] },
        { icon: () => h("i", { "data-testid": "mine" }) },
      ),
    );
    expect(m.wrapper.find('[data-testid="mine"]').exists()).toBe(true);
    expect(m.button().find("svg").exists()).toBe(false);
  });
});

describe("OsmFeatureAdd", () => {
  it("writes the union and the added area", async () => {
    fetchMock.mockResolvedValue(collection(neighbour));
    const m = await setup(add());
    expect(m.button().text()).toBe("Add OpenStreetMap areas");
    await m.click();

    expect(m.value()).toEqual(rect(0, 0, 0.02, 0.01));
    expect(m.pushed()).toEqual([
      {
        message: "chelone.map.osm.added",
        type: "success",
        messageArgs: { area: "1.239 km²" },
      },
    ]);
  });

  it("tells the user when nothing matches", async () => {
    fetchMock.mockResolvedValue(collection());
    const m = await setup(add());
    await m.click();

    expect(m.value()).toEqual(field);
    expect(m.pushed().map((n) => [n.message, n.type])).toEqual([
      ["chelone.map.osm.no_match", "info"],
    ]);
  });
});
