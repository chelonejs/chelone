/**
 * V2-c Task 3 — the array + reference DISPLAY fields (array, text-array, select,
 * file, image, reference-array, reference-many, reference-one). Each reads a
 * value from the ambient `RecordContext` (or, for the reference family, resolves
 * related records through the data hooks) and renders it. The simple fields mount
 * under a light Chelone-context harness with a static record; the reference
 * fields mount under a real `<Admin>` (which installs the mounted vue-query
 * client + router) over a seeded `fakeDataProvider`. Every case asserts the
 * observable DOM — never an internal.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import { provideCheloneContext } from "../../../context";
import { useListContext } from "../../../list/list-context";
import { provideRecordContext } from "../../../record/record-context";
import ArrayField from "./array-field.vue";
import FileField from "./file-field.vue";
import ImageField from "./image-field.vue";
import ReferenceArrayField from "./reference-array-field.vue";
import ReferenceManyField from "./reference-many-field.vue";
import ReferenceOneField from "./reference-one-field.vue";
import SelectField from "./select-field.vue";
import TextArrayField from "./text-array-field.vue";
import TextField from "./text-field.vue";

// --- light harness (no fetching) ------------------------------------------

function makeContext() {
  return { dataProvider: fakeDataProvider({}), queryClient: new QueryClient() };
}

function mountField(
  field: Component,
  props: Record<string, unknown>,
  record: Record<string, unknown> | undefined,
  // `never` scope: the harness hands every slot to `h` and never calls one, so
  // each takes whatever scope the field passes it.
  slots?: Record<string, (scope: never) => VNodeChild>,
) {
  const Harness = defineComponent({
    setup() {
      provideCheloneContext(makeContext());
      provideRecordContext(record);
      return () => h(field, props, slots);
    },
  });
  return mount(Harness);
}

/** A list consumer that renders each `useListContext().data` row as an <li>. */
const RowConsumer = defineComponent({
  props: { textKey: { type: String, default: "id" } },
  setup(props) {
    const list = useListContext();
    return () =>
      h(
        "ul",
        (list.data ?? []).map((row) =>
          h("li", { "aria-label": String(row.id) }, String(row[props.textKey])),
        ),
      );
  },
});

// --- SelectField -----------------------------------------------------------

const choices = [
  { id: "M", name: "Male" },
  { id: "F", name: "Female" },
];

describe("SelectField", () => {
  it("renders the choice label for the value, not the raw id", () => {
    const w = mountField(
      SelectField,
      { source: "gender", choices },
      { gender: "F" },
    );
    expect(w.get('[data-slot="select-field"]').text()).toBe("Female");
  });

  it("resolves a custom optionValue / optionText", () => {
    const w = mountField(
      SelectField,
      {
        source: "role",
        choices: [{ code: "a", label: "Admin" }],
        optionValue: "code",
        optionText: "label",
      },
      { role: "a" },
    );
    expect(w.get('[data-slot="select-field"]').text()).toBe("Admin");
  });

  it("renders nothing when no choice matches and no empty is set", () => {
    const w = mountField(
      SelectField,
      { source: "gender", choices },
      { gender: "X" },
    );
    expect(w.find('[data-slot="select-field"]').exists()).toBe(false);
  });

  it("renders the (echoed) empty placeholder when no choice matches", () => {
    const w = mountField(
      SelectField,
      { source: "gender", choices, empty: "n/a" },
      { gender: "X" },
    );
    expect(w.get('[data-slot="select-field"]').text()).toBe("n/a");
  });
});

// --- TextArrayField --------------------------------------------------------

describe("TextArrayField", () => {
  it("renders each scalar as a badge chip", () => {
    const w = mountField(
      TextArrayField,
      { source: "genres" },
      { genres: ["Fiction", "History"] },
    );
    const text = w.get('[data-slot="text-array-field"]').text();
    expect(text).toContain("Fiction");
    expect(text).toContain("History");
  });

  it("renders a non-string scalar as text", () => {
    const w = mountField(
      TextArrayField,
      { source: "years" },
      { years: [2020, 2021] },
    );
    const text = w.get('[data-slot="text-array-field"]').text();
    expect(text).toContain("2020");
    expect(text).toContain("2021");
  });

  it("renders nothing for an empty array with no empty prop", () => {
    const w = mountField(TextArrayField, { source: "genres" }, { genres: [] });
    expect(w.find('[data-slot="text-array-field"]').exists()).toBe(false);
  });

  it("renders the empty placeholder for a missing array", () => {
    const w = mountField(
      TextArrayField,
      { source: "genres", empty: "None" },
      {},
    );
    expect(w.get('[data-slot="text-array-field"]').text()).toBe("None");
  });
});

