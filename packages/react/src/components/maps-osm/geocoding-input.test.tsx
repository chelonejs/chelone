/**
 * GeocodingInput tests. They mount the input in a form under `CheloneProvider`
 * with a fake `GeocodingProvider`, so no test touches the network. cmdk needs
 * the jsdom shims in `test-setup.ts`.
 */

import {
  createI18n,
  fakeDataProvider,
  type GeocodeResult,
  type GeocodingProvider,
  mapMessages,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { CheloneFormProvider } from "../../form-context";
import { useForm } from "../../form-hooks";
import { MapsProvider } from "../maps/maps-provider";
import { GeocodingInput, type GeocodingInputProps } from "./geocoding-input";

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

function fakeProvider(
  overrides: Partial<GeocodingProvider> & {
    results?: GeocodeResult[];
  } = {},
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

function Probe({
  form,
  source,
}: {
  form: ReturnType<typeof useForm<Address>>["form"];
  source: keyof Address;
}) {
  const state = useSelector(form.store, (s) => ({
    value: s.values[source],
    dirty: s.fieldMeta[source]?.isDirty ?? false,
  }));
  return (
    <output data-testid={`probe-${source}`}>
      {`${JSON.stringify(state.value)}|${state.dirty}`}
    </output>
  );
}

async function setup(
  props: Partial<GeocodingInputProps> = {},
  {
    defaultValues = emptyAddress,
    geocoder,
  }: { defaultValues?: Address; geocoder?: GeocodingProvider } = {},
) {
  // `provider: undefined` means none, to test the MapsProvider fallback.
  const created = "provider" in props ? undefined : fakeProvider();
  const provider = created?.provider ?? props.provider;
  const search = created?.search ?? vi.fn<GeocodingProvider["search"]>();
  function FormHost() {
    const form = useForm<Address>({
      defaultValues,
      save: async () => undefined,
    });
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        <GeocodingInput source="address" provider={provider} {...props} />
        {(["address", "latitude", "longitude", "bbox"] as const).map((s) => (
          <Probe key={s} form={form.form} source={s} />
        ))}
      </CheloneFormProvider>
    );
  }
  const view = render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
      i18n={createI18n({ locale: "en", messages: { en: mapMessages } })}
    >
      <MapsProvider geocoder={geocoder}>
        <FormHost />
      </MapsProvider>
    </CheloneProvider>,
  );
  await act(async () => {});
  return { view, search };
}

const field = () => screen.getByRole("combobox") as HTMLInputElement;
const type = (value: string) =>
  fireEvent.change(field(), { target: { value } });
const probe = (source: string) =>
  screen.getByTestId(`probe-${source}`).textContent;

beforeEach(() => vi.useRealTimers());
afterEach(cleanup);

