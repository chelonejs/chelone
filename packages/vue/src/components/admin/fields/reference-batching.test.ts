import { fakeDataProvider, type LooseRecord } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { useListContext } from "../../../list/list-context";
import { provideRecordContext } from "../../../record/record-context";
import ReferenceArrayField from "./reference-array-field.vue";
import ReferenceField from "./reference-field.vue";
import TextField from "./text-field.vue";

const authors = [
  { id: 1, name: "Jane Doe" },
  { id: 2, name: "John Smith" },
];

const tags = [
  { id: 1, name: "Tech" },
  { id: 2, name: "News" },
  { id: 3, name: "Lifestyle" },
];

const queryClients: QueryClient[] = [];

// A literal record passed to a generic field through `h` is checked against
// `ResourceRecord`, which has no `author_id`. Typed loose, it is not.
function loose(record: LooseRecord): LooseRecord {
  return record;
}

function makeProvider() {
  return fakeDataProvider({
    authors: structuredClone(authors),
    tags: structuredClone(tags),
  });
}

async function mountAdmin(
  render: () => unknown,
  dataProvider = makeProvider(),
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: Infinity },
    },
  });
  queryClients.push(queryClient);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/");
  await router.isReady();
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
afterEach(() => {
  for (const queryClient of queryClients.splice(0)) queryClient.clear();
});

