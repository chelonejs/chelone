/**
 * GeocodingInput tests. They mount the input in a form under `<Admin>` with a
 * fake `GeocodingProvider`, so no test touches the network. Tests that use
 * fake timers never call `flushPromises`, which waits on a timer.
 */

import {
  createI18n,
  fakeDataProvider,
  type GeocodeResult,
  type GeocodingProvider,
  mapMessages,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import { MapsProvider } from "../maps/use-map";
import GeocodingInput, {
  type GeocodingInputProps,
} from "./geocoding-input.vue";

type Address = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  bbox: number[] | null;
};

const paris: GeocodeResult = {
  displayName: "Paris, France",
  lat: 48.8566,
  lng: 2.3522,
  bbox: [2.2241, 48.8155, 2.4699, 48.9022],
  type: "city",
};
const lyon: GeocodeResult = {
  displayName: "Lyon, France",
  lat: 45.764,
  lng: 4.8357,
  type: "city",
};
const marseille: GeocodeResult = {
  displayName: "Marseille, France",
  lat: 43.2965,
  lng: 5.3698,
  type: "city",
};

function fakeProvider(
  overrides: Partial<GeocodingProvider> & { results?: GeocodeResult[] } = {},
) {
  const { results = [paris, lyon], ...rest } = overrides;
  const search = vi.fn<GeocodingProvider["search"]>(async () => results);
  const provider: GeocodingProvider = {
    name: "fake",
    search,
    reverse: async () => null,
    ...rest,
  };
  return { provider, search };
}

const emptyAddress: Address = {
  address: "",
  latitude: null,
  longitude: null,
  bbox: null,
};

const mounted: VueWrapper[] = [];

