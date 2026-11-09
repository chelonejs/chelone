/**
 * The places views mounted under `<Admin>` the way `App.tsx` mounts them: the
 * demo's seed data and registered `resources`, inside a `MapsProvider` of test
 * providers so no view reaches OpenStreetMap. jsdom has no WebGL, so the map
 * engine is the react package's fake, as `save-buttons.test.tsx` uses it.
 *
 * The rejected saves are the point of registering `placeSchema`: a form that
 * breaks it never reaches the data provider. The saves that carry a `null`
 * shape are the other half: `ShapeInput`, `OsmFeatureOperator` and
 * `GeocodingInput` all write `null` for a value that is no longer there, and
 * the schema takes it.
 */
import {
  createNotificationStore,
  fakeDataProvider,
  type OverpassElement,
} from "@chelone/core";
import { makeDemoI18n, seedData } from "@chelone/demo-data";
import { Admin, Resource } from "@chelone/react";
import { MapsProvider } from "@chelone/react/maps";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import {
  liveDraws,
  type TerraDraw,
} from "../../../../packages/react/src/components/maps-draw/__fixtures__/fake-terra-draw";
import { resources } from ".";
import { PlaceCreate, PlaceEdit, PlaceList, PlaceShow } from "./places";

// jsdom has no WebGL. Keep the real demo views and replace only the map engine.
vi.mock(
  "maplibre-gl",
  () =>
    import(
      "../../../../packages/react/src/components/maps/__fixtures__/fake-maplibre"
    ),
);
vi.mock(
  "terra-draw",
  () =>
    import(
      "../../../../packages/react/src/components/maps-draw/__fixtures__/fake-terra-draw"
    ),
);
vi.mock(
  "terra-draw-maplibre-gl-adapter",
  () =>
    import(
      "../../../../packages/react/src/components/maps-draw/__fixtures__/fake-terra-draw"
    ),
);

afterEach(cleanup);

/**
 * An OpenStreetMap area wide enough to cover every shape of the seed place, so
 * a subtract leaves nothing. Overpass sends a way's coordinates with `out geom`;
 * core's `OverpassElement` names only the keys every element carries.
 */
const coveringWater = {
  type: "way",
  id: 1,
  tags: { natural: "water" },
  geometry: [
    { lat: 38.7, lon: -9.15 },
    { lat: 38.72, lon: -9.15 },
    { lat: 38.72, lon: -9.12 },
    { lat: 38.7, lon: -9.12 },
    { lat: 38.7, lon: -9.15 },
  ],
} satisfies OverpassElement & {
  geometry: readonly { lat: number; lon: number }[];
};

interface Page {
  routes: {
    list?: ReactElement;
    edit?: ReactElement;
    create?: ReactElement;
    show?: ReactElement;
  };
  path?: string;
}

function renderPage({ routes, path = "" }: Page) {
  const dataProvider = fakeDataProvider(seedData());
  const calls = {
    create: vi.spyOn(dataProvider, "create"),
    getList: vi.spyOn(dataProvider, "getList"),
    getOne: vi.spyOn(dataProvider, "getOne"),
    update: vi.spyOn(dataProvider, "update"),
  };
  render(
    <MemoryRouter initialEntries={[`/places${path}`]}>
      <MapsProvider
        mapStyle={{ version: 8, sources: {}, layers: [] }}
        geocoder={{
          name: "test",
          search: async () => [],
          reverse: async () => null,
        }}
        overpass={{
          name: "test",
          query: async () => ({ elements: [coveringWater] }),
        }}
        router={{ name: "test", snapToRoad: async () => null }}
      >
        <Admin
          dataProvider={dataProvider}
          queryClient={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
          i18n={makeDemoI18n().i18n}
          notifications={createNotificationStore()}
          resources={resources}
        >
          <Resource name="places" {...routes} />
        </Admin>
      </MapsProvider>
    </MemoryRouter>,
  );
  return calls;
}

function input(label: RegExp): HTMLInputElement {
  return elementOf(screen.getByLabelText(label), HTMLInputElement);
}

/** Lets each fake map load and each Terra Draw instance report itself ready. */
async function readyTheMaps(): Promise<void> {
  // The fake map fires `load` on a microtask and `useTerraDraw` builds its
  // instance from the map, so the instances exist only after a flush.
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    for (const draw of liveDraws()) draw.emitReady();
  });
}

/** The draw instance whose toolbar was clicked, found by the mode it switched to. */
function drawInMode(mode: string): TerraDraw {
  return defined(liveDraws().find((draw) => draw.modeCalls.includes(mode)));
}

test("PlaceList lists each place with its address", async () => {
  const calls = renderPage({ routes: { list: <PlaceList /> } });

  await screen.findByText("Praça do Comércio");
  expect(screen.getByText("Praça do Comércio, 1100-148 Lisboa")).toBeTruthy();
  expect(calls.getList).toHaveBeenCalledWith("places", expect.anything());
});

