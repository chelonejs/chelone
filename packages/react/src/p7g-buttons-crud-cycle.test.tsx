/**
 * P7g — FULL-CRUD-CYCLE PROBE (ported buttons). Proves the demo/admin supports
 * the WHOLE interactive CRUD loop driven only by the PORTED buttons — not a
 * hand-rolled save button. The p7e e2e probe wired the composed controllers with
 * a bespoke `<SaveButton>`; this probe swaps in the real ported
 * `SaveButton`/`BulkDeleteButton`/`CreateButton` from `@chelone/react` and walks
 * the interactive cycle a real operator performs:
 *
 *  (a) EDIT — open an Edit view, change a field, click the ported `<SaveButton>`
 *      → `dataProvider.update` fires and the new value PERSISTS (`getOne`
 *      reflects). NOTE: chelone's composed `useEditForm` does NOT auto-redirect
 *      to the list on save (ra-admin's default redirect is not wired into the
 *      chelone controller/view yet — see p7g-buttons-probe.md GAP). The CRUD
 *      proof is the persisted mutation; the button stays on the Edit view.
 *  (b) BULK DELETE — select rows in the list, click the ported
 *      `<BulkDeleteButton>` → the `<Confirm>` gate opens → confirm → the rows are
 *      deleted from the provider AND the selection is cleared.
 *  (c) CREATE — click the ported `<CreateButton>` (a nav Link) → lands on Create
 *      → fill + `<SaveButton>` → a brand-new record exists in the provider.
 *  (d) LABEL — a ported button renders its translated / `_`-fallback text, never
 *      a raw i18n key (`chelone.action.*`).
 *
 * Non-vacuity (mutation-verified, see p7g-buttons-probe.md): the save-persist
 * assertion (a) and the bulk-delete assertion (b) each FAIL when their bound
 * datum is corrupted — proving the assertions actually observe the mutation.
 */

import type { DataProvider } from "@chelone/core";
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
  BulkDeleteButton,
  Create,
  CreateButton,
  DataTable,
  Edit,
  List,
  Resource,
  SaveButton,
  TextInput,
} from "./index";

afterEach(cleanup);

/* -------------------------------------------------------------------------- */
/* Seed + providers                                                           */
/* -------------------------------------------------------------------------- */

interface Post {
  id: number;
  title: string;
}

function seed() {
  return {
    posts: [
      { id: 1, title: "Alpha" },
      { id: 2, title: "Beta" },
      { id: 3, title: "Gamma" },
    ] satisfies Post[],
  };
}

/** i18n carrying the keys the ported views + buttons render. */
function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.page.list": "{name}",
        "chelone.page.create": "Create {name}",
        "chelone.action.edit": "Edit",
        "chelone.action.save": "Save",
        "chelone.action.create": "Create",
        "chelone.action.delete": "Delete",
        "chelone.action.confirm": "Confirm",
        "chelone.action.cancel": "Cancel",
        "chelone.navigation.no_results": "No results found",
        "chelone.message.bulk_delete_title": "Delete {name}?",
        "chelone.message.bulk_delete_content": "Are you sure?",
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

/* -------------------------------------------------------------------------- */
/* Views composing the PORTED buttons                                         */
/* -------------------------------------------------------------------------- */

