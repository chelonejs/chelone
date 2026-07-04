/**
 * The Chelone reference admin app — the ONE canonical composition an app author
 * writes. `<BrowserRouter>` hosts it, `<Admin>` layers the whole provider stack
 * (data / query / i18n / notifications / store / resource-registry / router),
 * and each `<Resource>` declares its CRUD routes + views. Every view is built
 * from the ported `@chelone/react` components over the in-memory
 * `fakeDataProvider` — no server.
 */

import {
  createNotificationStore,
  createStore,
  fakeDataProvider,
} from "@chelone/core";
import { Admin, Layout, Resource } from "@chelone/react";
import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { makeI18n } from "./i18n";
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
import { PostCreate, PostEdit, PostList, PostShow } from "./resources/posts";
import {
  ProductCreate,
  ProductEdit,
  ProductList,
  ProductShow,
} from "./resources/products";
import { seedData } from "./seed";

// One QueryClient for the app lifetime (module scope — stable across renders).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 5 * 60 * 1000 },
    mutations: { retry: false },
  },
});

// The in-memory provider, seeded once (it mutates its data in place).
const dataProvider = fakeDataProvider(seedData());

// The i18n instance, notification store (the Layout toaster reads it), and the
// KV store (list scroll / preferences) — the services a real app configures.
const i18n = makeI18n();
const notifications = createNotificationStore();
const store = createStore();

export function App() {
  return (
    <BrowserRouter>
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
          <Layout />
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
      </Admin>
    </BrowserRouter>
  );
}
