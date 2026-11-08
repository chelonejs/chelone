/**
 * P7e — END-TO-END ADMIN PROBE. The big one: prove a real
 * `<Admin><Resource name="posts" list edit show create /></Admin>` works end to
 * end through the WHOLE ported stack — the shell (AdminContext + provider order
 * + routing engine + no-flash auth gate), the resource registry, the router,
 * the composed controllers (useListController / useEditForm / useCreateForm /
 * useShowController), and the ported views/fields/inputs — driven only by the
 * router the way a real app is.
 *
 * The unit + integration suites (admin-routes.test, list/edit/create/show.test,
 * p7d fields integration) each prove a SLICE with hand-mounted providers. This
 * probe wires the ONE canonical composition an app author writes — no
 * hand-mounted CheloneProvider/ResourceRegistryProvider/RouterAdapterProvider,
 * just `<MemoryRouter><Admin …><Resource … /></Admin>` — and walks the full CRUD
 * lifecycle across route transitions.
 *
 *  (a) LIST renders rows from the provider, with a plain field column AND a
 *      ReferenceField column that resolves an FK against a second resource.
 *  (b) NAV via the router: clicking a row navigates to EDIT (rowClick default),
 *      and a direct show route renders SHOW — both hydrate the clicked record.
 *  (c) EDIT hydrates the fetched record into the form, an edited field submits,
 *      and the provider `update` fires + the new value is reflected on refetch.
 *  (d) CREATE submits a brand-new record → the provider gains a row.
 *  (e) LAYOUT chrome renders: the sidebar Menu lists the resource (a link), and
 *      the AppBar renders (the sidebar toggle) — the ported shadcn `<Layout>`
 *      slotted via `<Admin.Layout>`.
 *  (f) The no-flash AUTH gate + login path: `requireAuth` + a mock authProvider
 *      whose `checkAuth` rejects shows the login page and NEVER mounts the
 *      protected list (absence, not hidden); an accepting authProvider mounts it.
 *
 * Non-vacuity (mutation-verified, documented in the report): the edit-save
 * assertion and the list-render assertion each fail when their bound datum is
 * corrupted — see p7e-probe.md's mutation matrix.
 */

import type { AuthProvider } from "@chelone/core";
import {
  createI18n,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Admin,
  Create,
  DataTable,
  Edit,
  Layout,
  List,
  ReferenceField,
  Resource,
  Show,
  TextField,
  TextInput,
  useSaveContext,
} from "./index";

afterEach(cleanup);

/* -------------------------------------------------------------------------- */
/* Seed + providers                                                           */
/* -------------------------------------------------------------------------- */

interface Post {
  id: number;
  title: string;
  author_id: number;
}
interface Author {
  id: number;
  name: string;
}

function seed() {
  return {
    posts: [
      { id: 1, title: "Alpha", author_id: 10 },
      { id: 2, title: "Beta", author_id: 20 },
    ] satisfies Post[],
    authors: [
      { id: 10, name: "Ada Lovelace" },
      { id: 20, name: "Alan Turing" },
    ] satisfies Author[],
  };
}

/** i18n with the message keys the ported views/menu render. */
function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.page.list": "{name}",
        "chelone.page.create": "Create {name}",
        "chelone.action.edit": "Edit",
        "chelone.action.save": "Save",
        "chelone.navigation.no_results": "No results found",
      }),
    },
  });
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/** A minimal, controllable auth provider (all methods resolve unless overridden). */
function makeAuthProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* Views — ported List/Edit/Create/Show composing ported fields + inputs      */
/* -------------------------------------------------------------------------- */

function PostList() {
  return (
    <List>
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.Col label="Author">
          <ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </ReferenceField>
        </DataTable.Col>
      </DataTable>
    </List>
  );
}

/** A save button reading the ambient SaveContext (chelone's save bridge). */
function SaveButton() {
  const { save } = useSaveContext();
  return (
    <button type="button" onClick={() => save?.({})}>
      Save
    </button>
  );
}

function PostEdit() {
  return (
    <Edit>
      <TextInput source="title" />
      <SaveButton />
    </Edit>
  );
}

function PostCreate() {
  return (
    <Create>
      <TextInput source="title" />
      <SaveButton />
    </Create>
  );
}

function PostShow() {
  return (
    <Show>
      <TextField source="title" />
    </Show>
  );
}

/**
 * The ONE canonical app composition — no hand-mounted providers. `<MemoryRouter>`
 * hosts it; `<Admin>` layers the whole stack; `<Resource>` declares the routes.
 */
function makeApp({
  dataProvider,
  authProvider,
  requireAuth = false,
  initialEntries = ["/posts"],
  withLayout = false,
}: {
  dataProvider: ReturnType<typeof fakeDataProvider>;
  authProvider?: AuthProvider;
  requireAuth?: boolean;
  initialEntries?: string[];
  withLayout?: boolean;
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        i18n={makeI18n()}
        notifications={createNotificationStore()}
        authProvider={authProvider}
        requireAuth={requireAuth}
      >
        {withLayout ? (
          <Admin.Layout>
            <Layout />
          </Admin.Layout>
        ) : null}
        <Resource
          name="posts"
          list={PostList}
          edit={PostEdit}
          show={PostShow}
          create={PostCreate}
        />
        <Resource name="authors" list={() => <div>authors list</div>} />
      </Admin>
    </MemoryRouter>
  );
}

/* -------------------------------------------------------------------------- */
/* (a) LIST renders rows + a ReferenceField column                            */
/* -------------------------------------------------------------------------- */