beforeEach(() => vi.useRealTimers());
afterEach(() => {
  vi.useRealTimers();
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function setup(
  props: Partial<GeocodingInputProps> = {},
  {
    record = emptyAddress,
    geocoder,
    fakeTimers = false,
  }: {
    record?: Address;
    geocoder?: GeocodingProvider;
    fakeTimers?: boolean;
  } = {},
) {
  // `provider: undefined` means none, to test the MapsProvider fallback.
  const created = "provider" in props ? undefined : fakeProvider();
  const provider = created?.provider ?? props.provider;
  const search = created?.search ?? vi.fn<GeocodingProvider["search"]>();
  let form: UseFormReturn<Address> | undefined;
  const FormHost = defineComponent({
    setup() {
      form = useForm<Address>({ record, onSubmit: async () => undefined });
      return () => h(GeocodingInput, { source: "address", provider, ...props });
    },
  });
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
              queryClient: new QueryClient({
                defaultOptions: { queries: { retry: false } },
              }),
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
  if (fakeTimers) await nextTick();
  else await flushPromises();
  const current = () => {
    if (!form) throw new Error("form not mounted");
    return form.form.store.state;
  };
  /** The form's value for `source` and whether it is dirty, as `"value|dirty"`. */
  const probe = (source: keyof Address) =>
    `${JSON.stringify(current().values[source])}|${current().fieldMeta[source]?.isDirty ?? false}`;
  return { wrapper, search, probe };
}

const field = (wrapper: VueWrapper) =>
  wrapper.get<HTMLInputElement>('[role="combobox"]');
const type = (wrapper: VueWrapper, value: string) =>
  field(wrapper).setValue(value);
const settle = () => flushPromises();
const options = (wrapper: VueWrapper) => wrapper.findAll('[role="option"]');
const optionNamed = (wrapper: VueWrapper, text: string) => {
  const found = options(wrapper).find((o) => o.text().includes(text));
  if (!found) throw new Error(`no option ${text}`);
  return found;
};
const searchButton = (wrapper: VueWrapper) =>
  wrapper.findAll("button").find((b) => b.text() === "Search");

describe("GeocodingInput", () => {
  it("searches on Enter when the provider is not typeahead", async () => {
    const { wrapper, search } = await setup();

    await type(wrapper, "Paris");
    expect(search).not.toHaveBeenCalled();
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();

    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("Paris");
    expect(wrapper.text()).toContain("Paris, France");
    expect(wrapper.text()).toContain("Lyon, France");
    expect(wrapper.find('[data-slot="geocoding-input"]').exists()).toBe(true);
  });

  it("searches on the button", async () => {
    const { wrapper, search } = await setup();

    await type(wrapper, "Lyon");
    await searchButton(wrapper)?.trigger("click");
    await settle();

    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("Lyon");
    expect(wrapper.text()).toContain("Lyon, France");
  });

  it("searches after the debounce for a typeahead provider and not before minChars", async () => {
    vi.useFakeTimers();
    const { provider, search } = fakeProvider({ typeahead: true });
    const { wrapper } = await setup(
      { provider, debounceMs: 300 },
      { fakeTimers: true },
    );

    // No button: a typeahead provider searches by itself.
    expect(searchButton(wrapper)).toBeUndefined();

    await type(wrapper, "Pa");
    await vi.advanceTimersByTimeAsync(1000);
    expect(search).not.toHaveBeenCalled();

    await type(wrapper, "Par");
    await vi.advanceTimersByTimeAsync(299);
    expect(search).not.toHaveBeenCalled();
    await type(wrapper, "Pari");
    await vi.advanceTimersByTimeAsync(299);
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("Pari");
  });

  it("writes the address, lat, lng and bbox when a result is picked", async () => {
    const { wrapper, probe } = await setup({
      latSource: "latitude",
      lngSource: "longitude",
      bboxSource: "bbox",
    });

    await type(wrapper, "Paris");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    await optionNamed(wrapper, "Paris, France").trigger("click");
    await settle();

    expect(probe("address")).toBe('"Paris, France"|true');
    expect(probe("latitude")).toBe("48.8566|true");
    expect(probe("longitude")).toBe("2.3522|true");
    expect(probe("bbox")).toBe("[2.2241,48.8155,2.4699,48.9022]|true");
    expect(field(wrapper).element.value).toBe("Paris, France");
    expect(wrapper.text()).not.toContain("Lyon, France");
  });

  it("leaves latSource, lngSource and bboxSource alone when they are not set", async () => {
    const { wrapper, probe } = await setup();

    await type(wrapper, "Paris");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    await optionNamed(wrapper, "Paris, France").trigger("click");
    await settle();

    expect(probe("address")).toBe('"Paris, France"|true');
    expect(probe("latitude")).toBe("null|false");
    expect(probe("longitude")).toBe("null|false");
    expect(probe("bbox")).toBe("null|false");
  });

  it("does not write a bbox the result lacks", async () => {
    const { wrapper, probe } = await setup({ bboxSource: "bbox" });

    await type(wrapper, "Lyon");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    await optionNamed(wrapper, "Lyon, France").trigger("click");
    await settle();

    expect(probe("bbox")).toBe("null|false");
  });

  it("marks every written field dirty", async () => {
    const { wrapper, probe } = await setup({
      latSource: "latitude",
      lngSource: "longitude",
    });
    for (const name of ["address", "latitude", "longitude"] as const) {
      expect(probe(name)).toMatch(/\|false$/);
    }

    await type(wrapper, "Lyon");
    // Typing alone writes nothing.
    expect(probe("address")).toBe('""|false');
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    await optionNamed(wrapper, "Lyon, France").trigger("click");
    await settle();

    for (const name of ["address", "latitude", "longitude"] as const) {
      expect(probe(name), name).toMatch(/\|true$/);
    }
  });

  it("picks with the arrow keys and Enter, and closes on Escape", async () => {
    const { wrapper, probe } = await setup({ latSource: "latitude" });
    await type(wrapper, "Paris");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();

    const input = field(wrapper);
    expect(input.attributes("aria-expanded")).toBe("true");
    const listbox = wrapper.get('[role="listbox"]');
    expect(input.attributes("aria-controls")).toBe(listbox.attributes("id"));
    expect(input.attributes("aria-activedescendant")).toBeUndefined();

    await input.trigger("keydown", { key: "ArrowDown" });
    expect(input.attributes("aria-activedescendant")).toBe(
      options(wrapper)[0]?.attributes("id"),
    );
    await input.trigger("keydown", { key: "ArrowDown" });
    expect(input.attributes("aria-activedescendant")).toBe(
      options(wrapper)[1]?.attributes("id"),
    );
    expect(options(wrapper)[1]?.attributes("aria-selected")).toBe("true");
    await input.trigger("keydown", { key: "ArrowUp" });
    expect(input.attributes("aria-activedescendant")).toBe(
      options(wrapper)[0]?.attributes("id"),
    );
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });
    await settle();

    expect(probe("address")).toBe('"Lyon, France"|true');
    expect(probe("latitude")).toBe("45.764|true");
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(input.attributes("aria-expanded")).toBe("false");

    // Escape closes a list and leaves what was typed.
    await type(wrapper, "Paris");
    await input.trigger("keydown", { key: "Enter" });
    await settle();
    expect(options(wrapper)).toHaveLength(2);
    await input.trigger("keydown", { key: "Escape" });
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(input.element.value).toBe("Paris");
  });

  it("ArrowUp with nothing highlighted lands on the last option", async () => {
    const { provider } = fakeProvider({ results: [paris, lyon, marseille] });
    const { wrapper, probe } = await setup({ provider, latSource: "latitude" });
    await type(wrapper, "Paris");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();

    const input = field(wrapper);
    expect(options(wrapper)).toHaveLength(3);
    expect(input.attributes("aria-activedescendant")).toBeUndefined();

    // The end the arrow points at, not the one a wrap from "nothing" lands on.
    await input.trigger("keydown", { key: "ArrowUp" });
    expect(input.attributes("aria-activedescendant")).toBe(
      options(wrapper)[2]?.attributes("id"),
    );
    expect(options(wrapper)[2]?.attributes("aria-selected")).toBe("true");

    await input.trigger("keydown", { key: "Enter" });
    await settle();

    expect(probe("address")).toBe('"Marseille, France"|true');
    expect(probe("latitude")).toBe("43.2965|true");
  });

  it("closes the list when focus leaves the field", async () => {
    const { wrapper } = await setup();
    await type(wrapper, "Paris");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    expect(options(wrapper)).toHaveLength(2);

    await field(wrapper).trigger("blur");

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(field(wrapper).attributes("aria-expanded")).toBe("false");
    expect(field(wrapper).element.value).toBe("Paris");
  });

  it("keeps focus in the field while results change", async () => {
    const { provider } = fakeProvider({ typeahead: true });
    const { wrapper } = await setup({ provider, debounceMs: 0 });

    field(wrapper).element.focus();
    await type(wrapper, "Par");
    await settle();
    expect(wrapper.text()).toContain("Paris, France");
    expect(document.activeElement).toBe(field(wrapper).element);
    await type(wrapper, "Pari");
    await settle();
    await type(wrapper, "Paris");
    await settle();
    expect(document.activeElement).toBe(field(wrapper).element);
  });

  it("shows searching, then no results", async () => {
    let resolve: (results: GeocodeResult[]) => void = () => {};
    const { provider } = fakeProvider({
      search: () => new Promise<GeocodeResult[]>((r) => (resolve = r)),
    });
    const { wrapper } = await setup({ provider });

    await type(wrapper, "Nowhere");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    expect(wrapper.text()).toContain("Searching...");
    expect(wrapper.text()).not.toContain("No results");

    resolve([]);
    await settle();
    expect(wrapper.text()).toContain("No results");
    expect(wrapper.text()).not.toContain("Searching...");
  });

  it("says the search failed when the provider throws", async () => {
    const { provider } = fakeProvider({
      search: async () => {
        throw new Error("offline");
      },
    });
    const { wrapper } = await setup({ provider });

    await type(wrapper, "Paris");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();

    expect(wrapper.get('[role="alert"]').text()).toBe(
      "The search failed, try again shortly",
    );
    expect(wrapper.text()).not.toContain("No results");
  });

  it("writes typed text to the form on blur", async () => {
    const { wrapper, probe } = await setup();

    await type(wrapper, "12 Rue de Rivoli, Paris");
    expect(probe("address")).toBe('""|false');
    await field(wrapper).trigger("blur");

    expect(probe("address")).toBe('"12 Rue de Rivoli, Paris"|true');
    expect(field(wrapper).element.value).toBe("12 Rue de Rivoli, Paris");
  });

  it("clears the coordinates of an earlier pick when the address is retyped by hand", async () => {
    const { wrapper, probe } = await setup({
      latSource: "latitude",
      lngSource: "longitude",
      bboxSource: "bbox",
    });

    await type(wrapper, "Paris");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    await optionNamed(wrapper, "Paris, France").trigger("click");
    expect(probe("latitude")).toBe("48.8566|true");

    await type(wrapper, "12 Rue de Rivoli, Lyon");
    await field(wrapper).trigger("blur");

    expect(probe("address")).toBe('"12 Rue de Rivoli, Lyon"|true');
    expect(probe("latitude")).toMatch(/^null\|/);
    expect(probe("longitude")).toMatch(/^null\|/);
    expect(probe("bbox")).toMatch(/^null\|/);
  });

  it("leaves the coordinates alone when the sources are not set", async () => {
    const { wrapper, probe } = await setup(
      {},
      { record: { ...emptyAddress, latitude: 1 } },
    );

    await type(wrapper, "12 Rue de Rivoli, Lyon");
    await field(wrapper).trigger("blur");

    expect(probe("address")).toBe('"12 Rue de Rivoli, Lyon"|true');
    expect(probe("latitude")).toBe("1|false");
  });

  it("does not write the form when the field is blurred unchanged", async () => {
    const { wrapper, probe } = await setup();

    await field(wrapper).trigger("focus");
    await field(wrapper).trigger("blur");

    expect(probe("address")).toBe('""|false');
  });

  it("shows the type under each result", async () => {
    const { wrapper } = await setup();

    await type(wrapper, "Paris");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();

    expect(options(wrapper).map((o) => o.text())).toEqual([
      "Paris, Francecity",
      "Lyon, Francecity",
    ]);
  });

  it("shows the saved address at first", async () => {
    const { wrapper } = await setup(
      {},
      { record: { ...emptyAddress, address: "10 Downing Street" } },
    );

    expect(field(wrapper).element.value).toBe("10 Downing Street");
    // Showing it does not search.
    expect(wrapper.text()).not.toContain("No results");
  });

  it("takes the geocoder from MapsProvider and lets the provider prop win", async () => {
    const fromContext = fakeProvider();
    const fromProp = fakeProvider({ name: "prop" });
    const first = await setup(
      { provider: undefined },
      { geocoder: fromContext.provider },
    );

    await type(first.wrapper, "Paris");
    await field(first.wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    expect(first.wrapper.text()).toContain("Paris, France");
    expect(fromContext.search).toHaveBeenCalledTimes(1);

    first.wrapper.unmount();
    mounted.length = 0;
    const second = await setup(
      { provider: fromProp.provider },
      { geocoder: fromContext.provider },
    );
    await type(second.wrapper, "Lyon");
    await field(second.wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    expect(fromProp.search).toHaveBeenCalledTimes(1);
    expect(fromContext.search).toHaveBeenCalledTimes(1);
  });

  it("throws an error naming provider and MapsProvider when neither is set", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(setup({ provider: undefined })).rejects.toThrow(
        /`provider`.*MapsProvider/s,
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("aborts the previous search when the query changes", async () => {
    const signals: AbortSignal[] = [];
    const { provider } = fakeProvider({
      typeahead: true,
      search: (_query, options) =>
        new Promise<GeocodeResult[]>(() => {
          if (options?.signal) signals.push(options.signal);
        }),
    });
    const { wrapper } = await setup({ provider, debounceMs: 0 });

    await type(wrapper, "Par");
    await settle();
    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);

    await type(wrapper, "Pari");
    await settle();
    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it("searches again on Enter after a failed search for the same text", async () => {
    let calls = 0;
    const { provider } = fakeProvider({
      search: async () => {
        calls += 1;
        if (calls === 1) throw new Error("offline");
        return [paris];
      },
    });
    const { wrapper } = await setup({ provider });

    await type(wrapper, "Paris");
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();
    expect(wrapper.text()).toContain("The search failed, try again shortly");

    await field(wrapper).trigger("keydown", { key: "Escape" });
    await field(wrapper).trigger("keydown", { key: "Enter" });
    await settle();

    expect(wrapper.text()).toContain("Paris, France");
    expect(calls).toBe(2);
  });

  it("shows no list for a typeahead provider until the debounced search starts", async () => {
    vi.useFakeTimers();
    const { provider, search } = fakeProvider({ typeahead: true });
    const { wrapper } = await setup(
      { provider, debounceMs: 300 },
      { fakeTimers: true },
    );

    await type(wrapper, "Par");
    await vi.advanceTimersByTimeAsync(100);

    // minChars is reached, but nothing has searched yet.
    expect(search).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain("No results");

    await vi.advanceTimersByTimeAsync(200);
    expect(search).toHaveBeenCalledTimes(1);
    // Vue Query notifies on a timer.
    await vi.advanceTimersByTimeAsync(10);
    expect(wrapper.text()).toContain("Paris, France");
  });
});
