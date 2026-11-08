/**
 * V1-b INTEGRATION PROBE — the controllers + form + components wired together
 * end-to-end in a MOUNTED Vue tree (short of the full demo app, which is V1-c).
 *
 * Every case mounts REAL components (`<Admin>`, `<List>`, `<DataTable>`,
 * `<ReferenceField>`, `<Edit>`, `<TextInput>`, `<SaveButton>`, `<ValidationError>`)
 * over a seeded `fakeDataProvider`, and asserts the observable behavior a user
 * would see — never an internal:
 *
 *  1. LIST      — a `<DataTable>` renders a seeded cell, and pagination + sort
 *                 driven through the list controller re-render the visible rows.
 *  2. EDIT      — the form pre-fills from the fetched record, a `<TextInput>`
 *                 edits a field, `<SaveButton>` fires `dataProvider.update`, and
 *                 the change PERSISTS (a fresh `getOne` reflects it). The edit is
 *                 mutation-verified non-vacuous (old value ≠ new value).
 *  3. REFERENCE — a `<ReferenceField>` resolves `author_id` → the author's name.
 *  4. VALIDATE  — an empty required field surfaces its schema error as a
 *                 TRANSLATABLE message (the i18n-resolved human string, never the
 *                 raw key, never an `error.root.message` RHF shape).
 */

import {
  createI18n,
  defineMessages,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import SaveButton from "../components/admin/buttons/save-button.vue";
import ValidationError from "../components/admin/common/validation-error.vue";
import ReferenceField from "../components/admin/fields/reference-field.vue";
import TextInput from "../components/admin/inputs/text-input.vue";
import DataTable from "../components/admin/list/data-table.vue";
import DataTableCol from "../components/admin/list/data-table-col.vue";
import Edit from "../components/admin/view/edit.vue";
import List from "../components/admin/view/list.vue";
import { useForm } from "../form/use-form";
import { type ListContextValue, useListContext } from "../list/list-context";

// --- Seed data -------------------------------------------------------------

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string().min(1, "chelone.required"),
      author_id: z.number(),
      views: z.number(),
    }),
  },
  authors: {
    schema: z.object({ id: z.number(), name: z.string() }),
  },
});
type Resources = typeof resources;

interface Post {
  id: number;
  title: string;
  author_id: number;
  views: number;
}
interface Author {
  id: number;
  name: string;
}

const seedPosts: Post[] = [
  { id: 1, title: "Alpha", author_id: 10, views: 5 },
  { id: 2, title: "Bravo", author_id: 11, views: 9 },
  { id: 3, title: "Charlie", author_id: 10, views: 1 },
  { id: 4, title: "Delta", author_id: 11, views: 7 },
  { id: 5, title: "Echo", author_id: 10, views: 3 },
];
const seedAuthors: Author[] = [
  { id: 10, name: "Ada Lovelace" },
  { id: 11, name: "Alan Turing" },
];

// An i18n instance so the required-field key resolves to a HUMAN string (item 4).
const en = defineMessages({
  "chelone.required": "This field is required",
  "chelone.action.save": "Save",
});
const makeI18n = () => createI18n({ locale: "en", messages: { en } });

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

function makeProvider() {
  return fakeDataProvider<Resources>({
    posts: structuredClone(seedPosts),
    authors: structuredClone(seedAuthors),
  });
}

interface MountOpts {
  dataProvider?: ReturnType<typeof makeProvider>;
  i18n?: ReturnType<typeof makeI18n>;
}

/** Mount `render()` inside a real `<Admin>` + a vue-router + a retry-off client. */
function mountAdmin(render: () => unknown, opts: MountOpts = {}) {
  const dataProvider = opts.dataProvider ?? makeProvider();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient, i18n: opts.i18n },
          // Override #layout with an empty node to suppress the default <Layout>
          // chrome (a null slot falls back to the chrome, whose sidebar DOM
          // would pollute these probes' document-wide `text()` assertions).
          { default: render, layout: () => h("div") },
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, dataProvider, queryClient };
}

// ---------------------------------------------------------------------------
// (1) LIST — seeded cell renders; pagination + sort drive the visible rows.
// ---------------------------------------------------------------------------

describe("probe (1) — <List> + <DataTable>: seeded cell + pagination + sort", () => {
  it("renders a seeded cell, then paginates and sorts through the controller", async () => {
    const captured: { list?: ListContextValue<Post> } = {};
    // A child of <List> captures the SAME controller <DataTable> reads (a
    // component's own provide is not visible to its own inject, so this rides
    // inside the List default slot as a descendant).
    const CaptureList = defineComponent({
      setup(_, { slots }) {
        captured.list = useListContext<Post>();
        return () => slots.default?.();
      },
    });

    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts", perPage: 2 },
        {
          default: () =>
            h(CaptureList, null, {
              default: () =>
                h(DataTable, null, {
                  default: () => [h(DataTableCol, { source: "title" })],
                }),
            }),
        },
      ),
    );

    // Seeded cell renders; page 1 (perPage 2) shows the first two by id asc.
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Alpha");
    });
    expect(captured.list?.total).toBe(5);
    expect(wrapper.text()).toContain("Bravo");
    // Non-vacuity: page 1 does NOT show later rows.
    expect(wrapper.text()).not.toContain("Charlie");
    expect(wrapper.text()).not.toContain("Echo");

    // PAGINATION through the controller → the table re-renders page 2.
    captured.list?.setPage(2);
    await flushPromises();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Charlie");
      expect(wrapper.text()).toContain("Delta");
    });
    expect(captured.list?.page).toBe(2);
    expect(wrapper.text()).not.toContain("Alpha");

    // SORT through the controller → title DESC, page resets, "Echo" leads.
    captured.list?.setSort({ field: "title", order: "DESC" });
    await flushPromises();
    await vi.waitFor(() => {
      expect(captured.list?.sort).toEqual([{ field: "title", order: "DESC" }]);
      expect(captured.list?.data?.[0]?.title).toBe("Echo");
    });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Echo");
    });
    // Non-vacuity: the alphabetical-first row is off the (DESC) first page.
    expect(wrapper.text()).not.toContain("Alpha");
  });
});

