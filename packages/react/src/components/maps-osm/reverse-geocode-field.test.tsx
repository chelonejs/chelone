/**
 * ReverseGeocodeField tests, with a fake `GeocodingProvider`: no test touches
 * the network.
 */

import {
  fakeDataProvider,
  type GeocodeResult,
  type GeocodingProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { MapsProvider } from "../maps/maps-provider";
import {
  ReverseGeocodeField,
  type ReverseGeocodeFieldProps,
} from "./reverse-geocode-field";

afterEach(cleanup);

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

function show(
  props: Partial<ReverseGeocodeFieldProps> & { provider: GeocodingProvider },
  record: Record<string, unknown> = { lat: 48.8566, lng: 2.3522 },
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
    >
      <MapsProvider>{children}</MapsProvider>
    </CheloneProvider>
  );
  return render(
    <ReverseGeocodeField
      latSource="lat"
      lngSource="lng"
      record={record}
      {...props}
    />,
    { wrapper },
  );
}

const root = () =>
  document.querySelector('[data-slot="reverse-geocode-field"]');

describe("ReverseGeocodeField", () => {
  it("shows the full name, the street and the city", async () => {
    const { provider, reverse } = fakeProvider(async () => address);

    show({ provider });
    await waitFor(() => expect(root()?.textContent).toBe(address.displayName));
    expect(reverse.mock.calls[0]?.slice(0, 2)).toEqual([48.8566, 2.3522]);
    cleanup();

    show({ provider, format: "street" });
    await waitFor(() => expect(root()?.textContent).toBe("10 Rue de Rivoli"));
    cleanup();

    show({ provider, format: "city" });
    await waitFor(() =>
      expect(root()?.textContent).toBe("10 Rue de Rivoli, Paris"),
    );
  });

  it("shows a skeleton while loading", async () => {
    let finish: (value: GeocodeResult) => void = () => {};
    const { provider } = fakeProvider(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    show({ provider });
    await act(async () => {});
    expect(root()?.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(root()?.textContent).toBe("");

    await act(async () => finish(address));
    await waitFor(() => expect(root()?.textContent).toBe(address.displayName));
    expect(root()?.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it("falls back to rounded coordinates when the provider returns null", async () => {
    const { provider } = fakeProvider(async () => null);

    show({ provider }, { lat: 48.856614, lng: 2.352222 });

    await waitFor(() => expect(root()?.textContent).toBe("48.8566, 2.3522"));
  });

  it("renders nothing without coordinates and calls no provider", async () => {
    const { provider, reverse } = fakeProvider(async () => address);

    show({ provider }, { lat: 48.8566, lng: null });
    await act(async () => {});
    expect(root()).toBeNull();
    cleanup();

    show({ provider }, {});
    await act(async () => {});
    expect(root()).toBeNull();
    expect(screen.queryByText(/./)).toBeNull();
    expect(reverse).not.toHaveBeenCalled();
  });

  it("takes the geocoder from MapsProvider and throws an error naming provider and MapsProvider when neither is set", async () => {
    const { provider, reverse } = fakeProvider(async () => address);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CheloneProvider
        dataProvider={fakeDataProvider({})}
        queryClient={new QueryClient()}
      >
        <MapsProvider geocoder={provider}>{children}</MapsProvider>
      </CheloneProvider>
    );
    render(
      <ReverseGeocodeField
        latSource="lat"
        lngSource="lng"
        record={{ lat: 1, lng: 2 }}
      />,
      { wrapper },
    );
    await waitFor(() => expect(reverse).toHaveBeenCalledTimes(1));
    cleanup();

    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <CheloneProvider
          dataProvider={fakeDataProvider({})}
          queryClient={new QueryClient()}
        >
          <ReverseGeocodeField
            latSource="lat"
            lngSource="lng"
            record={{ lat: 1, lng: 2 }}
          />
        </CheloneProvider>,
      ),
    ).toThrow(/`provider`.*MapsProvider/);
    quiet.mockRestore();
  });
});