describe("GeocodingInput", () => {
  it("searches on Enter when the provider is not typeahead", async () => {
    const { search } = await setup();

    type("Paris");
    expect(search).not.toHaveBeenCalled();
    fireEvent.keyDown(field(), { key: "Enter" });
    await act(async () => {});

    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("Paris");
    expect(await screen.findByText("Paris, France")).toBeTruthy();
    expect(screen.getByText("Lyon, France")).toBeTruthy();
  });

  it("searches on the button", async () => {
    const { search } = await setup();

    type("Lyon");
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await act(async () => {});

    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("Lyon");
    expect(await screen.findByText("Lyon, France")).toBeTruthy();
  });

  it("searches after the debounce for a typeahead provider and not before minChars", async () => {
    vi.useFakeTimers();
    const { provider, search } = fakeProvider({ typeahead: true });
    await setup({ provider, debounceMs: 300 });

    // No button: a typeahead provider searches by itself.
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();

    type("Pa");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(search).not.toHaveBeenCalled();

    type("Par");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(search).not.toHaveBeenCalled();
    type("Pari");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(search).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("Pari");
  });

  it("writes the address, lat, lng and bbox when a result is picked", async () => {
    await setup({
      latSource: "latitude",
      lngSource: "longitude",
      bboxSource: "bbox",
    });

    type("Paris");
    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.click(await screen.findByText("Paris, France"));

    expect(probe("address")).toBe('"Paris, France"|true');
    expect(probe("latitude")).toBe("48.8566|true");
    expect(probe("longitude")).toBe("2.3522|true");
    expect(probe("bbox")).toBe("[2.2241,48.8155,2.4699,48.9022]|true");
    expect(field().value).toBe("Paris, France");
    expect(screen.queryByText("Lyon, France")).toBeNull();
  });

  it("leaves latSource, lngSource and bboxSource alone when they are not set", async () => {
    await setup();

    type("Paris");
    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.click(await screen.findByText("Paris, France"));

    expect(probe("address")).toBe('"Paris, France"|true');
    expect(probe("latitude")).toBe("null|false");
    expect(probe("longitude")).toBe("null|false");
    expect(probe("bbox")).toBe("null|false");
  });

  it("does not write a bbox the result lacks", async () => {
    await setup({ bboxSource: "bbox" });

    type("Lyon");
    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.click(await screen.findByText("Lyon, France"));

    expect(probe("bbox")).toBe("null|false");
  });

  it("marks every written field dirty", async () => {
    await setup({ latSource: "latitude", lngSource: "longitude" });
    for (const name of ["address", "latitude", "longitude"]) {
      expect(probe(name)).toMatch(/\|false$/);
    }

    type("Lyon");
    // Typing alone writes nothing.
    expect(probe("address")).toBe('""|false');
    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.click(await screen.findByText("Lyon, France"));

    for (const name of ["address", "latitude", "longitude"]) {
      expect(probe(name), name).toMatch(/\|true$/);
    }
  });

  it("keeps focus in the field while results change", async () => {
    const { provider } = fakeProvider({ typeahead: true });
    await setup({ provider, debounceMs: 0 });

    field().focus();
    type("Par");
    await screen.findByText("Paris, France");
    expect(document.activeElement).toBe(field());
    type("Pari");
    await act(async () => {});
    type("Paris");
    await act(async () => {});
    expect(document.activeElement).toBe(field());
  });

  it("shows searching, then no results", async () => {
    let resolve: (results: GeocodeResult[]) => void = () => {};
    const { provider } = fakeProvider({
      search: () => new Promise<GeocodeResult[]>((r) => (resolve = r)),
    });
    await setup({ provider });

    type("Nowhere");
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(await screen.findByText("Searching...")).toBeTruthy();
    expect(screen.queryByText("No results")).toBeNull();

    await act(async () => resolve([]));
    expect(await screen.findByText("No results")).toBeTruthy();
    expect(screen.queryByText("Searching...")).toBeNull();
  });

  it("shows no results when the provider throws", async () => {
    const { provider } = fakeProvider({
      search: async () => {
        throw new Error("offline");
      },
    });
    await setup({ provider });

    type("Paris");
    fireEvent.keyDown(field(), { key: "Enter" });

    expect(await screen.findByText("No results")).toBeTruthy();
  });

  it("closes the list on Escape", async () => {
    await setup();

    type("Paris");
    fireEvent.keyDown(field(), { key: "Enter" });
    await screen.findByText("Paris, France");
    fireEvent.keyDown(field(), { key: "Escape" });

    expect(screen.queryByText("Paris, France")).toBeNull();
    expect(field().value).toBe("Paris");
  });

  it("shows the type under each result", async () => {
    await setup();

    type("Paris");
    fireEvent.keyDown(field(), { key: "Enter" });
    await screen.findByText("Paris, France");

    expect(screen.getAllByText("city")).toHaveLength(2);
  });

  it("shows the saved address at first", async () => {
    await setup(
      {},
      { defaultValues: { ...emptyAddress, address: "10 Downing Street" } },
    );

    expect(field().value).toBe("10 Downing Street");
    // Showing it does not search.
    expect(screen.queryByText("No results")).toBeNull();
  });

  it("takes the geocoder from MapsProvider and lets the provider prop win", async () => {
    const fromContext = fakeProvider();
    const fromProp = fakeProvider({ name: "prop" });
    await setup({ provider: undefined }, { geocoder: fromContext.provider });

    type("Paris");
    fireEvent.keyDown(field(), { key: "Enter" });
    await screen.findByText("Paris, France");
    expect(fromContext.search).toHaveBeenCalledTimes(1);

    cleanup();
    await setup(
      { provider: fromProp.provider },
      { geocoder: fromContext.provider },
    );
    type("Lyon");
    fireEvent.keyDown(field(), { key: "Enter" });
    await screen.findByText("Lyon, France");
    expect(fromProp.search).toHaveBeenCalledTimes(1);
    expect(fromContext.search).toHaveBeenCalledTimes(1);
  });

  it("throws an error naming provider and MapsProvider when neither is set", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
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
    await setup({ provider, debounceMs: 0 });

    type("Par");
    await act(async () => {});
    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);

    type("Pari");
    await act(async () => {});
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
    await setup({ provider });

    type("Paris");
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(await screen.findByText("No results")).toBeTruthy();

    fireEvent.keyDown(field(), { key: "Escape" });
    fireEvent.keyDown(field(), { key: "Enter" });

    expect(await screen.findByText("Paris, France")).toBeTruthy();
    expect(calls).toBe(2);
  });

  it("shows no list for a typeahead provider until the debounced search starts", async () => {
    vi.useFakeTimers();
    const { provider, search } = fakeProvider({ typeahead: true });
    await setup({ provider, debounceMs: 300 });

    type("Pa");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    type("Par");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // minChars is reached, but nothing has searched yet.
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByText("No results")).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(search).toHaveBeenCalledTimes(1);
    // React Query notifies on a timer.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByText("Paris, France")).toBeTruthy();
  });
});