test("PlaceShow shows the place, its fields and its point", async () => {
  const calls = renderPage({
    routes: { show: <PlaceShow /> },
    path: "/1/show",
  });

  // `<Show>` titles the page with the record's own name, so the name is a heading.
  await screen.findByRole("heading", { name: "Praça do Comércio" });
  // The test geocoder answers nothing, so the address field falls back to the
  // coordinates it read off the record.
  expect(await screen.findByText("38.7075, -9.1364")).toBeTruthy();
  expect(calls.getOne).toHaveBeenCalledWith(
    "places",
    expect.objectContaining({ id: "1" }),
  );
  for (const field of ["zone", "bbox", "area", "route"]) {
    expect(document.querySelector(`[data-field="${field}"]`)).not.toBeNull();
  }
});

test("PlaceEdit loads the place into the form and saves an edit", async () => {
  const calls = renderPage({ routes: { edit: <PlaceEdit /> }, path: "/1" });

  await waitFor(() => expect(input(/^name$/i).value).toBe("Praça do Comércio"));
  expect(input(/^address$/i).value).toBe("Praça do Comércio, 1100-148 Lisboa");
  expect(calls.getOne).toHaveBeenCalledWith(
    "places",
    expect.objectContaining({ id: "1" }),
  );

  fireEvent.change(input(/^name$/i), {
    target: { value: "Praça da República" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1));
  expect(calls.update).toHaveBeenCalledWith(
    "places",
    expect.objectContaining({
      id: "1",
      data: expect.objectContaining({ name: "Praça da República" }),
    }),
  );
});

test("PlaceEdit saves a place whose delivery zone was emptied", async () => {
  const calls = renderPage({ routes: { edit: <PlaceEdit /> }, path: "/1" });
  await waitFor(() => expect(input(/^name$/i).value).toBe("Praça do Comércio"));
  await readyTheMaps();

  const zone = elementOf(
    document.querySelector('[data-field="zone"]'),
    HTMLDivElement,
  );
  fireEvent.click(within(zone).getByRole("button", { name: "Edit" }));
  const draw = drawInMode("select");
  const stored = defined(draw.features[0]?.id);

  // The select mode's Delete key, which leaves the field with no feature.
  await act(async () => {
    draw.deleteFromStore(stored);
  });

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1));
  expect(calls.update).toHaveBeenCalledWith(
    "places",
    expect.objectContaining({
      data: expect.objectContaining({ zone: null }),
    }),
  );
});

test("PlaceEdit saves a place whose area an OSM subtract left nothing of", async () => {
  const calls = renderPage({ routes: { edit: <PlaceEdit /> }, path: "/1" });
  await waitFor(() => expect(input(/^name$/i).value).toBe("Praça do Comércio"));

  const subtract = screen.getByRole("button", {
    name: "Subtract OpenStreetMap areas",
  });
  // The test overpass answers with an area that covers the place's own, so the
  // subtract writes null.
  await act(async () => {
    fireEvent.click(subtract);
  });

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1));
  expect(calls.update).toHaveBeenCalledWith(
    "places",
    expect.objectContaining({
      data: expect.objectContaining({ area: null }),
    }),
  );
});

test("PlaceEdit blocks a save the places schema rejects", async () => {
  const calls = renderPage({ routes: { edit: <PlaceEdit /> }, path: "/1" });

  await waitFor(() => expect(input(/^name$/i).value).toBe("Praça do Comércio"));
  fireEvent.change(input(/^name$/i), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Name is required");
  expect(calls.update).not.toHaveBeenCalled();
});

test("PlaceCreate blocks an empty save the places schema rejects", async () => {
  const calls = renderPage({
    routes: { create: <PlaceCreate /> },
    path: "/create",
  });

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByText("Name is required");
  expect(calls.create).not.toHaveBeenCalled();
});

test("PlaceCreate saves a hand-typed address with a point set by hand", async () => {
  const calls = renderPage({
    routes: { create: <PlaceCreate /> },
    path: "/create",
  });

  fireEvent.change(input(/^name$/i), { target: { value: "Rua do Alecrim" } });
  const address = input(/^address$/i);
  fireEvent.change(address, {
    target: { value: "Rua do Alecrim, 1200-047 Lisboa" },
  });
  // An address typed instead of picked nulls the box a picked one wrote.
  fireEvent.blur(address);

  fireEvent.change(input(/^lat$/i), { target: { value: "38.7161" } });
  fireEvent.blur(input(/^lat$/i));
  fireEvent.change(input(/^lng$/i), { target: { value: "-9.1467" } });
  fireEvent.blur(input(/^lng$/i));

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(calls.create).toHaveBeenCalledTimes(1));
  expect(calls.create).toHaveBeenCalledWith(
    "places",
    expect.objectContaining({
      data: expect.objectContaining({
        name: "Rua do Alecrim",
        lat: 38.7161,
        lng: -9.1467,
        bbox: null,
      }),
    }),
  );
});