describe("ReferenceField", () => {
  it("updates slot children when the ambient foreign key changes", async () => {
    const record = ref({ id: 10, author_id: 1 });
    const Row = defineComponent({
      setup() {
        provideRecordContext(record);
        return () =>
          h(
            ReferenceField,
            { source: "author_id", reference: "authors", empty: "No author" },
            {
              default: () => h(TextField, { source: "name" }),
            },
          );
      },
    });
    const wrapper = await mountAdmin(() => h(Row));
    await vi.waitFor(() => expect(wrapper.text()).toBe("Jane Doe"));
    record.value.author_id = 2;
    await vi.waitFor(() => expect(wrapper.text()).toBe("John Smith"));
    record.value.author_id = 99;
    await vi.waitFor(() => expect(wrapper.text()).toBe("No author"));
  });

  it("renders nothing when the provider omits the id", async () => {
    const dataProvider = makeProvider();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const getMany = vi
      .spyOn(dataProvider, "getMany")
      .mockResolvedValue({ data: [] });
    const wrapper = await mountAdmin(
      () => [
        h("section", { "aria-label": "Missing author" }, [
          h(
            ReferenceField,
            {
              source: "author_id",
              reference: "authors",
              record: loose({ id: 10, author_id: 99 }),
            },
            {
              default: () => h("span", "Resolved author"),
            },
          ),
        ]),
        h(ReferenceField, {
          source: "author_id",
          reference: "authors",
          record: loose({ id: 10, author_id: 99 }),
          empty: "No author",
        }),
      ],
      dataProvider,
    );
    await vi.waitFor(() => expect(wrapper.text()).toBe("No author"));
    expect(wrapper.get('[aria-label="Missing author"]').text()).toBe("");
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith(
      "authors",
      expect.objectContaining({ ids: [99] }),
    );
    expect(getOne).not.toHaveBeenCalled();
  });

  it("three rows over two authors make one getMany call with each id once and no getOne call", async () => {
    const dataProvider = makeProvider();
    const getMany = vi.spyOn(dataProvider, "getMany");
    const getOne = vi.spyOn(dataProvider, "getOne");
    const wrapper = await mountAdmin(
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
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith(
      "authors",
      expect.objectContaining({ ids: expect.arrayContaining([1, 2]) }),
    );
    expect(getMany.mock.calls[0]?.[1].ids).toHaveLength(2);
    expect(getOne).not.toHaveBeenCalled();
  });
});

const ListStatus = defineComponent({
  setup() {
    const list = useListContext();
    return () =>
      list.error
        ? h("p", { role: "alert" }, "Lookup failed")
        : list.isPending
          ? h("p", { role: "status" }, "Loading")
          : h(TagList);
  },
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
  it("lists only records returned for its requested ids", async () => {
    const dataProvider = makeProvider();
    const getMany = vi
      .spyOn(dataProvider, "getMany")
      .mockResolvedValue({ data: [{ id: 1, name: "Tech" }] });
    const wrapper = await mountAdmin(
      () =>
        h(
          ReferenceArrayField,
          {
            source: "tag_ids",
            reference: "tags",
            record: loose({ id: 10, tag_ids: [1, 99] }),
          },
          { default: () => h(ListStatus) },
        ),
      dataProvider,
    );
    await vi.waitFor(() =>
      expect(wrapper.findAll("li").map((item) => item.text())).toEqual([
        "Tech",
      ]),
    );
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith(
      "tags",
      expect.objectContaining({ ids: expect.arrayContaining([1, 99]) }),
    );
    expect(getMany.mock.calls[0]?.[1].ids).toHaveLength(2);
  });

  it.each([
    { label: "missing", record: {} },
    { label: "undefined", record: { tag_ids: undefined } },
    { label: "null", record: { tag_ids: null } },
    { label: "empty", record: { tag_ids: [] } },
    { label: "string", record: { tag_ids: "invalid" } },
    { label: "object", record: { tag_ids: {} } },
  ])("does not fetch a $label FK array", async ({ record }) => {
    const dataProvider = makeProvider();
    const getMany = vi.spyOn(dataProvider, "getMany");
    const wrapper = await mountAdmin(
      () => [
        h("section", { "aria-label": "Empty tags" }, [
          h(
            ReferenceArrayField,
            {
              source: "tag_ids",
              reference: "tags",
              record: loose({ id: 10, ...record }),
            },
            { default: () => h(ListStatus) },
          ),
        ]),
        h(ReferenceField, {
          source: "tag_id",
          reference: "tags",
          record: loose({ id: 10, tag_id: 3 }),
        }),
      ],
      dataProvider,
    );
    // The sibling's result proves the aggregate batch has flushed.
    await vi.waitFor(() => expect(wrapper.text()).toBe("Lifestyle"));
    const field = wrapper.get('[aria-label="Empty tags"]');
    expect(field.find("ul").exists()).toBe(true);
    expect(field.findAll("li")).toHaveLength(0);
    expect(field.find('[role="status"]').exists()).toBe(false);
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith(
      "tags",
      expect.objectContaining({ ids: [3] }),
    );
  });

  it("exposes a rejected batch and clears its error when the FK array becomes empty", async () => {
    const dataProvider = makeProvider();
    const getMany = vi
      .spyOn(dataProvider, "getMany")
      .mockRejectedValue(new Error("Offline"));
    const record = ref({ id: 10, tag_ids: [1] });
    const Row = defineComponent({
      setup() {
        provideRecordContext(record);
        return () =>
          h(
            ReferenceArrayField,
            { source: "tag_ids", reference: "tags" },
            { default: () => h(ListStatus) },
          );
      },
    });
    const wrapper = await mountAdmin(() => h(Row), dataProvider);
    expect(wrapper.get('[role="status"]').text()).toBe("Loading");
    await vi.waitFor(() =>
      expect(wrapper.get('[role="alert"]').text()).toBe("Lookup failed"),
    );
    record.value.tag_ids = [];
    await vi.waitFor(() => {
      expect(wrapper.find("ul").exists()).toBe(true);
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      expect(wrapper.findAll("li")).toHaveLength(0);
    });
    expect(getMany).toHaveBeenCalledTimes(1);
  });

  it("shares batches across sources and scalar fields while isolating resources", async () => {
    const dataProvider = makeProvider();
    const getMany = vi.spyOn(dataProvider, "getMany");
    const getOne = vi.spyOn(dataProvider, "getOne");
    const wrapper = await mountAdmin(
      () => [
        h("section", { "aria-label": "Primary tags" }, [
          h(
            ReferenceArrayField,
            {
              source: "tag_ids",
              reference: "tags",
              record: loose({ id: 10, tag_ids: [1, 1, 2] }),
            },
            { default: () => h(ListStatus) },
          ),
        ]),
        h("section", { "aria-label": "Other tags" }, [
          h(
            ReferenceArrayField,
            {
              source: "other_tag_ids",
              reference: "tags",
              record: loose({ id: 10, other_tag_ids: [2, 3] }),
            },
            { default: () => h(TagList) },
          ),
        ]),
        h("section", { "aria-label": "Single tag" }, [
          h(ReferenceField, {
            source: "tag_id",
            reference: "tags",
            record: loose({ id: 10, tag_id: 3 }),
          }),
        ]),
        h("section", { "aria-label": "Authors" }, [
          h(
            ReferenceArrayField,
            {
              source: "author_ids",
              reference: "authors",
              record: loose({ id: 10, author_ids: [1] }),
            },
            { default: () => h(TagList) },
          ),
        ]),
      ],
      dataProvider,
    );
    await vi.waitFor(() => {
      expect(
        wrapper
          .get('[aria-label="Primary tags"]')
          .findAll("li")
          .map((item) => item.text()),
      ).toEqual(["Tech", "News"]);
      expect(
        wrapper
          .get('[aria-label="Other tags"]')
          .findAll("li")
          .map((item) => item.text()),
      ).toEqual(["News", "Lifestyle"]);
      expect(wrapper.get('[aria-label="Single tag"]').text()).toBe("Lifestyle");
      expect(
        wrapper
          .get('[aria-label="Authors"]')
          .findAll("li")
          .map((item) => item.text()),
      ).toEqual(["Jane Doe"]);
    });
    expect(getMany).toHaveBeenCalledTimes(2);
    expect(getMany).toHaveBeenCalledWith(
      "tags",
      expect.objectContaining({ ids: expect.arrayContaining([1, 2, 3]) }),
    );
    expect(
      getMany.mock.calls.find(([resource]) => resource === "tags")?.[1].ids,
    ).toHaveLength(3);
    expect(getMany).toHaveBeenCalledWith(
      "authors",
      expect.objectContaining({ ids: [1] }),
    );
    expect(getOne).not.toHaveBeenCalled();
  });

  it("two fields with overlapping ids make one getMany call and each lists only its own records", async () => {
    const dataProvider = makeProvider();
    const getMany = vi.spyOn(dataProvider, "getMany");
    const getOne = vi.spyOn(dataProvider, "getOne");
    const wrapper = await mountAdmin(
      () => [
        h(
          ReferenceArrayField,
          {
            source: "tag_ids",
            reference: "tags",
            record: loose({ id: 10, tag_ids: [1, 1, 2] }),
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
            record: loose({ id: 11, tag_ids: [2, 3] }),
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
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith(
      "tags",
      expect.objectContaining({ ids: expect.arrayContaining([1, 2, 3]) }),
    );
    expect(getMany.mock.calls[0]?.[1].ids).toHaveLength(3);
    expect(getOne).not.toHaveBeenCalled();
  });
});
