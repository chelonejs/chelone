/**
 * LatLngInput tests. jsdom has no WebGL, so `maplibre-gl` is the stand-in in
 * `__fixtures__/fake-maplibre.ts`. Tests mount the input in a form under the
 * maps provider, type into the text fields and fire map events as MapLibre
 * would, then assert the DOM, the form's saved data and what the map was asked
 * to do.
 */

import {
  createI18n,
  fakeDataProvider,
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
import { liveMarkers, maps, resetFake } from "./__fixtures__/fake-maplibre";
import { LatLngInput, type LatLngInputProps } from "./lat-lng-input";
import { MapsProvider } from "./maps-provider";

vi.mock("maplibre-gl", () => import("./__fixtures__/fake-maplibre"));

const style = rasterTileStyle({
  tileUrl: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
});

beforeEach(resetFake);
afterEach(cleanup);

type Coordinates = { latitude: number | null; longitude: number | null };

/** Reads one field's touched flag from the form store, not through a second `useInput`, which would overwrite the input's validators. */
function TouchedProbe({
  form,
  source,
}: {
  form: ReturnType<typeof useForm<Coordinates>>["form"];
  source: "latitude" | "longitude";
}) {
  const isTouched = useSelector(
    form.store,
    (state) => state.fieldMeta[source]?.isTouched ?? false,
  );
  return <output data-testid={`touched-${source}`}>{`${isTouched}`}</output>;
}

function DirtyProbe({ isDirty }: { isDirty: boolean }) {
  return <output data-testid="dirty">{`${isDirty}`}</output>;
}

async function setup(
  props: Partial<LatLngInputProps> = {},
  defaultValues: Coordinates = { latitude: 48.85, longitude: 2.35 },
) {
  const save = vi.fn(async (_data: Coordinates) => undefined);
  let current: ReturnType<typeof useForm<Coordinates>> | undefined;
  function FormHost() {
    const form = useForm<Coordinates>({ defaultValues, save });
    current = form;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        <LatLngInput latSource="latitude" lngSource="longitude" {...props} />
        <TouchedProbe form={form.form} source="latitude" />
        <TouchedProbe form={form.form} source="longitude" />
        <DirtyProbe isDirty={form.isDirty} />
      </CheloneFormProvider>
    );
  }
  const view = render(
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
  // Lets the fake map's microtask `load` fire and React render what follows.
  await act(async () => {});
  const form = () => {
    if (!current) throw new Error("form not mounted");
    return current;
  };
  return {
    view,
    save,
    form,
    submit: () => act(async () => form().submit()),
    map: () => {
      const map = maps[0];
      if (!map) throw new Error("no map");
      return map;
    },
  };
}

const latField = () => screen.getByLabelText("Latitude") as HTMLInputElement;
const lngField = () => screen.getByLabelText("Longitude") as HTMLInputElement;
const touched = (source: string) =>
  screen.getByTestId(`touched-${source}`).textContent;

describe("LatLngInput", () => {
  it("shows the record's coordinates in both text fields and one marker", async () => {
    const { view } = await setup();

    expect(latField().value).toBe("48.85");
    expect(lngField().value).toBe("2.35");
    expect(latField().getAttribute("inputmode")).toBe("decimal");
    expect(
      view.container.querySelector('[data-slot="lat-lng-input"]'),
    ).not.toBeNull();
    expect(liveMarkers()).toHaveLength(1);
    expect(liveMarkers()[0]?.getLngLat()).toEqual({ lng: 2.35, lat: 48.85 });
  });

  it("a stored number shows as its decimal text", async () => {
    await setup({}, { latitude: 0, longitude: -122.4194 });

    expect(latField().value).toBe("0");
    expect(lngField().value).toBe("-122.4194");
  });

  it("shows numeric strings from the record, as LatLngField does", async () => {
    // Wire-shaped on purpose: coordinates off the wire can arrive as strings.
    await setup({}, JSON.parse('{"latitude":"48.85","longitude":"2.35"}'));

    expect(latField().value).toBe("48.85");
    expect(lngField().value).toBe("2.35");
    expect(liveMarkers()).toHaveLength(1);
    expect(liveMarkers()[0]?.getLngLat()).toEqual({ lng: 2.35, lat: 48.85 });
  });

  it("shows no marker while either coordinate is empty", async () => {
    const { map } = await setup(
      { defaultPosition: [10, 20] },
      { latitude: 48.85, longitude: null },
    );

    expect(liveMarkers()).toHaveLength(0);
    expect(map().options.center).toEqual([20, 10]);

    fireEvent.change(lngField(), { target: { value: "2.35" } });
    expect(liveMarkers()).toHaveLength(1);

    fireEvent.change(latField(), { target: { value: "" } });
    expect(liveMarkers()).toHaveLength(0);
  });

  it("writes both fields when the map is clicked", async () => {
    const { map, submit, save } = await setup();

    act(() => map().emit("click", { lngLat: { lng: 10.5, lat: 20.25 } }));

    expect(latField().value).toBe("20.25");
    expect(lngField().value).toBe("10.5");
    expect(liveMarkers()[0]?.getLngLat()).toEqual({ lng: 10.5, lat: 20.25 });
    await submit();
    expect(save).toHaveBeenCalledWith({ latitude: 20.25, longitude: 10.5 });
  });

  it("writes both fields when the marker is dragged", async () => {
    const { submit, save } = await setup();

    act(() => liveMarkers()[0]?.dragTo(-3.5, 40.5));

    expect(latField().value).toBe("40.5");
    expect(lngField().value).toBe("-3.5");
    await submit();
    expect(save).toHaveBeenCalledWith({ latitude: 40.5, longitude: -3.5 });
  });

  it("rounds a map click to 6 decimals", async () => {
    const { map } = await setup();

    act(() =>
      map().emit("click", {
        lngLat: { lng: 2.123456789123, lat: 48.987654321987 },
      }),
    );

    expect(latField().value).toBe("48.987654");
    expect(lngField().value).toBe("2.123457");
  });

  it("marks the form dirty and the fields touched after a map click", async () => {
    const { map } = await setup();
    expect(screen.getByTestId("dirty").textContent).toBe("false");
    expect(touched("latitude")).toBe("false");

    act(() => map().emit("click", { lngLat: { lng: 1, lat: 2 } }));

    expect(screen.getByTestId("dirty").textContent).toBe("true");
    expect(touched("latitude")).toBe("true");
    expect(touched("longitude")).toBe("true");
  });

  it("stores null for an empty text field and 0 for a typed 0", async () => {
    const { submit, save } = await setup();

    fireEvent.change(latField(), { target: { value: "" } });
    fireEvent.change(lngField(), { target: { value: "0" } });
    await submit();

    expect(save).toHaveBeenCalledWith({ latitude: null, longitude: 0 });
  });

  it("keeps a half-typed number in the field while it is typed", async () => {
    await setup({}, { latitude: null, longitude: null });

    fireEvent.change(latField(), { target: { value: "-" } });
    expect(latField().value).toBe("-");
    fireEvent.change(latField(), { target: { value: "-1." } });
    expect(latField().value).toBe("-1.");
    fireEvent.change(latField(), { target: { value: "-1.5" } });
    expect(latField().value).toBe("-1.5");
  });

  it("refuses text that is not a number and drops a leftover sign on blur", async () => {
    const { submit, save } = await setup();

    fireEvent.change(latField(), { target: { value: "48.85x" } });
    fireEvent.change(lngField(), { target: { value: "2,35" } });
    expect(latField().value).toBe("48.85");
    expect(lngField().value).toBe("2.35");

    fireEvent.change(latField(), { target: { value: "-" } });
    fireEvent.blur(latField());
    expect(latField().value).toBe("");
    await submit();
    expect(save).toHaveBeenCalledWith({ latitude: null, longitude: 2.35 });
  });

  it("shows the latitude error for 91 and the longitude error for -181", async () => {
    const { submit, save } = await setup();

    fireEvent.change(latField(), { target: { value: "91" } });
    fireEvent.change(lngField(), { target: { value: "-181" } });
    await submit();
    expect(save).not.toHaveBeenCalled();

    const latMessage = await screen.findByText(
      "Must be a latitude between -90 and 90",
    );
    const lngMessage = await screen.findByText(
      "Must be a longitude between -180 and 180",
    );
    // Each message sits in the field that owns it.
    expect(
      latField().closest("[data-slot='field']")?.contains(latMessage),
    ).toBe(true);
    expect(
      lngField().closest("[data-slot='field']")?.contains(lngMessage),
    ).toBe(true);
    expect(latField().getAttribute("aria-invalid")).toBe("true");
    // An out-of-range pair draws no marker: MapLibre throws on one.
    expect(liveMarkers()).toHaveLength(0);
  });

  it("runs latValidate after the range check", async () => {
    const latValidate = vi.fn((value: unknown) =>
      value === 45 ? "No 45 here" : undefined,
    );
    const { submit } = await setup({ latValidate });

    fireEvent.change(latField(), { target: { value: "91" } });
    await submit();
    await screen.findByText("Must be a latitude between -90 and 90");
    expect(screen.queryByText("No 45 here")).toBeNull();

    fireEvent.change(latField(), { target: { value: "45" } });
    await submit();
    await screen.findByText("No 45 here");
    // The range check failed first for 91, so latValidate never saw it.
    expect(latValidate.mock.calls.map(([value]) => value)).not.toContain(91);
    expect(latValidate.mock.calls.map(([value]) => value)).toContain(45);
  });

  it("recentres the map when the form sets the values", async () => {
    const { map, form } = await setup();
    expect(map().eases).toEqual([]);

    act(() => form().form.reset({ latitude: 10, longitude: 20 }));
    expect(map().eases).toEqual([{ center: [20, 10] }]);

    fireEvent.change(latField(), { target: { value: "11" } });
    expect(map().eases.at(-1)).toEqual({ center: [20, 11] });
  });

  it("does not recentre the map after its own click", async () => {
    const { map, form } = await setup();

    act(() => map().emit("click", { lngLat: { lng: 10.5, lat: 20.25 } }));
    act(() => liveMarkers()[0]?.dragTo(1, 2));

    expect(map().eases).toEqual([]);

    // The guard is spent: a later outside change to the same point recentres.
    act(() => form().form.reset({ latitude: 5, longitude: 6 }));
    expect(map().eases).toEqual([{ center: [6, 5] }]);
  });

  it("calls onPositionChange for a click and a drag but not for typing or a reset", async () => {
    const onPositionChange = vi.fn();
    const { map, form } = await setup({ onPositionChange });

    fireEvent.change(latField(), { target: { value: "12" } });
    act(() => form().form.reset({ latitude: 1, longitude: 2 }));
    expect(onPositionChange).not.toHaveBeenCalled();

    act(() => map().emit("click", { lngLat: { lng: 10.1234567, lat: 20 } }));
    expect(onPositionChange).toHaveBeenLastCalledWith(20, 10.123457);

    act(() => liveMarkers()[0]?.dragTo(5, 6));
    expect(onPositionChange).toHaveBeenLastCalledWith(6, 5);
    expect(onPositionChange).toHaveBeenCalledTimes(2);
  });

  it("ignores clicks and keeps the marker fixed when disabled", async () => {
    const onPositionChange = vi.fn();
    const { map } = await setup({ disabled: true, onPositionChange });

    expect(latField().disabled).toBe(true);
    expect(lngField().disabled).toBe(true);
    expect(liveMarkers()[0]?.draggable).toBe(false);

    act(() => map().emit("click", { lngLat: { lng: 10, lat: 20 } }));

    expect(latField().value).toBe("48.85");
    expect(lngField().value).toBe("2.35");
    expect(onPositionChange).not.toHaveBeenCalled();
  });

  it("renders the label, the helper text and a draggable marker when enabled", async () => {
    await setup({ label: "Where", helperText: "Click the map" });

    expect(screen.getByText("Where")).not.toBeNull();
    expect(screen.getByText("Click the map")).not.toBeNull();
    expect(liveMarkers()[0]?.draggable).toBe(true);
  });
});