// ---------------------------------------------------------------------------
// (2) EDIT — pre-fill → edit → save → dataProvider.update fires → persists.
// ---------------------------------------------------------------------------

describe("probe (2) — <Edit>: pre-fill, edit, save persists (non-vacuous)", () => {
  it("pre-fills from the record, edits a field, and persists via update", async () => {
    const dataProvider = makeProvider();
    const updateSpy = vi.spyOn(dataProvider, "update");

    // Ground truth BEFORE the edit — proves non-vacuity (old ≠ new).
    const before = await dataProvider.getOne("posts", { id: 1 });
    const originalTitle = before.data.title;
    const newTitle = "Alpha (edited)";
    expect(originalTitle).not.toBe(newTitle);

    const { wrapper } = mountAdmin(
      () =>
        h(
          Edit,
          { resource: "posts", id: 1, redirectOnSave: false },
          {
            default: () => h(TextInput, { source: "title" }),
            toolbar: () => h(SaveButton),
          },
        ),
      { dataProvider },
    );

    // The form PRE-FILLS from the fetched record (useEditController → useForm).
    await vi.waitFor(() => {
      const input = wrapper.find('input[type="text"]');
      expect(input.exists()).toBe(true);
      expect(elementOf(input.element, HTMLInputElement).value).toBe(
        originalTitle,
      );
    });

    // Edit the field, then save.
    const input = wrapper.find('input[type="text"]');
    await input.setValue(newTitle);
    await nextTick();
    await wrapper.find('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
    // update() saw the changed value…
    expect(updateSpy.mock.calls[0]?.[1]).toMatchObject({
      id: 1,
      data: expect.objectContaining({ title: newTitle }),
    });

    // …and the change PERSISTED — a fresh getOne reflects it, and it genuinely
    // differs from the pre-edit value (mutation-verified non-vacuity).
    const after = await dataProvider.getOne("posts", { id: 1 });
    expect(after.data.title).toBe(newTitle);
    expect(after.data.title).not.toBe(originalTitle);
  });
});

// ---------------------------------------------------------------------------
// (3) REFERENCE — a <ReferenceField> resolves the FK to the author's name.
// ---------------------------------------------------------------------------

describe("probe (3) — <ReferenceField>: resolves author_id → author name", () => {
  it("follows the FK and renders the referenced record representation", async () => {
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts", perPage: 2 },
        {
          default: () =>
            h(DataTable, null, {
              default: () => [
                h(DataTableCol, { source: "title" }),
                h(
                  DataTableCol,
                  { label: "Author" },
                  {
                    default: () =>
                      h(ReferenceField, {
                        source: "author_id",
                        reference: "authors",
                      }),
                  },
                ),
              ],
            }),
        },
      ),
    );

    // author_id 10 → "Ada Lovelace", author_id 11 → "Alan Turing".
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Ada Lovelace");
      expect(wrapper.text()).toContain("Alan Turing");
    });
  });
});

// ---------------------------------------------------------------------------
// (4) VALIDATE — an empty required field surfaces a TRANSLATABLE message.
// ---------------------------------------------------------------------------

describe("probe (4) — schema validation surfaces a translatable message", () => {
  it("renders the i18n-resolved human error, not the raw key", async () => {
    // A form hosting the posts schema (title required) seeded with an EMPTY
    // title. On submit the schema fails → the field error normalizes to a
    // translatable payload → <ValidationError> renders it through i18n.
    const FormHost = defineComponent({
      setup(_, { slots }) {
        useForm<Record<string, unknown>>({
          resource: "posts",
          schema: resources.posts.schema,
          record: { id: 1, title: "", author_id: 10, views: 0 },
          onSubmit: () => undefined,
        });
        return () => slots.default?.();
      },
    });

    const { wrapper } = mountAdmin(
      () =>
        h(FormHost, null, {
          default: () => [h(TextInput, { source: "title" }), h(SaveButton)],
        }),
      { i18n: makeI18n() },
    );
    await flushPromises();

    // Touch the field so the input surfaces its error, then submit.
    const input = wrapper.find('input[type="text"]');
    await input.trigger("blur");
    await wrapper.find('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => {
      // The rendered message is the TRANSLATED human string…
      expect(wrapper.text()).toContain("This field is required");
    });
    // …never the raw translation key, and never an RHF `error.root.message`.
    expect(wrapper.text()).not.toContain("chelone.required");
    expect(wrapper.text()).not.toContain("root");
    expect(wrapper.text()).not.toContain("error.root.message");
  });

  it("<ValidationError> translates a bare {message} payload directly", async () => {
    // A focused unit of the same path: the translatable payload → human text,
    // proving the translate seam independently of the form plumbing.
    const { wrapper } = mountAdmin(
      () => h(ValidationError, { error: { message: "chelone.required" } }),
      { i18n: makeI18n() },
    );
    await flushPromises();
    expect(wrapper.text()).toBe("This field is required");
    expect(wrapper.text()).not.toContain("chelone.required");
  });
});
