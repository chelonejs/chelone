/**
 * ReverseGeocodeField tests, with a fake `GeocodingProvider`: no test touches
 * the network.
 */

import {
  fakeDataProvider,
  type GeocodeResult,
  type GeocodingProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { MapsProvider } from "../maps/use-map";
import ReverseGeocodeField, {
  type ReverseGeocodeFieldProps,
} from "./reverse-geocode-field.vue";

const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const address: GeocodeResult = {
  displayName: "10 Rue de Rivoli, Paris, Île-de-France, France",
  lat: 48.8566,
  lng: 2.3522,
  type: "house",
};

function fakeProvider(reverse: GeocodingProvider["reverse"]) {
  const spy = vi.fn<GeocodingProvider["reverse"]>(reverse);
  const provider: GeocodingProvider = {
    name: "fake",
    search: async () => [],
    reverse: spy,
  };
  return { provider, reverse: spy };
}

async function show(
  props: Partial<ReverseGeocodeFieldProps> = {},
  record: Record<string, unknown> = { lat: 48.8566, lng: 2.3522 },
  geocoder?: GeocodingProvider,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(MapsProvider, { geocoder }, () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient(),
            },
            {
              default: () =>
                h(ReverseGeocodeField, {
                  latSource: "lat",
                  lngSource: "lng",
                  record,
                  ...props,
                }),
            },
          ),
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
}

const root = (wrapper: VueWrapper) =>
  wrapper.find('[data-slot="reverse-geocode-field"]');

describe("ReverseGeocodeField", () => {
  it("shows the full name, the street and the city", async () => {
    const { provider, reverse } = fakeProvider(async () => address);

    const full = await show({ provider });
    expect(root(full).text()).toBe(address.displayName);
    expect(reverse.mock.calls[0]?.slice(0, 2)).toEqual([48.8566, 2.3522]);

    const street = await show({ provider, format: "street" });
    expect(root(street).text()).toBe("10 Rue de Rivoli");

    const city = await show({ provider, format: "city" });
    expect(root(city).text()).toBe("10 Rue de Rivoli, Paris");
  });

  it("shows a skeleton while loading", async () => {
    let finish: (value: GeocodeResult) => void = () => {};
    const { provider } = fakeProvider(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    const wrapper = await show({ provider });
    expect(root(wrapper).find('[data-slot="skeleton"]').exists()).toBe(true);
    expect(root(wrapper).text()).toBe("");

    finish(address);
    await flushPromises();
    expect(root(wrapper).text()).toBe(address.displayName);
    expect(root(wrapper).find('[data-slot="skeleton"]').exists()).toBe(false);
  });

  it("falls back to rounded coordinates when the provider returns null", async () => {
    const { provider } = fakeProvider(async () => null);

    const wrapper = await show({ provider }, { lat: 48.856614, lng: 2.352222 });

    expect(root(wrapper).text()).toBe("48.8566, 2.3522");
  });

  it("renders nothing without coordinates and calls no provider", async () => {
    const { provider, reverse } = fakeProvider(async () => address);

    const half = await show({ provider }, { lat: 48.8566, lng: null });
    expect(root(half).exists()).toBe(false);

    const none = await show({ provider }, {});
    expect(root(none).exists()).toBe(false);
    expect(reverse).not.toHaveBeenCalled();
  });

  it("takes the geocoder from MapsProvider and throws an error naming provider and MapsProvider when neither is set", async () => {
    const { provider, reverse } = fakeProvider(async () => address);
    await show({}, { lat: 1, lng: 2 }, provider);
    expect(reverse).toHaveBeenCalledTimes(1);

    const quiet = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(show({}, { lat: 1, lng: 2 })).rejects.toThrow(
        /`provider`.*MapsProvider/,
      );
    } finally {
      quiet.mockRestore();
    }
  });
});
