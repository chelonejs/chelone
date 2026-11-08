/**
 * `<Admin routes={false}>` leaves every URL to the host app's own routes. The
 * shell still gates, lays out and registers resources, and renders the host's
 * matched child route where the route table would sit.
 */

import type { AuthProvider } from "@chelone/core";
import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextInput } from "../components/admin/inputs/text-input";
import { DataTable } from "../components/admin/list/data-table";
import { Edit } from "../components/admin/views/edit";
import { List } from "../components/admin/views/list";
import { useResourceDefinitions } from "../resource/registry-hooks";
import { Resource } from "../resource/resource";
import { Admin } from "./admin";
import { useHasDashboard } from "./has-dashboard";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeDataProvider() {
  return fakeDataProvider({
    posts: [
      { id: 1, title: "Alpha" },
      { id: 2, title: "Beta" },
    ],
  });
}

function makeAuthProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...overrides,
  };
}

function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <div data-testid="layout">
      <nav>menu</nav>
      {children}
    </div>
  );
}

/** A host that owns `/admin/*` itself and mounts `<Admin routes={false}>` there. */
function Host({
  entry,
  path = "/admin",
  children,
  adminChildren,
  authProvider,
  requireAuth,
  dataProvider = makeDataProvider(),
}: {
  entry: string;
  /** The host route's path: a splat gives `<Admin>` every path under it. */
  path?: string;
  children?: ReactNode;
  adminChildren?: ReactNode;
  authProvider?: AuthProvider;
  requireAuth?: boolean;
  dataProvider?: ReturnType<typeof makeDataProvider>;
}) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path={path}
          element={
            <Admin
              routes={false}
              basename="/admin"
              dataProvider={dataProvider}
              queryClient={makeQueryClient()}
              authProvider={authProvider}
              requireAuth={requireAuth}
            >
              <Resource name="posts" list={() => null} edit={() => null} />
              <Admin.Layout>
                <AppLayout />
              </Admin.Layout>
              <Admin.CatchAll>
                <div data-testid="catch-all">catch all</div>
              </Admin.CatchAll>
              <Admin.Loading>
                <div data-testid="loading">loading</div>
              </Admin.Loading>
              <Admin.LoginPage>
                <div data-testid="login">login</div>
              </Admin.LoginPage>
              {adminChildren}
            </Admin>
          }
        >
          {children}
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

const Table = (
  <DataTable>
    <DataTable.Col source="title" />
  </DataTable>
);

describe("<Admin routes={false}>", () => {
  it("an app route renders a chelone page inside the layout", async () => {
    const dataProvider = makeDataProvider();
    const getList = vi.spyOn(dataProvider, "getList");
    render(
      <Host entry="/admin/posts" dataProvider={dataProvider}>
        <Route path="posts" element={<List resource="posts">{Table}</List>} />
      </Host>,
    );

    const layout = await screen.findByTestId("layout");
    expect(await screen.findByText("Alpha")).toBeTruthy();
    expect(layout.contains(screen.getByText("Beta"))).toBe(true);
    expect(getList).toHaveBeenCalledWith("posts", expect.anything());
  });

  it("a route-less Admin owns no path", async () => {
    render(<Host entry="/admin/nowhere" path="/admin/*" />);

    const layout = await screen.findByTestId("layout");
    expect(layout.querySelector("nav")).not.toBeNull();
    expect(screen.queryByTestId("catch-all")).toBeNull();
  });

  it("a route-less Admin gates its outlet", async () => {
    const page = vi.fn();
    function Page() {
      page();
      return <div data-testid="page">page</div>;
    }

    let rejectAuth: (error: Error) => void = () => {};
    const pending = makeAuthProvider({
      checkAuth: () =>
        new Promise<void>((_resolve, reject) => {
          rejectAuth = reject;
        }),
    });
    render(
      <Host entry="/admin/posts" authProvider={pending} requireAuth>
        <Route path="posts" element={<Page />} />
      </Host>,
    );

    expect(await screen.findByTestId("loading")).toBeTruthy();
    expect(screen.queryByTestId("layout")).toBeNull();
    expect(page).not.toHaveBeenCalled();

    rejectAuth(new Error("no session"));
    expect(await screen.findByTestId("login")).toBeTruthy();
    expect(screen.queryByTestId("loading")).toBeNull();
    expect(page).not.toHaveBeenCalled();
  });

  it("resources register with no route", async () => {
    function Probe() {
      const definitions = useResourceDefinitions();
      return (
        <div data-testid="probe">
          {definitions.posts?.hasEdit ? "posts:edit" : "none"}
        </div>
      );
    }
    render(
      <Host entry="/admin/posts">
        <Route path="posts" element={<Probe />} />
      </Host>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("probe").textContent).toBe("posts:edit"),
    );
  });

  it("an app route renders Edit by its id param", async () => {
    const dataProvider = makeDataProvider();
    const getOne = vi.spyOn(dataProvider, "getOne");
    render(
      <Host entry="/admin/posts/1" dataProvider={dataProvider}>
        <Route
          path="posts/:id"
          element={
            <Edit resource="posts">
              <TextInput source="title" />
            </Edit>
          }
        />
      </Host>,
    );

    await waitFor(() =>
      expect(getOne).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({ id: "1" }),
      ),
    );
    expect(await screen.findByRole("heading", { name: "Alpha" })).toBeTruthy();
  });

  it("a dashboard slot adds no menu entry, since no route renders it", async () => {
    function Probe() {
      return (
        <div data-testid="probe">
          {useHasDashboard() ? "dashboard" : "no dashboard"}
        </div>
      );
    }
    render(
      <Host
        entry="/admin/posts"
        adminChildren={
          <Admin.Dashboard>
            <div data-testid="dashboard">dashboard</div>
          </Admin.Dashboard>
        }
      >
        <Route path="posts" element={<Probe />} />
      </Host>,
    );

    expect((await screen.findByTestId("probe")).textContent).toBe(
      "no dashboard",
    );
    expect(screen.queryByTestId("dashboard")).toBeNull();
  });
});
