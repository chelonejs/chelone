/**
 * MapWithSearch tests. `maplibre-gl` is the stand-in in
 * `../maps/__fixtures__/fake-maplibre.ts`; the geocoder is a fake provider, so
 * no test touches the network. A click on the map is `map.emit("click", ...)`.
 */

import {
  createI18n,
  fakeDataProvider,
  type GeocodeResult,
  type GeocodingProvider,
  mapMessages,
  rasterTileStyle,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import {
  liveMarkers,
  maps,
  resetFake,
} from "../maps/__fixtures__/fake-maplibre";
import { MapsProvider } from "../maps/use-map";
import MapWithSearch, { type MapWithSearchProps } from "./map-with-search.vue";

vi.mock("maplibre-gl", () => import("../maps/__fixtures__/fake-maplibre"));

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

type Place = {
  address: string;
  latitude: number | null;
  longitude: number | null;
};

const paris: GeocodeResult = {
  displayName: "Paris, France",
  lat: 48.8566,
  lng: 2.3522,
  type: "city",
};
const street: GeocodeResult = {
  displayName: "1 Rue de Rivoli",
  lat: 1,
  lng: 2,
};

function fakeProvider(
  reverse: GeocodingProvider["reverse"] = async () => street,
) {
  const search = vi.fn<GeocodingProvider["search"]>(async () => [paris]);
  const reverseSpy = vi.fn(reverse);
  const provider: GeocodingProvider = {
    name: "fake",
    search,
    reverse: reverseSpy,
  };
  return { provider, reverse: reverseSpy };
}

const mounted: VueWrapper[] = [];

beforeEach(resetFake);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function setup(
  provider: GeocodingProvider,
  props: Partial<MapWithSearchProps> = {},
  record: Place = { address: "", latitude: 48.85, longitude: 2.35 },
) {
  let form: UseFormReturn<Place> | undefined;
  const FormHost = defineComponent({
    setup() {
      form = useForm<Place>({ record, onSubmit: async () => undefined });
      return () =>
        h(MapWithSearch, {
          latSource: "latitude",
          lngSource: "longitude",
          addressSource: "address",
          provider,
          ...props,
        });
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(MapsProvider, { mapStyle: style }, () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient(),
              i18n: createI18n({
                locale: "en",
                messages: { en: mapMessages },
              }),
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
  return {
    wrapper,
    saved: () => ({ ...form?.form.store.state.values }) as Place,
  };
}

const map = () => {
  const found = maps[0];
  if (!found) throw new Error("no map");
  return found;
};
const click = async (lat: number, lng: number) => {
  map().emit("click", { lngLat: { lat, lng } });
  await flushPromises();
};
const address = (wrapper: VueWrapper) =>
  wrapper.get<HTMLInputElement>('[role="combobox"]');
const searchFor = async (wrapper: VueWrapper, text: string) => {
  await address(wrapper).setValue(text);
  await address(wrapper).trigger("keydown", { key: "Enter" });
  await flushPromises();
};

describe("MapWithSearch", () => {
  it("recentres the marker when a result is picked and does not reverse-geocode", async () => {
    const { provider, reverse } = fakeProvider();
    const { wrapper, saved } = await setup(provider);

    await searchFor(wrapper, "Paris");
    await wrapper.get('[role="option"]').trigger("click");
    await flushPromises();

    expect(saved()).toEqual({
      address: "Paris, France",
      latitude: 48.8566,
      longitude: 2.3522,
    });
    expect(liveMarkers().at(-1)?.getLngLat()).toEqual({
      lng: 2.3522,
      lat: 48.8566,
    });
    expect(map().eases.at(-1)).toMatchObject({ center: [2.3522, 48.8566] });
    expect(reverse).not.toHaveBeenCalled();
    expect(address(wrapper).element.value).toBe("Paris, France");
  });

  it("writes the address after a map click", async () => {
    const { provider, reverse } = fakeProvider();
    const { wrapper, saved } = await setup(provider);

    await click(10.1234567, 20.5);

    expect(reverse).toHaveBeenCalledTimes(1);
    expect(reverse.mock.calls[0]?.slice(0, 2)).toEqual([10.123457, 20.5]);
    expect(saved().address).toBe("1 Rue de Rivoli");
    expect(address(wrapper).element.value).toBe("1 Rue de Rivoli");
  });

  it("keeps the address when the reverse geocode returns null", async () => {
    const { provider, reverse } = fakeProvider(async () => null);
    const { saved } = await setup(
      provider,
      {},
      {
        address: "Home",
        latitude: 1,
        longitude: 1,
      },
    );

    await click(5, 6);

    expect(reverse).toHaveBeenCalledTimes(1);
    expect(saved()).toEqual({ address: "Home", latitude: 5, longitude: 6 });
  });

  it("keeps the address when the reverse geocode fails", async () => {
    const { provider } = fakeProvider(async () => {
      throw new Error("offline");
    });
    const { saved } = await setup(
      provider,
      {},
      {
        address: "Home",
        latitude: 1,
        longitude: 1,
      },
    );

    await click(5, 6);

    expect(saved().address).toBe("Home");
  });

  it("does not reverse-geocode on mount", async () => {
    const { provider, reverse } = fakeProvider();
    const { saved } = await setup(
      provider,
      {},
      {
        address: "Home",
        latitude: 1,
        longitude: 1,
      },
    );
    await flushPromises();

    expect(reverse).not.toHaveBeenCalled();
    expect(saved().address).toBe("Home");
  });

  it("ignores a reverse geocode answer that a newer click has replaced", async () => {
    const pending: ((result: GeocodeResult) => void)[] = [];
    const { provider, reverse } = fakeProvider(
      () => new Promise<GeocodeResult>((resolve) => pending.push(resolve)),
    );
    const { saved } = await setup(provider);

    await click(10, 10);
    await click(20, 20);
    expect(reverse).toHaveBeenCalledTimes(2);

    pending[1]?.({ displayName: "Second", lat: 20, lng: 20 });
    await flushPromises();
    pending[0]?.({ displayName: "First", lat: 10, lng: 10 });
    await flushPromises();

    expect(saved().address).toBe("Second");
  });

  it("ignores a reverse geocode answer that arrives after a result is picked", async () => {
    let answer: (result: GeocodeResult) => void = () => {};
    const { provider } = fakeProvider(
      () => new Promise<GeocodeResult>((resolve) => (answer = resolve)),
    );
    const { wrapper, saved } = await setup(provider);

    await click(10, 10);
    await searchFor(wrapper, "Paris");
    await wrapper.get('[role="option"]').trigger("click");
    await flushPromises();
    answer({ displayName: "Late", lat: 10, lng: 10 });
    await flushPromises();

    expect(saved().address).toBe("Paris, France");
  });
});