describe("P7e end-to-end — (a) list renders provider rows + a reference column", () => {
  it("renders a row per record with the field column and the resolved FK", async () => {
    render(makeApp({ dataProvider: fakeDataProvider(seed()) }));

    // Field column: both post titles from the provider.
    expect(await screen.findByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();

    // ReferenceField column: the FK author_id → authors.name, resolved per row.
    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("Alan Turing")).toBeTruthy();
  });
});

/* -------------------------------------------------------------------------- */
/* (b) NAV via router — clicking a row opens Edit; a show route opens Show     */
/* -------------------------------------------------------------------------- */

describe("P7e end-to-end — (b) router navigation opens the record views", () => {
  it("clicking a list row navigates to Edit and hydrates the clicked record", async () => {
    render(makeApp({ dataProvider: fakeDataProvider(seed()) }));

    // Click the "Beta" row (rowClick defaults to "edit" → /posts/2).
    const beta = await screen.findByText("Beta");
    fireEvent.click(beta);

    // Edit hydrated post #2 into the form.
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Beta"),
    );
  });

  it("a direct show route renders Show with the record", async () => {
    render(
      makeApp({
        dataProvider: fakeDataProvider(seed()),
        initialEntries: ["/posts/1/show"],
      }),
    );
    // Show renders the record representation heading ("Alpha") + the title field.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Alpha" })).toBeTruthy(),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* (c) EDIT hydrates → edits a field → submits → provider update reflects      */
/* -------------------------------------------------------------------------- */

describe("P7e end-to-end — (c) edit hydrates, edits, submits, reflects", () => {
  it("hydrates the record, submits an edit, and the provider update fires", async () => {
    const dataProvider = fakeDataProvider(seed());
    render(makeApp({ dataProvider, initialEntries: ["/posts/1"] }));

    // Hydrated: the form shows the fetched title.
    const input = await screen.findByLabelText(/title/i);
    await waitFor(() =>
      expect(elementOf(input, HTMLInputElement).value).toBe("Alpha"),
    );

    // Edit the field, then submit.
    fireEvent.change(input, { target: { value: "Alpha edited" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // The provider persisted the update — refetch reflects the new value.
    await waitFor(async () => {
      const { data } = await dataProvider.getOne("posts", { id: 1 });
      expect(data).toMatchObject({ title: "Alpha edited" });
    });
  });
});

/* -------------------------------------------------------------------------- */
/* (d) CREATE submits a new record                                            */
/* -------------------------------------------------------------------------- */

describe("P7e end-to-end — (d) create submits a new record", () => {
  it("creates a new record through the provider", async () => {
    const dataProvider = fakeDataProvider(seed());
    render(makeApp({ dataProvider, initialEntries: ["/posts/create"] }));

    const input = await screen.findByLabelText(/title/i);
    fireEvent.change(input, { target: { value: "Gamma" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // The provider gained a "Gamma" row (list went 2 → 3).
    await waitFor(async () => {
      const { data } = await dataProvider.getList("posts", {
        pagination: { page: 1, perPage: 25 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      const titles = data.map((row) => String(row.title));
      expect(titles).toContain("Gamma");
    });
  });
});

/* -------------------------------------------------------------------------- */
/* (e) LAYOUT chrome — menu lists the resource, app-bar renders               */
/* -------------------------------------------------------------------------- */

describe("P7e end-to-end — (e) layout chrome renders", () => {
  it("renders the sidebar menu (resource link) and the app-bar (toggle)", async () => {
    render(
      makeApp({ dataProvider: fakeDataProvider(seed()), withLayout: true }),
    );

    // The list still renders inside the layout content area.
    expect(await screen.findByText("Alpha")).toBeTruthy();

    // Menu lists the "posts" resource as a nav link.
    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
    // AppBar renders the sidebar toggle button.
    expect(
      screen.getByRole("button", { name: /toggle sidebar/i }),
    ).toBeTruthy();
  });
});

/* -------------------------------------------------------------------------- */
/* (f) no-flash auth gate + login path                                        */
/* -------------------------------------------------------------------------- */

describe("P7e end-to-end — (f) no-flash auth gate + login path", () => {
  it("requireAuth + rejecting authProvider shows login; list never mounts", async () => {
    const listSpy = vi.fn();
    function SpiedList() {
      listSpy();
      return <div data-testid="spied-list">list</div>;
    }
    const authProvider = makeAuthProvider({
      checkAuth: async () => {
        throw new Error("nope");
      },
    });
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={fakeDataProvider(seed())}
          queryClient={makeQueryClient()}
          i18n={makeI18n()}
          authProvider={authProvider}
          requireAuth
        >
          <Resource name="posts" list={SpiedList} />
          <Admin.LoginPage>
            <div data-testid="login-page">login</div>
          </Admin.LoginPage>
        </Admin>
      </MemoryRouter>,
    );

    // Login page shows; the protected list NEVER mounted (absence, not hidden).
    await waitFor(() => expect(screen.getByTestId("login-page")).toBeTruthy());
    expect(screen.queryByTestId("spied-list")).toBeNull();
    expect(listSpy).not.toHaveBeenCalled();
  });

  it("requireAuth + accepting authProvider mounts the protected list", async () => {
    const authProvider = makeAuthProvider({ checkAuth: async () => {} });
    render(
      makeApp({
        dataProvider: fakeDataProvider(seed()),
        authProvider,
        requireAuth: true,
      }),
    );
    // After the gate resolves authed, the real list renders its rows.
    expect(await screen.findByText("Alpha")).toBeTruthy();
  });
});
