/**
 * W1-T6 tests (façade): `<Admin>` = provider-config props + partitioned
 * children. It layers the P6 shell contexts onto the EXISTING `<CheloneProvider>`
 * (P2–P5) in the parity order (§0a-2), hoists page slots out of the children,
 * and lets a page-slot PROP override the matching child (the escape hatch —
 * prop wins). The low-level `<AdminContext>` + `<AdminUI>` split stays available
 * as a documented escape hatch.
 *
 * The routing engine is W1-T7: here `<AdminUI>` renders a placeholder that T7's
 * `AdminRoutes` fills. These tests assert the SEAM — partitioned children + the
 * page slots reach the shell — not full routing.
 */

import {
  createI18n,
  createStore,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../components/admin/layout/layout";
import { ThemeProvider } from "../components/admin/layout/theme-provider";
import { DataTable } from "../components/admin/list/data-table";
import { List as ListView } from "../components/admin/views/list";
import { CheloneProvider, useCheloneContext } from "../context";
import { useTranslate } from "../i18n-hooks";
import { useNotify } from "../notification-hooks";
import {
  useResourceDefinitions,
  useResourceRegistry,
} from "../resource/registry-hooks";
import { Resource } from "../resource/resource";
import { useRouterAdapter } from "../router/adapter";
import { useBasename } from "../router/context";
import { useRedirect } from "../router/nav-hooks";
import { reactRouterAdapter } from "../router/react-router-adapter";
import { tanstackRouterAdapter } from "../router/tanstack-router-adapter";
import { Admin } from "./admin";
import { AdminContext } from "./admin-context";
import { AdminUI } from "./admin-ui";
import { AdminDashboard, AdminTitle } from "./slots";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("light", "dark");
});

const dataProvider = fakeDataProvider({});
const List = () => <div>list</div>;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

/** A probe that reads every context the shell is expected to provide. */
function ContextProbe() {
  const chelone = useCheloneContext();
  const adapter = useRouterAdapter();
  const basename = useBasename();
  const registry = useResourceRegistry();
  return (
    <div>
      <div data-testid="has-data">{String(chelone.dataProvider != null)}</div>
      <div data-testid="has-adapter">{String(adapter != null)}</div>
      <div data-testid="basename">{basename}</div>
      <div data-testid="has-registry">{String(registry != null)}</div>
    </div>
  );
}

describe("<Admin> — provider stack (parity §0a-2 order)", () => {
  // The probe rides in the DASHBOARD slot — the placeholder shell renders the
  // dashboard at the index route, so it is a reachable point INSIDE the full
  // provider stack. (Arbitrary non-marker <Admin> children are ignored by the
  // partition, by design — they are not a render slot.)
  it("provides Chelone data context, the router adapter, the registry, and basename", () => {
    render(
      // Join a host router so the app basename '/app' is a pure context value
      // (a created router would instead need the jsdom URL to sit under /app).
      <MemoryRouter initialEntries={["/"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          basename="/app"
        >
          <AdminDashboard>
            <ContextProbe />
          </AdminDashboard>
        </Admin>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("has-data").textContent).toBe("true");
    expect(screen.getByTestId("has-adapter").textContent).toBe("true");
    expect(screen.getByTestId("has-registry").textContent).toBe("true");
    expect(screen.getByTestId("basename").textContent).toBe("/app");
  });

  it("defaults basename to '' when not supplied", () => {
    render(
      <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
        <AdminDashboard>
          <ContextProbe />
        </AdminDashboard>
      </Admin>,
    );
    expect(screen.getByTestId("basename").textContent).toBe("");
  });

  it("creates its own router when not already inside one (RouterWrapper create path)", () => {
    // No host <MemoryRouter> — RouterWrapper must create a real-path router so
    // the shell renders. If it failed to create one, the dashboard slot (and
    // thus the probe) would never mount.
    render(
      <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
        <AdminDashboard>
          <ContextProbe />
        </AdminDashboard>
      </Admin>,
    );
    expect(screen.getByTestId("has-adapter").textContent).toBe("true");
  });

  it("joins a host router when already inside one (RouterWrapper join path)", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <AdminDashboard>
            <ContextProbe />
          </AdminDashboard>
        </Admin>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("has-adapter").textContent).toBe("true");
  });

  it("uses the injected router adapter when supplied (react-router default overridable)", async () => {
    // Supplying the tanstack adapter proves the `router` prop is wired into
    // RouterAdapterContext at the top of the stack: the probe (in the dashboard
    // slot) reads that identity back. No host router — the tanstack adapter's
    // RouterWrapper CREATES its own router, which boots ASYNC (a genuine
    // reference-slot property, per the W1-T4 suite), so we `findBy`/`waitFor`.
    function AdapterName() {
      const adapter = useRouterAdapter();
      return (
        <div data-testid="adapter-is-tanstack">
          {String(adapter === tanstackRouterAdapter)}
        </div>
      );
    }
    render(
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        router={tanstackRouterAdapter}
      >
        <AdminDashboard>
          <AdapterName />
        </AdminDashboard>
      </Admin>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("adapter-is-tanstack").textContent).toBe(
        "true",
      ),
    );
  });
});