function PostList() {
  return (
    <List actions={<CreateButton />}>
      <DataTable bulkActionButtons={<BulkDeleteButton />}>
        <DataTable.Col source="title" />
      </DataTable>
    </List>
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

function makeApp({
  dataProvider,
  initialEntries = ["/posts"],
}: {
  dataProvider: DataProvider;
  initialEntries?: string[];
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        i18n={makeI18n()}
        notifications={createNotificationStore()}
      >
        <Resource
          name="posts"
          list={PostList}
          edit={PostEdit}
          create={PostCreate}
        />
      </Admin>
    </MemoryRouter>
  );
}

/* -------------------------------------------------------------------------- */
/* (a) EDIT → SaveButton → update persists + redirect to list                 */
/* -------------------------------------------------------------------------- */

describe("P7g CRUD cycle — (a) edit + ported SaveButton persists the mutation", () => {
  it("changes a field, clicks the ported SaveButton, and the update persists", async () => {
    const dataProvider = fakeDataProvider(seed());
    const updateSpy = vi.spyOn(dataProvider, "update");
    render(makeApp({ dataProvider, initialEntries: ["/posts/1"] }));

    // Hydrated: the ported Edit view shows the fetched title.
    const input = await screen.findByLabelText(/title/i);
    await waitFor(() =>
      expect(elementOf(input, HTMLInputElement).value).toBe("Alpha"),
    );

    // Change the field, then click the REAL ported SaveButton.
    fireEvent.change(input, { target: { value: "Alpha edited" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // dataProvider.update fired…
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    // …and the value PERSISTS — a fresh getOne reflects it (non-vacuity anchor).
    await waitFor(async () => {
      const { data } = await dataProvider.getOne("posts", { id: 1 });
      expect(data).toMatchObject({ title: "Alpha edited" });
    });
  });
});

/* -------------------------------------------------------------------------- */
/* (b) BULK DELETE — select rows → BulkDeleteButton → confirm → deleted        */
/* -------------------------------------------------------------------------- */

describe("P7g CRUD cycle — (b) bulk delete via ported BulkDeleteButton", () => {
  it("selects rows, confirms the delete, removes them + clears selection", async () => {
    const dataProvider = fakeDataProvider(seed());
    const deleteManySpy = vi.spyOn(dataProvider, "deleteMany");
    render(makeApp({ dataProvider }));

    // Wait for the rows, then select two of them.
    await screen.findByText("Alpha");
    const [row1, row2] = screen.getAllByLabelText("Select row");
    expect(screen.getAllByLabelText("Select row").length).toBe(3);
    if (!row1 || !row2) throw new Error("expected 3 row checkboxes");
    fireEvent.click(row1); // post #1 Alpha
    fireEvent.click(row2); // post #2 Beta

    // The bulk toolbar surfaces the ported BulkDeleteButton (label "Delete").
    const bulkBtn = await screen.findByRole("button", { name: /delete/i });
    fireEvent.click(bulkBtn);

    // The <Confirm> gate opens — click its Confirm button.
    const confirmBtn = await screen.findByRole("button", { name: /confirm/i });
    fireEvent.click(confirmBtn);

    // deleteMany fired with the two selected ids…
    await waitFor(() => expect(deleteManySpy).toHaveBeenCalled());
    expect(deleteManySpy.mock.calls[0]?.[1].ids).toEqual([1, 2]);

    // …the rows are gone from the provider (non-vacuity anchor).
    await waitFor(async () => {
      const { data } = await dataProvider.getList("posts", {
        pagination: { page: 1, perPage: 25 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      const titles = data.map((row) => String(row.title));
      expect(titles).toEqual(["Gamma"]);
    });

    // Selection cleared: the toolbar's Delete button is gone (toolbar hidden).
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull(),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* (c) CREATE — CreateButton nav → SaveButton → new record                    */
/* -------------------------------------------------------------------------- */

describe("P7g CRUD cycle — (c) create via ported CreateButton + SaveButton", () => {
  it("navigates to Create via the ported CreateButton and saves a new record", async () => {
    const dataProvider = fakeDataProvider(seed());
    const createSpy = vi.spyOn(dataProvider, "create");
    render(makeApp({ dataProvider }));

    // The ported CreateButton renders in the list actions (a nav Link).
    const createLink = await screen.findByRole("link", { name: /create/i });
    fireEvent.click(createLink);

    // Lands on Create — fill the title + click the ported SaveButton.
    const input = await screen.findByLabelText(/title/i);
    fireEvent.change(input, { target: { value: "Delta" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // create fired and the provider gained the new row.
    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    await waitFor(async () => {
      const { data } = await dataProvider.getList("posts", {
        pagination: { page: 1, perPage: 25 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      const titles = data.map((row) => String(row.title));
      expect(titles).toContain("Delta");
    });
  });
});

/* -------------------------------------------------------------------------- */
/* (d) LABEL — a ported button renders translated/fallback text, not a key    */
/* -------------------------------------------------------------------------- */

describe("P7g CRUD cycle — (d) ported button labels are translated, not raw keys", () => {
  it("renders 'Save' (translated), never the raw 'chelone.action.save' key", async () => {
    render(
      makeApp({
        dataProvider: fakeDataProvider(seed()),
        initialEntries: ["/posts/1"],
      }),
    );

    const save = await screen.findByRole("button", { name: /save/i });
    // Translated text present…
    expect(save.textContent).toContain("Save");
    // …and the raw i18n key is NOT leaking into the DOM anywhere.
    expect(save.textContent).not.toContain("chelone.action");
    expect(screen.queryByText("chelone.action.save")).toBeNull();
  });
});
