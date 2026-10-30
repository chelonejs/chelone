import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { useListContext } from "../../../list/list-context";
import { provideRecordContext } from "../../../record/record-context";
import ReferenceArrayField from "./reference-array-field.vue";
import ReferenceField from "./reference-field.vue";

const authors = [
  { id: 1, name: "Jane Doe" },
  { id: 2, name: "John Smith" },
];

const tags = [
  { id: 1, name: "Tech" },
  { id: 2, name: "News" },
  { id: 3, name: "Lifestyle" },
];

function makeProvider() {
  return fakeDataProvider({
    authors: structuredClone(authors),
    tags: structuredClone(tags),
  });
}

function mountAdmin(render: () => unknown, dataProvider = makeProvider()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient },
          {
            default: render,
            layout: () => h("div"),
          },
        );
    },
  });
  return mount(Harness, { global: { plugins: [router] } });
}

const AuthorRow = defineComponent({
  props: { authorId: { type: Number, required: true } },
  setup(props) {
    provideRecordContext({ author_id: props.authorId });
    return () =>
      h(ReferenceField, { source: "author_id", reference: "authors" });
  },
});

enableAutoUnmount(afterEach);

describe("ReferenceField", () => {
  it("renders nothing when the provider omits the id", async () => {
    const dataProvider = makeProvider();
    const getMany = vi
      .spyOn(dataProvider, "getMany")
      .mockResolvedValue({ data: [] });
    const wrapper = mountAdmin(
      () => [
        h("section", { "aria-label": "Missing author" }, [
          h(
            ReferenceField,
            {
              source: "author_id",
              reference: "authors",
              record: { id: 10, author_id: 99 },
            },
            {
              default: () => h("span", "Resolved author"),
            },
          ),
        ]),
        h(ReferenceField, {
          source: "author_id",
          reference: "authors",
          record: { id: 10, author_id: 99 },
          empty: "No author",
        }),
      ],
      dataProvider,
    );
    await vi.waitFor(() => expect(wrapper.text()).toBe("No author"));
    expect(wrapper.get('[aria-label="Missing author"]').text()).toBe("");
    expect(getMany).toHaveBeenCalledExactlyOnceWith("authors", { ids: [99] });
  });

  it("three rows over two authors make one getMany call with each id once and no getOne call", async () => {
    const dataProvider = makeProvider();
    const getMany = vi.spyOn(dataProvider, "getMany");
    const getOne = vi.spyOn(dataProvider, "getOne");
    const wrapper = mountAdmin(
      () => [
        h(AuthorRow, { authorId: 1 }),
        h(AuthorRow, { authorId: 2 }),
        h(AuthorRow, { authorId: 1 }),
      ],
      dataProvider,
    );
    await vi.waitFor(() => {
      expect(
        wrapper
          .findAll('[data-slot="reference-field"]')
          .map((field) => field.text()),
      ).toEqual(["Jane Doe", "John Smith", "Jane Doe"]);
    });
    expect(getMany).toHaveBeenCalledExactlyOnceWith("authors", { ids: [1, 2] });
    expect(getOne).not.toHaveBeenCalled();
  });
});

const TagList = defineComponent({
  setup() {
    const list = useListContext();
    return () =>
      h(
        "ul",
        (list.data ?? []).map((row) =>
          h("li", { key: row.id }, String(row.name)),
        ),
      );
  },
});

describe("ReferenceArrayField", () => {
  it("two fields with overlapping ids make one getMany call and each lists only its own records", async () => {
    const dataProvider = makeProvider();
    const getMany = vi.spyOn(dataProvider, "getMany");
    const wrapper = mountAdmin(
      () => [
        h(
          ReferenceArrayField,
          {
            source: "tag_ids",
            reference: "tags",
            record: { id: 10, tag_ids: [1, 2] },
          },
          {
            default: () => h(TagList),
          },
        ),
        h(
          ReferenceArrayField,
          {
            source: "tag_ids",
            reference: "tags",
            record: { id: 11, tag_ids: [2, 3] },
          },
          {
            default: () => h(TagList),
          },
        ),
      ],
      dataProvider,
    );
    await vi.waitFor(() => {
      expect(
        wrapper
          .findAll("ul")
          .map((list) => list.findAll("li").map((item) => item.text())),
      ).toEqual([
        ["Tech", "News"],
        ["News", "Lifestyle"],
      ]);
    });
    expect(getMany).toHaveBeenCalledExactlyOnceWith("tags", { ids: [1, 2, 3] });
  });
});
