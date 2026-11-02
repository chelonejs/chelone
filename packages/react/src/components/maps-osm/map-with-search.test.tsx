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
import {
  liveMarkers,
  maps,
  resetFake,
} from "../maps/__fixtures__/fake-maplibre";
import { MapsProvider } from "../maps/maps-provider";
import { MapWithSearch, type MapWithSearchProps } from "./map-with-search";

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

function Saved({ form }: { form: ReturnType<typeof useForm<Place>>["form"] }) {
  const values = useSelector(form.store, (s) => s.values);
  return <output data-testid="saved">{JSON.stringify(values)}</output>;
}

async function setup(
  provider: GeocodingProvider,
  props: Partial<MapWithSearchProps> = {},
  defaultValues: Place = { address: "", latitude: 48.85, longitude: 2.35 },
) {
  function FormHost() {
    const form = useForm<Place>({ defaultValues, save: async () => undefined });
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        <MapWithSearch
          latSource="latitude"
          lngSource="longitude"
          addressSource="address"
          provider={provider}
          {...props}
        />
        <Saved form={form.form} />
      </CheloneFormProvider>
    );
  }
  render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({ locale: "en", messages: { en: mapMessages } })}
    >
      <MapsProvider mapStyle={style}>
        <FormHost />
      </MapsProvider>
    </CheloneProvider>,
  );
  await act(async () => {});
}

const map = () => {
  const found = maps[0];
  if (!found) throw new Error("no map");
  return found;
};
const click = async (lat: number, lng: number) => {
  await act(async () => map().emit("click", { lngLat: { lat, lng } }));
};
const address = () => screen.getByRole("combobox") as HTMLInputElement;
const saved = () => JSON.parse(screen.getByTestId("saved").textContent ?? "");

beforeEach(resetFake);
afterEach(cleanup);

describe("MapWithSearch", () => {
  it("recentres the marker when a result is picked and does not reverse-geocode", async () => {
    const { provider, reverse } = fakeProvider();
    await setup(provider);

    fireEvent.change(address(), { target: { value: "Paris" } });
    fireEvent.keyDown(address(), { key: "Enter" });
    fireEvent.click(await screen.findByText("Paris, France"));
    await act(async () => {});

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
    expect(address().value).toBe("Paris, France");
  });

  it("writes the address after a map click", async () => {
    const { provider, reverse } = fakeProvider();
    await setup(provider);

    await click(10.1234567, 20.5);

    expect(reverse).toHaveBeenCalledTimes(1);
    expect(reverse.mock.calls[0]?.slice(0, 2)).toEqual([10.123457, 20.5]);
    expect(saved().address).toBe("1 Rue de Rivoli");
    expect(address().value).toBe("1 Rue de Rivoli");
  });

  it("keeps the address when the reverse geocode returns null", async () => {
    const { provider, reverse } = fakeProvider(async () => null);
    await setup(provider, {}, { address: "Home", latitude: 1, longitude: 1 });

    await click(5, 6);

    expect(reverse).toHaveBeenCalledTimes(1);
    expect(saved()).toEqual({ address: "Home", latitude: 5, longitude: 6 });
  });

  it("keeps the address when the reverse geocode fails", async () => {
    const { provider } = fakeProvider(async () => {
      throw new Error("offline");
    });
    await setup(provider, {}, { address: "Home", latitude: 1, longitude: 1 });

    await click(5, 6);

    expect(saved().address).toBe("Home");
  });

  it("does not reverse-geocode on mount", async () => {
    const { provider, reverse } = fakeProvider();
    await setup(provider, {}, { address: "Home", latitude: 1, longitude: 1 });
    await act(async () => {});

    expect(reverse).not.toHaveBeenCalled();
    expect(saved().address).toBe("Home");
  });

  it("ignores a reverse geocode answer that a newer click has replaced", async () => {
    const pending: ((result: GeocodeResult) => void)[] = [];
    const { provider, reverse } = fakeProvider(
      () => new Promise<GeocodeResult>((resolve) => pending.push(resolve)),
    );
    await setup(provider);

    await click(10, 10);
    await click(20, 20);
    expect(reverse).toHaveBeenCalledTimes(2);

    await act(async () =>
      pending[1]?.({ displayName: "Second", lat: 20, lng: 20 }),
    );
    await act(async () =>
      pending[0]?.({ displayName: "First", lat: 10, lng: 10 }),
    );

    expect(saved().address).toBe("Second");
  });

  it("ignores a reverse geocode answer that arrives after a result is picked", async () => {
    let answer: (result: GeocodeResult) => void = () => {};
    const { provider } = fakeProvider(
      () => new Promise<GeocodeResult>((resolve) => (answer = resolve)),
    );
    await setup(provider);

    await click(10, 10);
    fireEvent.change(address(), { target: { value: "Paris" } });
    fireEvent.keyDown(address(), { key: "Enter" });
    fireEvent.click(await screen.findByText("Paris, France"));
    await act(async () => answer({ displayName: "Late", lat: 10, lng: 10 }));

    expect(saved().address).toBe("Paris, France");
  });
});