describe("<Admin> — page slots reach the shell", () => {
  it("renders the dashboard slot content at the index route", () => {
    render(
      <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
        <AdminDashboard>
          <div data-testid="dash">dashboard here</div>
        </AdminDashboard>
        <Resource name="posts" list={List} />
      </Admin>,
    );
    expect(screen.getByTestId("dash")).toBeDefined();
  });

  it("prop overrides the matching child slot (prop wins — escape hatch)", () => {
    render(
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        dashboard={<div data-testid="dash-prop">from prop</div>}
      >
        <AdminDashboard>
          <div data-testid="dash-child">from child</div>
        </AdminDashboard>
        <Resource name="posts" list={List} />
      </Admin>,
    );
    expect(screen.queryByTestId("dash-prop")).not.toBeNull();
    expect(screen.queryByTestId("dash-child")).toBeNull();
  });

  it("registers resources declared as children (registry populated)", async () => {
    // Subscribe (useResourceDefinitions) so the probe re-renders when the
    // register-on-mount effect lands (registration is lazy — an effect, not
    // render-phase, so a discarded render never mutates the shared registry).
    function RegistrySize() {
      const definitions = useResourceDefinitions();
      return <div data-testid="count">{Object.keys(definitions).length}</div>;
    }
    render(
      <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
        <Resource name="posts" list={List} />
        <Resource name="comments" list={List} />
        {/* The size probe rides in the dashboard slot (a rendered position). */}
        <AdminDashboard>
          <RegistrySize />
        </AdminDashboard>
      </Admin>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2"),
    );
  });
});

describe("escape hatch — <AdminContext> + <AdminUI> split", () => {
  it("<AdminContext> alone provides the stack; <AdminUI> renders the shell separately", () => {
    render(
      <AdminContext
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        adapter={reactRouterAdapter}
      >
        <AdminUI title={<AdminTitle>App</AdminTitle>}>
          <Resource name="posts" list={List} />
          <AdminDashboard>
            <div data-testid="dash-split">split dashboard</div>
          </AdminDashboard>
        </AdminUI>
      </AdminContext>,
    );
    expect(screen.getByTestId("dash-split")).toBeDefined();
  });

  it("<AdminContext> provides every shell context (probe renders inside it)", () => {
    render(
      // Join a host router so the app basename '/back' is a pure context value
      // (an <AdminContext>-created router would need the jsdom URL under /back).
      <MemoryRouter initialEntries={["/"]}>
        <AdminContext
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          adapter={reactRouterAdapter}
          basename="/back"
        >
          <ContextProbe />
        </AdminContext>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("has-data").textContent).toBe("true");
    expect(screen.getByTestId("has-adapter").textContent).toBe("true");
    expect(screen.getByTestId("has-registry").textContent).toBe("true");
    expect(screen.getByTestId("basename").textContent).toBe("/back");
  });
});

describe("<Admin> — optional services", () => {
  it("a default Admin renders with only dataProvider and queryClient", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Admin.Layout>
            <Layout />
          </Admin.Layout>
          <Admin.Dashboard>
            <div>dash</div>
          </Admin.Dashboard>
        </Admin>
      </MemoryRouter>,
    );

    expect(screen.getByText("dash")).toBeTruthy();
  });

  it("the default layout's theme toggle sets the dark class", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Admin.Layout>
            <Layout />
          </Admin.Layout>
          <Admin.Dashboard>
            <div>dash</div>
          </Admin.Dashboard>
        </Admin>
      </MemoryRouter>,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: /toggle light\/dark/i }),
      {
        key: "Enter",
      },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: /dark/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("an app's own ThemeProvider above Admin keeps its default and key", async () => {
    const queryClient = makeQueryClient();
    const store = createStore();
    render(
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        store={store}
      >
        <ThemeProvider defaultTheme="dark" storageKey="my-theme">
          <MemoryRouter initialEntries={["/"]}>
            <Admin dataProvider={dataProvider} queryClient={queryClient}>
              <Admin.Layout>
                <Layout />
              </Admin.Layout>
              <Admin.Dashboard>
                <div>dash</div>
              </Admin.Dashboard>
            </Admin>
          </MemoryRouter>
        </ThemeProvider>
      </CheloneProvider>,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: /toggle light\/dark/i }),
      {
        key: "Enter",
      },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: /light/i }));

    expect(store.getItem("my-theme")).toBe("light");
    expect(store.getItem("chelone-theme")).toBeUndefined();
  });

  it("without i18n, a default label keeps its {_} text and fills its placeholders", () => {
    function Greeting() {
      const translate = useTranslate();
      return (
        <div>{translate("app.greet", { _: "Hello {name}", name: "Ada" })}</div>
      );
    }
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Admin.Dashboard>
            <Greeting />
          </Admin.Dashboard>
        </Admin>
      </MemoryRouter>,
    );

    expect(screen.getByText("Hello Ada")).toBeTruthy();
  });

  it("useNotify still throws without a notification store", () => {
    function Notifier() {
      useNotify();
      return null;
    }
    // The shell's error boundary catches the throw and renders its fallback.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
            <Admin.Dashboard>
              <Notifier />
            </Admin.Dashboard>
          </Admin>
        </MemoryRouter>,
      );

      expect(screen.getByRole("alert").textContent).toMatch(
        /useNotify: pass a notification store/,
      );
    } finally {
      error.mockRestore();
    }
  });
});