// --- FileField -------------------------------------------------------------

describe("FileField", () => {
  it("renders a single download link with a title-path label", () => {
    const w = mountField(
      FileField,
      { source: "url", title: "title" },
      { url: "doc.pdf", title: "Presentation" },
    );
    const a = w.get('[data-slot="file-field"] a');
    expect(a.attributes("href")).toBe("doc.pdf");
    expect(a.text()).toBe("Presentation");
  });

  it("renders a <ul> of links for an array of files", () => {
    const w = mountField(
      FileField,
      { source: "files", src: "url", title: "name" },
      {
        files: [
          { url: "a.pdf", name: "A" },
          { url: "b.pdf", name: "B" },
        ],
      },
    );
    const links = w.findAll('[data-slot="file-field"] a');
    expect(links).toHaveLength(2);
    expect(defined(links[0]).attributes("href")).toBe("a.pdf");
    expect(defined(links[1]).text()).toBe("B");
  });

  it("FileField reads an array item's title and src by a bracket path", () => {
    const w = mountField(
      FileField,
      { source: "files", src: "links[0].href", title: "meta[0].name" },
      {
        files: [
          { meta: [{ name: "Plan" }], links: [{ href: "plan.pdf" }] },
          { meta: [{ name: "Cover" }], links: [{ href: "cover.pdf" }] },
        ],
      },
    );
    const links = w.findAll('[data-slot="file-field"] a');
    expect(links.map((a) => a.attributes("href"))).toEqual([
      "plan.pdf",
      "cover.pdf",
    ]);
    expect(links.map((a) => a.text())).toEqual(["Plan", "Cover"]);
  });

  it("renders a numeric title path as text", () => {
    const w = mountField(
      FileField,
      { source: "url", title: "version" },
      { url: "doc.pdf", version: 7 },
    );
    const a = w.get('[data-slot="file-field"] a');
    expect(a.text()).toBe("7");
    expect(a.attributes("title")).toBe("7");
    expect(a.attributes("href")).toBe("doc.pdf");
  });

  it("renders numeric array item titles as text", () => {
    const w = mountField(
      FileField,
      { source: "files", src: "url", title: "size" },
      {
        files: [
          { url: "a.pdf", size: 12 },
          { url: "b.pdf", size: 34 },
        ],
      },
    );
    const links = w.findAll('[data-slot="file-field"] a');
    expect(links.map((a) => a.text())).toEqual(["12", "34"]);
    expect(links.map((a) => a.attributes("href"))).toEqual(["a.pdf", "b.pdf"]);
  });

  it("leaves the href off an array item whose src path misses", () => {
    const w = mountField(
      FileField,
      { source: "files", src: "url" },
      {
        files: [{ url: "a.pdf", name: "A" }, { name: "B" }],
      },
    );
    const links = w.findAll('[data-slot="file-field"] a');
    expect(links).toHaveLength(2);
    expect(links.map((a) => a.attributes("href"))).toEqual([
      "a.pdf",
      undefined,
    ]);
  });

  it("renders the empty placeholder for a nullish value", () => {
    const w = mountField(
      FileField,
      { source: "url", empty: "No file" },
      { url: null },
    );
    expect(w.get('[data-slot="file-field"]').text()).toBe("No file");
  });
});

// --- ImageField ------------------------------------------------------------

