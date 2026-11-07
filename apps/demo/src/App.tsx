/**
 * The Chelone reference admin app — the ONE canonical composition an app author
 * writes. `<BrowserRouter>` hosts it, `<Admin>` layers the whole provider stack
 * (data / query / i18n / notifications / store / resource-registry / router),
 * and each `<Resource>` declares its CRUD routes + views. Every view is built
 * from the ported `@chelone/react` components over the in-memory
 * `fakeDataProvider` wrapped for realtime (`realtime.ts`) — no server.
 */

import { createNotificationStore } from "@chelone/core";
import { makeDemoAuthProvider, makeDemoStore } from "@chelone/demo-data";
import {
  AccessDenied,
  Admin,
  AuthCallback,
  AuthenticationError,
  CustomRoutes,
  EditGuesser,
  ListGuesser,
  LoginPage,
  NotFound,
  Resource,
  ShowGuesser,
} from "@chelone/react";
import { MapsProvider } from "@chelone/react/maps";
import { QueryClient } from "@tanstack/react-query";
import {
  FileText,
  FolderTree,
  MapPin,
  Newspaper,
  Package,
  PenLine,
  ShoppingCart,
  Tags,
  Users,
} from "lucide-react";
import { BrowserRouter, Route } from "react-router";
import { authRoutes } from "./auth-routes";
import { i18n } from "./i18n";
import { mapsConfig } from "./maps-services";
import { pages } from "./pages";
import Dashboard from "./pages/dashboard";
import { dataProvider } from "./realtime";
import { resources } from "./resources";
import {
  AuthorCreate,
  AuthorEdit,
  AuthorList,
  AuthorShow,
} from "./resources/authors";
import {
  CategoryEdit,
  CategoryList,
  CategoryShow,
} from "./resources/categories";
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
import { PageEdit, PageList, PageShow } from "./resources/pages";
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

// The notification store (the Layout toaster reads it), the KV store (list
// scroll / preferences, whether the tour is done, who the Team page browses as,
// whether anyone is signed in) and the auth provider that answers from it, and
// invalidates the query client's cached answers when someone signs in or out —
// the services a real app configures. The i18n instance is in ./i18n.
const notifications = createNotificationStore();
const store = makeDemoStore();
const authProvider = makeDemoAuthProvider(store, queryClient);

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
          authProvider={authProvider}
          resources={resources}
          requireAuth
        >
          {/* Opt-in shadcn shell (sidebar + app bar + toaster). */}
          <Admin.Layout>
            <Shell />
          </Admin.Layout>

          {/* The index route, and the menu's Dashboard entry. */}
          <Admin.Dashboard>
            <Dashboard />
          </Admin.Dashboard>

          {/* Shown in place of the app while nobody is signed in: log out from
              the user menu to see it. Any email and password sign in. */}
          <Admin.LoginPage>
            <LoginPage />
          </Admin.LoginPage>

          {/* Where an OAuth provider sends the visitor back: /auth-callback with
              a code signs in, with an error shows <AuthError>. */}
          <Admin.AuthCallback>
            <AuthCallback />
          </Admin.AuthCallback>

          {/* /access-denied is where a role that may not open a page lands, as
              the Team page's viewer does on /posts/create. */}
          <Admin.AccessDenied>
            <AccessDenied />
          </Admin.AccessDenied>

          <Admin.AuthenticationError>
            <AuthenticationError />
          </Admin.AuthenticationError>

          {/* A URL no route owns, such as /nowhere. */}
          <Admin.CatchAll>
            <NotFound />
          </Admin.CatchAll>

          {/* QUICKSTART: `posts` carries a Zod schema (see resources/index.ts →
            resources/posts.tsx). The Edit/Create forms validate against it
            automatically (the D6 registry-schema default validator). */}
          <Resource
            name="posts"
            icon={Newspaper}
            list={PostList}
            edit={PostEdit}
            create={PostCreate}
            show={PostShow}
          />
          <Resource
            name="authors"
            icon={PenLine}
            list={AuthorList}
            edit={AuthorEdit}
            create={AuthorCreate}
            show={AuthorShow}
          />
          <Resource
            name="products"
            icon={Package}
            list={ProductList}
            edit={ProductEdit}
            create={ProductCreate}
            show={ProductShow}
          />
          <Resource
            name="customers"
            icon={Users}
            list={CustomerList}
            edit={CustomerEdit}
            create={CustomerCreate}
            show={CustomerShow}
          />
          <Resource
            name="orders"
            icon={ShoppingCart}
            list={OrderList}
            edit={OrderEdit}
            create={OrderCreate}
            show={OrderShow}
          />
          <Resource
            name="places"
            icon={MapPin}
            list={PlaceList}
            edit={PlaceEdit}
            create={PlaceCreate}
            show={PlaceShow}
          />
          <Resource
            name="pages"
            icon={FileText}
            list={PageList}
            edit={PageEdit}
            show={PageShow}
          />
          <Resource
            name="categories"
            icon={FolderTree}
            recordRepresentation="name.en"
            list={CategoryList}
            edit={CategoryEdit}
            show={CategoryShow}
          />
          {/* No hand-written views yet: the guesser builds them from the
              schema in resources/index.ts. */}
          <Resource
            name="tags"
            icon={Tags}
            list={ListGuesser}
            edit={EditGuesser}
            show={ShowGuesser}
          />

          {/* The Supabase auth pages, outside the layout (see auth-routes.tsx). */}
          <CustomRoutes noLayout>{authRoutes}</CustomRoutes>

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