describe("<Admin> — basename prefixes each link once", () => {
  function Redirector() {
    const redirect = useRedirect();
    return (
      <button type="button" onClick={() => redirect("list", "settings")}>
        go to settings
      </button>
    );
  }

  // jsdom's AbortSignal is not undici's, so react-router's `new Request(url,
  // { signal })` throws and no navigation of a created data router completes.
  // A bare Request stand-in lets the navigation land in window.location.
  beforeEach(() => {
    vi.stubGlobal(
      "Request",
      class {
        method = "GET";
        signal: unknown;
        constructor(
          public url: string,
          init?: { method?: string; signal?: unknown },
        ) {
          this.method = init?.method ?? "GET";
          this.signal = init?.signal;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("a created router with basename links a resource menu item to /admin/posts once", async () => {
    // The created router applies '/admin' itself, so the URL must sit under it.
    window.history.pushState({}, "", "/admin");
    render(
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        basename="/admin"
      >
        <Admin.Layout>
          <Layout />
        </Admin.Layout>
        <Resource name="posts" list={List} />
      </Admin>,
    );

    const link = await screen.findByRole("link", { name: /posts/i });
    expect(link.getAttribute("href")).toBe("/admin/posts");
  });

  it("a created router with basename redirects to /admin/settings once", async () => {
    window.history.pushState({}, "", "/admin");
    render(
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        basename="/admin"
      >
        <Admin.Dashboard>
          <Redirector />
        </Admin.Dashboard>
      </Admin>,
    );

    fireEvent.click(screen.getByRole("button", { name: /go to settings/i }));

    await waitFor(() =>
      expect(window.location.pathname).toBe("/admin/settings"),
    );
  });

  it("under a host router, basename is the mount path and prefixes links once", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          basename="/admin"
        >
          <Admin.Layout>
            <Layout />
          </Admin.Layout>
          <Resource name="posts" list={List} />
        </Admin>
      </MemoryRouter>,
    );

    const link = await screen.findByRole("link", { name: /posts/i });
    expect(link.getAttribute("href")).toBe("/admin/posts");
  });

  it("a created router with basename links the sidebar brand to /admin/ once", async () => {
    window.history.pushState({}, "", "/admin");
    render(
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        basename="/admin"
      >
        <Admin.Layout>
          <Layout />
        </Admin.Layout>
        <Resource name="posts" list={List} />
      </Admin>,
    );

    // The created router renders its own root, `basename` alone, as `/admin`.
    const brand = await screen.findByRole("link", { name: /chelone/i });
    expect(brand.getAttribute("href")).toMatch(/^\/admin\/?$/);
  });

  it("under a host router, the sidebar brand links to the mount path", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          basename="/admin"
        >
          <Admin.Layout>
            <Layout />
          </Admin.Layout>
          <Resource name="posts" list={List} />
        </Admin>
      </MemoryRouter>,
    );

    const brand = await screen.findByRole("link", { name: /chelone/i });
    expect(brand.getAttribute("href")).toBe("/admin/");
  });
});

describe("<Admin> — slot statics", () => {
  it("exposes the slot components as statics on Admin", () => {
    expect(Admin.Title).toBe(AdminTitle);
    expect(Admin.Dashboard).toBe(AdminDashboard);
  });
});

describe("<Admin> — i18n", () => {
  const PostList = () => (
    <ListView>
      <DataTable>
        <DataTable.Col source="title" />
      </DataTable>
    </ListView>
  );
  const posts = fakeDataProvider({ posts: [{ id: 1, title: "Alpha" }] });

  it("an Admin with no i18n titles a list with its resource name", async () => {
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin dataProvider={posts} queryClient={makeQueryClient()}>
          <Resource name="posts" list={PostList} />
        </Admin>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Posts" })).toBeTruthy();
    expect(screen.queryByText("chelone.page.list")).toBeNull();
  });

  it("an Admin given an i18n uses it, not the English default", async () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: defineMessages({ "chelone.page.list": "All {name}" }) },
    });
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin dataProvider={posts} queryClient={makeQueryClient()} i18n={i18n}>
          <Resource name="posts" list={PostList} />
        </Admin>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "All Posts" }),
    ).toBeTruthy();
  });
});
