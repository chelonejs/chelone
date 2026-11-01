/**
 * The Chelone reference admin app — the ONE canonical composition an app author
 * writes. `<BrowserRouter>` hosts it, `<Admin>` layers the whole provider stack
 * (data / query / i18n / notifications / store / resource-registry / router),
 * and each `<Resource>` declares its CRUD routes + views. Every view is built
 * from the ported `@chelone/react` components over the in-memory
 * `fakeDataProvider` wrapped for realtime (`realtime.ts`) — no server.
 */

import { createNotificationStore, createStore } from "@chelone/core";
import { Admin, Layout, Menu, MenuLive, Resource } from "@chelone/react";
import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { makeI18n } from "./i18n";
import { dataProvider } from "./realtime";
import { SimulateOtherUser } from "./realtime-sim";
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

// Posts get a live unread badge; the other resources keep their plain links.
// The panel is repeated here because the badge clears while /posts is open:
// adding a post from any other page is the only way to see it.
function DemoMenu() {
  return (
    <>
      <div className="px-4 pt-2 text-sm">
        <MenuLive
          items={[{ to: "/posts", resource: "posts", label: "Posts" }]}
        />
      </div>
      <Menu>
        <Menu.ResourceItem name="authors" />
        <Menu.ResourceItem name="products" />
        <Menu.ResourceItem name="customers" />
        <Menu.ResourceItem name="orders" />
      </Menu>
      <div className="px-4 pt-2">
        <SimulateOtherUser />
      </div>
    </>
  );
}

export function App() {
  return (
    // basename="/demo" — the app is served under `/demo/` on the deployed site
    // (and under Vite's `base` in dev), so its client routes live below that
    // prefix. Mirrors vite.config.ts `base: "/demo/"`.
    <BrowserRouter basename="/demo">
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
          <Layout menu={DemoMenu} />
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
