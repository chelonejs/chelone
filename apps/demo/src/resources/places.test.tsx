/**
 * The places views mounted under `<Admin>` the way `App.tsx` mounts them: the
 * demo's seed data and registered `resources`, inside a `MapsProvider` of test
 * providers so no view reaches OpenStreetMap. jsdom has no WebGL, so the map
 * engine is the react package's fake, as `save-buttons.test.tsx` uses it.
 *
 * The rejected saves are the point of registering `placeSchema`: a form that
 * breaks it never reaches the data provider.
 */
import { createNotificationStore, fakeDataProvider } from "@chelone/core";
import { makeDemoI18n, seedData } from "@chelone/demo-data";
import { Admin, Resource } from "@chelone/react";
import { MapsProvider } from "@chelone/react/maps";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
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
        overpass={{ name: "test", query: async () => ({ elements: [] }) }}
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
