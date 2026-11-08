import { createNotificationStore, fakeDataProvider } from "@chelone/core";
import { makeDemoI18n, seedData } from "@chelone/demo-data";
import { Admin, Resource } from "@chelone/react";
import { MapsProvider } from "@chelone/react/maps";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { resources } from ".";
import { AuthorCreate, AuthorEdit } from "./authors";
import { CategoryEdit } from "./categories";
import { CustomerCreate } from "./customers";
import { OrderCreate, OrderEdit } from "./orders";
import { PageEdit } from "./pages";
import { PlaceCreate, PlaceEdit } from "./places";

// jsdom has no WebGL. Keep the real demo form and replace only the map engine.
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

function renderForm(
  resource: keyof typeof resources,
  form: ReactElement,
  path = "/1",
) {
  render(
    <MemoryRouter initialEntries={[`/${resource}${path}`]}>
      <Admin
        dataProvider={fakeDataProvider(seedData())}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={makeDemoI18n().i18n}
        notifications={createNotificationStore()}
        resources={resources}
      >
        <Admin.Layout>
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
            {null}
          </MapsProvider>
        </Admin.Layout>
        <Resource name={resource} edit={form} create={form} />
      </Admin>
    </MemoryRouter>,
  );
}

const forms = [
  { name: "PlaceEdit", resource: "places", form: <PlaceEdit />, path: "/1" },
  {
    name: "PlaceCreate",
    resource: "places",
    form: <PlaceCreate />,
    path: "/create",
  },
  { name: "PageEdit", resource: "pages", form: <PageEdit />, path: "/1" },
  {
    name: "CustomerCreate",
    resource: "customers",
    form: <CustomerCreate />,
    path: "/create",
  },
  { name: "OrderEdit", resource: "orders", form: <OrderEdit />, path: "/1" },
  {
    name: "OrderCreate",
    resource: "orders",
    form: <OrderCreate />,
    path: "/create",
  },
  {
    name: "CategoryEdit",
    resource: "categories",
    form: <CategoryEdit />,
    path: "/1",
  },
  { name: "AuthorEdit", resource: "authors", form: <AuthorEdit />, path: "/1" },
  {
    name: "AuthorCreate",
    resource: "authors",
    form: <AuthorCreate />,
    path: "/create",
  },
] satisfies {
  name: string;
  resource: keyof typeof resources;
  form: ReactElement;
  path: string;
}[];

test.each(forms)(
  "$name shows a save button",
  async ({ resource, form, path }) => {
    renderForm(resource, form, path);
    expect(await screen.findByRole("button", { name: "Save" })).toBeTruthy();
    if (path === "/create") {
      expect(
        within(screen.getByRole("toolbar", { name: "" })).queryByRole(
          "button",
          { name: "Delete" },
        ),
      ).toBeNull();
    }
  },
);
