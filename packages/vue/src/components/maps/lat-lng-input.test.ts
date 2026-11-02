/**
 * LatLngInput tests. jsdom has no WebGL, so `maplibre-gl` is the stand-in in
 * `__fixtures__/fake-maplibre.ts`. Tests mount the input in a form under
 * `<Admin>` and the maps provider, type into the text fields and fire map
 * events as MapLibre would, then assert the DOM, the form's saved data and what
 * the map was asked to do.
 */

import {
  createI18n,
  fakeDataProvider,
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
import { liveMarkers, maps, resetFake } from "./__fixtures__/fake-maplibre";
import LatLngInput, { type LatLngInputProps } from "./lat-lng-input.vue";
import { MapsProvider } from "./use-map";

vi.mock("maplibre-gl", () => import("./__fixtures__/fake-maplibre"));

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

const mounted: VueWrapper[] = [];

beforeEach(resetFake);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

type Coordinates = { latitude: number | null; longitude: number | null };

async function setup(
  props: Partial<LatLngInputProps> & {
    onPositionChange?: (lat: number, lng: number) => void;
  } = {},
  record: Coordinates = { latitude: 48.85, longitude: 2.35 },
  { loaded = true }: { loaded?: boolean } = {},
) {
  const onSubmit = vi.fn(async (_data: Coordinates) => undefined);
  let form: UseFormReturn<Coordinates> | undefined;
  const FormHost = defineComponent({
    setup() {
      form = useForm<Coordinates>({ record, onSubmit });
      return () =>
        h(LatLngInput, {
          latSource: "latitude",
          lngSource: "longitude",
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
  // Lets the fake map's microtask `load` fire and Vue render what follows.
  if (loaded) await flushPromises();
  const current = () => {
    if (!form) throw new Error("form not mounted");
    return form;
  };
  return {
    wrapper,
    onSubmit,
    form: current,
    submit: async () => {
      await current().submit();
      await flushPromises();
    },
    map: () => {
      const map = maps[0];
      if (!map) throw new Error("no map");
      return map;
    },
  };
}

const field = (wrapper: VueWrapper, label: string) => {
  const input = wrapper
    .findAll("label")
    .find((l) => l.text().startsWith(label))
    ?.attributes("for");
  const element = wrapper.find(`input[id="${input}"]`);
  if (!element.exists()) throw new Error(`no field labelled ${label}`);
  return element;
};
const latField = (wrapper: VueWrapper) => field(wrapper, "Latitude");
const lngField = (wrapper: VueWrapper) => field(wrapper, "Longitude");
const textOf = (input: ReturnType<typeof latField>) =>
  (input.element as HTMLInputElement).value;

describe("LatLngInput", () => {
  it("shows the record's coordinates in both text fields and one marker", async () => {
    const { wrapper } = await setup();

    expect(textOf(latField(wrapper))).toBe("48.85");
    expect(textOf(lngField(wrapper))).toBe("2.35");
    expect(latField(wrapper).attributes("inputmode")).toBe("decimal");
    expect(wrapper.find('[data-slot="lat-lng-input"]').exists()).toBe(true);
    expect(liveMarkers()).toHaveLength(1);
    expect(liveMarkers()[0]?.getLngLat()).toEqual({ lng: 2.35, lat: 48.85 });
  });

  it("shows no marker while either coordinate is empty", async () => {
    const { wrapper, map } = await setup(
      { defaultPosition: [10, 20] },
      { latitude: 48.85, longitude: null },
    );

    expect(liveMarkers()).toHaveLength(0);
    expect(map().options.center).toEqual([20, 10]);

    await lngField(wrapper).setValue("2.35");
    expect(liveMarkers()).toHaveLength(1);

    await latField(wrapper).setValue("");
    expect(liveMarkers()).toHaveLength(0);
  });

  it("writes both fields when the map is clicked", async () => {
    const { wrapper, map, submit, onSubmit } = await setup();

    map().emit("click", { lngLat: { lng: 10.5, lat: 20.25 } });
    await flushPromises();

    expect(textOf(latField(wrapper))).toBe("20.25");
    expect(textOf(lngField(wrapper))).toBe("10.5");
    expect(liveMarkers()[0]?.getLngLat()).toEqual({ lng: 10.5, lat: 20.25 });
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ latitude: 20.25, longitude: 10.5 });
  });

  it("writes both fields when the marker is dragged", async () => {
    const { wrapper, submit, onSubmit } = await setup();

    liveMarkers()[0]?.dragTo(-3.5, 40.5);
    await flushPromises();

    expect(textOf(latField(wrapper))).toBe("40.5");
    expect(textOf(lngField(wrapper))).toBe("-3.5");
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ latitude: 40.5, longitude: -3.5 });
  });

  it("rounds a map click to 6 decimals", async () => {
    const { wrapper, map } = await setup();

    map().emit("click", {
      lngLat: { lng: 2.123456789123, lat: 48.987654321987 },
    });
    await flushPromises();

    expect(textOf(latField(wrapper))).toBe("48.987654");
    expect(textOf(lngField(wrapper))).toBe("2.123457");
  });

  it("marks the form dirty and the fields touched after a map click", async () => {
    const { form, map } = await setup();
    const state = () => form().form.store.state;
    expect(state().isDirty).toBe(false);
    expect(state().fieldMeta.latitude?.isTouched).toBeFalsy();

    map().emit("click", { lngLat: { lng: 1, lat: 2 } });
    await flushPromises();

    expect(state().isDirty).toBe(true);
    expect(state().fieldMeta.latitude?.isTouched).toBe(true);
    expect(state().fieldMeta.longitude?.isTouched).toBe(true);
  });

  it("stores null for an empty text field and 0 for a typed 0", async () => {
    const { wrapper, submit, onSubmit } = await setup();

    await latField(wrapper).setValue("");
    await lngField(wrapper).setValue("0");
    await submit();

    expect(onSubmit).toHaveBeenCalledWith({ latitude: null, longitude: 0 });
  });

  it("shows the latitude error for 91 and the longitude error for -181", async () => {
    const { wrapper, submit, onSubmit } = await setup();

    await latField(wrapper).setValue("91");
    await lngField(wrapper).setValue("-181");
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();

    const owner = (input: ReturnType<typeof latField>) =>
      input.element.closest("[data-slot='field']")?.textContent ?? "";
    expect(owner(latField(wrapper))).toContain(
      "Must be a latitude between -90 and 90",
    );
    expect(owner(lngField(wrapper))).toContain(
      "Must be a longitude between -180 and 180",
    );
    expect(owner(latField(wrapper))).not.toContain("longitude");
    expect(latField(wrapper).attributes("aria-invalid")).toBe("true");
    // An out-of-range pair draws no marker: MapLibre throws on one.
    expect(liveMarkers()).toHaveLength(0);
  });

  it("runs latValidate after the range check", async () => {
    const latValidate = vi.fn((value: unknown) =>
      value === 45 ? "No 45 here" : undefined,
    );
    const { wrapper, submit } = await setup({ latValidate });

    await latField(wrapper).setValue("91");
    await submit();
    expect(wrapper.text()).toContain("Must be a latitude between -90 and 90");
    expect(wrapper.text()).not.toContain("No 45 here");

    await latField(wrapper).setValue("45");
    await submit();
    expect(wrapper.text()).toContain("No 45 here");
    // The range check failed first for 91, so latValidate never saw it.
    expect(latValidate.mock.calls.map(([value]) => value)).not.toContain(91);
    expect(latValidate.mock.calls.map(([value]) => value)).toContain(45);
  });

  it("recentres the map when the form sets the values", async () => {
    const { wrapper, map, form } = await setup();
    expect(map().eases).toEqual([]);

    form().reset({ latitude: 10, longitude: 20 });
    await flushPromises();
    expect(map().eases).toEqual([{ center: [20, 10] }]);

    await latField(wrapper).setValue("11");
    expect(map().eases.at(-1)).toEqual({ center: [20, 11] });
  });

  it("does not recentre the map after its own click", async () => {
    const { map, form } = await setup();

    map().emit("click", { lngLat: { lng: 10.5, lat: 20.25 } });
    await flushPromises();
    liveMarkers()[0]?.dragTo(1, 2);
    await flushPromises();

    expect(map().eases).toEqual([]);

    // The guard is spent: a later outside change to the same point recentres.
    form().reset({ latitude: 5, longitude: 6 });
    await flushPromises();
    expect(map().eases).toEqual([{ center: [6, 5] }]);
  });

  it("emits positionChange for a click and a drag but not for typing or a reset", async () => {
    const onPositionChange = vi.fn();
    const { wrapper, map, form } = await setup({ onPositionChange });

    await latField(wrapper).setValue("12");
    form().reset({ latitude: 1, longitude: 2 });
    await flushPromises();
    expect(onPositionChange).not.toHaveBeenCalled();

    map().emit("click", { lngLat: { lng: 10.1234567, lat: 20 } });
    await flushPromises();
    expect(onPositionChange).toHaveBeenLastCalledWith(20, 10.123457);

    liveMarkers()[0]?.dragTo(5, 6);
    await flushPromises();
    expect(onPositionChange).toHaveBeenLastCalledWith(6, 5);
    expect(onPositionChange).toHaveBeenCalledTimes(2);
  });

  it("ignores clicks and keeps the marker fixed when disabled", async () => {
    const onPositionChange = vi.fn();
    const { wrapper, map } = await setup({ disabled: true, onPositionChange });

    expect(latField(wrapper).attributes("disabled")).toBeDefined();
    expect(lngField(wrapper).attributes("disabled")).toBeDefined();
    expect(liveMarkers()[0]?.draggable).toBe(false);

    map().emit("click", { lngLat: { lng: 10, lat: 20 } });
    await flushPromises();

    expect(textOf(latField(wrapper))).toBe("48.85");
    expect(textOf(lngField(wrapper))).toBe("2.35");
    expect(onPositionChange).not.toHaveBeenCalled();
  });

  it("renders the label, the helper text and a draggable marker when enabled", async () => {
    const { wrapper } = await setup({
      label: "Where",
      helperText: "Click the map",
    });

    expect(wrapper.find("legend").text()).toBe("Where");
    expect(wrapper.text()).toContain("Click the map");
    expect(liveMarkers()[0]?.draggable).toBe(true);
  });

  it("keeps a half-typed number in the field while it is typed", async () => {
    const { wrapper } = await setup({}, { latitude: null, longitude: null });

    await latField(wrapper).setValue("-");
    expect(textOf(latField(wrapper))).toBe("-");
    await latField(wrapper).setValue("-1.");
    expect(textOf(latField(wrapper))).toBe("-1.");
    await latField(wrapper).setValue("-1.5");
    expect(textOf(latField(wrapper))).toBe("-1.5");
  });

  it("refuses text that is not a number and drops a leftover sign on blur", async () => {
    const { wrapper, submit, onSubmit } = await setup();

    await latField(wrapper).setValue("48.85x");
    await lngField(wrapper).setValue("2,35");
    expect(textOf(latField(wrapper))).toBe("48.85");
    expect(textOf(lngField(wrapper))).toBe("2.35");

    await latField(wrapper).setValue("-");
    await latField(wrapper).trigger("blur");
    expect(textOf(latField(wrapper))).toBe("");
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ latitude: null, longitude: 2.35 });
  });

  it("puts back the text the field shows when a refused keystroke follows a map click", async () => {
    const { wrapper, map } = await setup();

    await latField(wrapper).setValue("12");
    map().emit("click", { lngLat: { lng: 10.5, lat: 20.25 } });
    await flushPromises();
    expect(textOf(latField(wrapper))).toBe("20.25");

    await latField(wrapper).setValue("20.25x");
    expect(textOf(latField(wrapper))).toBe("20.25");
  });

  it("recentres the map when the values changed before the map loaded", async () => {
    const { map, form } = await setup(
      {},
      { latitude: null, longitude: null },
      { loaded: false },
    );

    form().reset({ latitude: 10, longitude: 20 });
    await flushPromises();

    expect(liveMarkers()[0]?.getLngLat()).toEqual({ lng: 20, lat: 10 });
    expect(map().eases).toEqual([{ center: [20, 10] }]);
  });

  it("does not recentre on load when the values did not change", async () => {
    const { map } = await setup({}, undefined, { loaded: false });
    await flushPromises();

    expect(map().eases).toEqual([]);
  });
});