describe("ImageField", () => {
  it("renders a single <img> from the source url", () => {
    const w = mountField(
      ImageField,
      { source: "avatar", title: "alt" },
      { avatar: "me.png", alt: "Me" },
    );
    const img = w.get('[data-slot="image-field"] img');
    expect(img.attributes("src")).toBe("me.png");
    expect(img.attributes("alt")).toBe("Me");
  });

  it("renders a <ul> of images for an array", () => {
    const w = mountField(
      ImageField,
      { source: "pics", src: "url", title: "cap" },
      {
        pics: [
          { url: "1.png", cap: "One" },
          { url: "2.png", cap: "Two" },
        ],
      },
    );
    const imgs = w.findAll('[data-slot="image-field"] img');
    expect(imgs).toHaveLength(2);
    expect(defined(imgs[1]).attributes("src")).toBe("2.png");
  });

  it("ImageField reads an array item's title and src by a bracket path", () => {
    const w = mountField(
      ImageField,
      { source: "pics", src: "links[0].href", title: "meta[0].name" },
      {
        pics: [
          { meta: [{ name: "A" }], links: [{ href: "a.png" }] },
          { meta: [{ name: "B" }], links: [{ href: "b.png" }] },
        ],
      },
    );
    const imgs = w.findAll('[data-slot="image-field"] img');
    expect(imgs.map((i) => i.attributes("src"))).toEqual(["a.png", "b.png"]);
    expect(imgs.map((i) => i.attributes("title"))).toEqual(["A", "B"]);
  });

  it("leaves the src off an array item whose src path misses", () => {
    const w = mountField(
      ImageField,
      { source: "pics", src: "url" },
      { pics: [{ alt: "x" }] },
    );
    const imgs = w.findAll('[data-slot="image-field"] img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0]?.attributes("src")).toBeUndefined();
  });

  it("renders the empty placeholder for a nullish value", () => {
    const w = mountField(
      ImageField,
      { source: "avatar", empty: "No image" },
      { avatar: null },
    );
    expect(w.get('[data-slot="image-field"]').text()).toBe("No image");
  });
});

// --- ArrayField ------------------------------------------------------------

describe("ArrayField", () => {
  it("passes the array value into a list context (each item a row)", () => {
    const record = {
      id: "record-1",
      values: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
    };
    const w = mountField(ArrayField, { source: "values" }, record, {
      default: () => h(RowConsumer),
    });
    for (const v of record.values) {
      expect(w.get(`[aria-label="${v.id}"]`).text()).toBe(v.id);
    }
  });

  it("passes an empty list for a missing source", () => {
    const w = mountField(
      ArrayField,
      { source: "values" },
      { id: "x" },
      {
        default: () => h(RowConsumer),
      },
    );
    expect(w.findAll("li")).toHaveLength(0);
  });
});

// --- reference family (Admin harness) -------------------------------------

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), tag_ids: z.array(z.number()) }) },
  tags: { schema: z.object({ id: z.number(), name: z.string() }) },
  books: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      author_id: z.number(),
      year: z.number(),
    }),
  },
  bios: {
    schema: z.object({
      id: z.number(),
      author_id: z.number(),
      body: z.string(),
    }),
  },
});
type Resources = typeof resources;

const tags = [
  { id: 1, name: "Tech" },
  { id: 2, name: "News" },
  { id: 3, name: "Lifestyle" },
];
const books = [
  { id: 1, title: "Hello", author_id: 1, year: 2020 },
  { id: 2, title: "World", author_id: 1, year: 2022 },
  { id: 3, title: "Foo", author_id: 1, year: 2021 },
  { id: 4, title: "Other", author_id: 2, year: 2019 },
];
const bios = [
  { id: 1, author_id: 1, body: "Irish novelist." },
  { id: 2, author_id: 2, body: "American essayist." },
];

function makeProvider() {
  return fakeDataProvider<Resources>({
    posts: [],
    tags: structuredClone(tags),
    books: structuredClone(books),
    bios: structuredClone(bios),
  });
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

function mountAdmin(render: () => unknown) {
  const dataProvider = makeProvider();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup() {
      // Override the #layout slot with an empty node to suppress the default
      // <Layout> chrome — a null slot would let Vue fall back to the chrome, so
      // its sidebar <li>s + brand text would leak into `findAll`/`text`.
      return () =>
        h(
          Admin,
          { dataProvider, queryClient },
          { default: render, layout: () => h("div") },
        );
    },
  });
  return mount(Harness, { global: { plugins: [makeRouter()] } });
}

