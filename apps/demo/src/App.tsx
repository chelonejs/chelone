/**
 * The Chelone reference admin app — the ONE canonical composition an app author
 * writes. `<BrowserRouter>` hosts it, `<Admin>` layers the whole provider stack
 * (data / query / i18n / notifications / store / resource-registry / router),
 * and each `<Resource>` declares its CRUD routes + views. Every view is built
 * from the ported `@chelone/react` components over the in-memory
 * `fakeDataProvider` wrapped for realtime (`realtime.ts`) — no server.
 */

import { createNotificationStore, createStore } from "@chelone/core";
import { makeI18n } from "@chelone/demo-data";
import {
  Admin,
  CustomRoutes,
  EditGuesser,
  ListGuesser,
  Resource,
  ShowGuesser,
} from "@chelone/react";
import { MapsProvider } from "@chelone/react/maps";
import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter, Route } from "react-router";
import { mapsConfig } from "./maps-services";
import { pages } from "./pages";
import { dataProvider } from "./realtime";
import { resources } from "./resources";
import {
  AuthorCreate,
  AuthorEdit,
  AuthorList,
  AuthorShow,
} from "./resources/authors";
import {
  CustomerCreate,
  CustomerEdit,
  CustomerList,
  CustomerShow,
} from "./resources/customers";
import {
  OrderCreate,
  OrderEdit,
  OrderList,
  OrderShow,
} from "./resources/orders";
import {
  PlaceCreate,
  PlaceEdit,
  PlaceList,
  PlaceShow,
} from "./resources/places";
import { PostCreate, PostEdit, PostList, PostShow } from "./resources/posts";
import {
  ProductCreate,
  ProductEdit,
  ProductList,
  ProductShow,
} from "./resources/products";
import { Shell } from "./shell";

// One QueryClient for the app lifetime (module scope — stable across renders).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 5 * 60 * 1000 },
    mutations: { retry: false },
  },
});

// The i18n instance, notification store (the Layout toaster reads it), and the
// KV store (list scroll / preferences) — the services a real app configures.
const i18n = makeI18n();
const notifications = createNotificationStore();
const store = createStore();

export function App() {
  return (
    // basename="/demo" — the app is served under `/demo/` on the deployed site
    // (and under Vite's `base` in dev), so its client routes live below that
    // prefix. Mirrors vite.config.ts `base: "/demo/"`.
    <BrowserRouter basename="/demo">
      {/* The map services every maps view reads: the public OpenStreetMap
          ones, which suit this demo only (see maps-services.ts). */}
      <MapsProvider {...mapsConfig}>
        <Admin
          dataProvider={dataProvider}
          queryClient={queryClient}
          i18n={i18n}
          notifications={notifications}
          store={store}
          resources={resources}
        >
          {/* Opt-in shadcn shell (sidebar + app bar + toaster). */}
          <Admin.Layout>
            <Shell />
          </Admin.Layout>

          {/* QUICKSTART: `posts` carries a Zod schema (see resources/index.ts →
            resources/posts.tsx). The Edit/Create forms validate against it
            automatically (the D6 registry-schema default validator). */}
          <Resource
            name="posts"
            list={PostList}
            edit={PostEdit}
            create={PostCreate}
            show={PostShow}
          />
          <Resource
            name="authors"
            list={AuthorList}
            edit={AuthorEdit}
            create={AuthorCreate}
            show={AuthorShow}
          />
          <Resource
            name="products"
            list={ProductList}
            edit={ProductEdit}
            create={ProductCreate}
            show={ProductShow}
          />
          <Resource
            name="customers"
            list={CustomerList}
            edit={CustomerEdit}
            create={CustomerCreate}
            show={CustomerShow}
          />
          <Resource
            name="orders"
            list={OrderList}
            edit={OrderEdit}
            create={OrderCreate}
            show={OrderShow}
          />
          <Resource
            name="places"
            list={PlaceList}
            edit={PlaceEdit}
            create={PlaceCreate}
            show={PlaceShow}
          />
          {/* No hand-written views yet: the guessers build them from the
              schemas in resources/index.ts. */}
          {["pages", "categories", "tags"].map((name) => (
            <Resource
              key={name}
              name={name}
              list={ListGuesser}
              edit={EditGuesser}
              show={ShowGuesser}
            />
          ))}

          {/* One route per file in src/pages (see pages.tsx). */}
          <CustomRoutes>
            {pages.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
          </CustomRoutes>
        </Admin>
      </MapsProvider>
    </BrowserRouter>
  );
}