describe("ReferenceArrayField", () => {
  it("resolves an FK array and lists the referenced record names", async () => {
    const w = mountAdmin(() =>
      h(
        defineComponent({
          setup() {
            provideRecordContext({ id: 10, tag_ids: [1, 3] });
            return () =>
              h(
                ReferenceArrayField,
                { source: "tag_ids", reference: "tags" },
                { default: () => h(RowConsumer, { textKey: "name" }) },
              );
          },
        }),
      ),
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("Tech");
      expect(w.text()).toContain("Lifestyle");
    });
    expect(w.text()).not.toContain("News");
  });

  it("publishes an empty list when the FK array is empty", () => {
    const w = mountAdmin(() =>
      h(
        defineComponent({
          setup() {
            provideRecordContext({ id: 10, tag_ids: [] });
            return () =>
              h(
                ReferenceArrayField,
                { source: "tag_ids", reference: "tags" },
                { default: () => h(RowConsumer, { textKey: "name" }) },
              );
          },
        }),
      ),
    );
    expect(w.findAll("li")).toHaveLength(0);
  });

  it("keeps the valid ids of a partially valid FK array", async () => {
    const w = mountAdmin(() =>
      h(
        defineComponent({
          setup() {
            provideRecordContext({ id: 10, tag_ids: [1, null, 2] });
            return () =>
              h(
                ReferenceArrayField,
                { source: "tag_ids", reference: "tags" },
                { default: () => h(RowConsumer, { textKey: "name" }) },
              );
          },
        }),
      ),
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("Tech");
      expect(w.text()).toContain("News");
    });
    expect(w.text()).not.toContain("Lifestyle");
  });
});

describe("ReferenceManyField", () => {
  it("renders the related records whose target matches the record id", async () => {
    const w = mountAdmin(() =>
      h(
        defineComponent({
          setup() {
            provideRecordContext({ id: 1, name: "Jane" });
            return () =>
              h(
                ReferenceManyField,
                { reference: "books", target: "author_id" },
                { default: () => h(RowConsumer, { textKey: "title" }) },
              );
          },
        }),
      ),
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("Hello");
    });
    expect(w.text()).toContain("World");
    expect(w.text()).toContain("Foo");
    expect(w.text()).not.toContain("Other");
  });

  it("applies the sort prop to the related list", async () => {
    const w = mountAdmin(() =>
      h(
        defineComponent({
          setup() {
            provideRecordContext({ id: 1, name: "Jane" });
            return () =>
              h(
                ReferenceManyField,
                {
                  reference: "books",
                  target: "author_id",
                  sort: { field: "year", order: "ASC" },
                },
                { default: () => h(RowConsumer, { textKey: "title" }) },
              );
          },
        }),
      ),
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("Hello");
    });
    const titles = w.findAll("li").map((li) => li.text());
    expect(titles).toEqual(["Hello", "Foo", "World"]);
  });
});

describe("ReferenceOneField", () => {
  it("renders the related record's field once loaded (ambient RecordContext)", async () => {
    const w = mountAdmin(() =>
      h(
        defineComponent({
          setup() {
            provideRecordContext({ id: 1, name: "Jane" });
            return () =>
              h(
                ReferenceOneField,
                { reference: "bios", target: "author_id" },
                { default: () => h(TextField, { source: "body" }) },
              );
          },
        }),
      ),
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("Irish novelist.");
    });
  });

  it("exposes the resolved record through the scoped default slot", async () => {
    const w = mountAdmin(() =>
      h(
        defineComponent({
          setup() {
            provideRecordContext({ id: 2, name: "John" });
            return () =>
              h(
                ReferenceOneField,
                { reference: "bios", target: "author_id" },
                {
                  default: ({ record }: { record: { body?: string } }) =>
                    h("span", record?.body),
                },
              );
          },
        }),
      ),
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("American essayist.");
    });
  });

  it("renders the empty placeholder when no related record exists", async () => {
    const w = mountAdmin(() =>
      h(
        defineComponent({
          setup() {
            provideRecordContext({ id: 99, name: "Nobody" });
            return () =>
              h(
                ReferenceOneField,
                { reference: "bios", target: "author_id", empty: "No bio" },
                { default: () => h(TextField, { source: "body" }) },
              );
          },
        }),
      ),
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("No bio");
    });
  });
});
