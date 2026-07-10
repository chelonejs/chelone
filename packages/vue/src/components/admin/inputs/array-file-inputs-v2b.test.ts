/**
 * V2-b T3 wave — the array family + file/image inputs ported from their
 * `@chelone/react` twins (reference-array, array, datagrid,
 * subscription-plan-picker, file, image). Each is mounted under a real `<Admin>`
 * + `useForm` host (as in `choice-inputs-v2b.test.ts`). jsdom applies no CSS:
 * assert DOM structure/roles/values + behavior, never styling.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../../form/use-form";
import { useRecordContext } from "../../../record/record-context";
import ArrayInput from "./array-input.vue";
import DatagridInput from "./datagrid-input.vue";
import FileInput from "./file-input.vue";
import ImageInput from "./image-input.vue";
import NumberInput from "./number-input.vue";
import ReferenceArrayInput from "./reference-array-input.vue";
import SubscriptionPlanPicker from "./subscription-plan-picker.vue";
import TextInput from "./text-input.vue";

interface FormValues {
  id?: number;
  items?: unknown;
  tags?: unknown;
  tag_ids?: unknown;
  planId?: unknown;
  attachments?: unknown;
  avatar?: unknown;
  pictures?: unknown;
}

const CATEGORY_CHOICES = [
  { id: "tech", name: "Tech" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "people", name: "People" },
];

const TAG_RECORDS = [
  { id: 1, name: "Tech" },
  { id: 2, name: "News" },
  { id: 3, name: "Lifestyle" },
];

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

interface Captured {
  form?: UseFormReturn<FormValues>;
  values?: () => Record<string, unknown>;
}

function mountInForm(
  render: () => unknown,
  {
    record,
    records = {},
  }: { record: FormValues; records?: Record<string, unknown[]> },
) {
  const captured: Captured = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();
  const dataProvider = fakeDataProvider(records);

  const FormHost = defineComponent({
    setup(_, { slots }) {
      const form = useForm<FormValues>({
        record,
        onSubmit: async () => undefined,
      });
      captured.form = form;
      captured.values = () => form.values.value as Record<string, unknown>;
      return () => slots.default?.();
    },
  });

  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient },
          {
            default: () => h(FormHost, null, { default: render }),
            // Override #layout with an empty node to suppress the default
            // <Layout> chrome (a null slot falls back to the chrome, whose
            // sidebar DOM would pollute this harness's document-wide queries).
            layout: () => h("div"),
          },
        );
    },
  });

  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, captured };
}

describe("<SubscriptionPlanPicker>", () => {
  const PLANS = [
    {
      id: "basic",
      name: "Basic",
      price: 9,
      currency: "USD",
      interval: "month" as const,
    },
    {
      id: "pro",
      name: "Pro",
      price: 29,
      currency: "USD",
      interval: "month" as const,
    },
    {
      id: "max",
      name: "Max",
      price: 99,
      currency: "USD",
      interval: "month" as const,
    },
  ];

  it("renders a card per plan and marks the selected one", async () => {
    const { wrapper } = mountInForm(
      () => h(SubscriptionPlanPicker, { source: "planId", plans: PLANS }),
      { record: { id: 1, planId: "pro" } },
    );
    await flushPromises();

    const cards = wrapper.findAll('[role="radio"]');
    expect(cards).toHaveLength(3);
    const pro = wrapper.find('[data-plan-card="pro"]');
    expect(pro.attributes("data-selected")).toBe("true");
    expect(pro.attributes("aria-checked")).toBe("true");
  });

  it("clicking a plan writes its id to the form", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(SubscriptionPlanPicker, {
          source: "planId",
          plans: PLANS,
          recommendedPlanId: "pro",
        }),
      { record: { id: 1, planId: "basic" } },
    );
    await flushPromises();

    const proCard = wrapper.find('[data-plan-card="pro"]');
    await proCard.find("button").trigger("click");
    await nextTick();
    expect(captured.values?.().planId).toBe("pro");
  });
});

describe("<DatagridInput>", () => {
  it("renders the choices as table rows and toggles selection", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(DatagridInput, { source: "tags", choices: CATEGORY_CHOICES }),
      { record: { id: 1, tags: [] } },
    );
    await flushPromises();

    // header checkbox + one per choice.
    const boxes = wrapper.findAll('input[type="checkbox"]');
    expect(boxes).toHaveLength(4);
    // 3 body rows carrying the choice text.
    expect(wrapper.find("tbody").text()).toContain("Tech");

    await boxes[1].setValue(true); // first choice (tech)
    await nextTick();
    expect(captured.values?.().tags).toEqual(["tech"]);
    await boxes[3].setValue(true); // people
    await nextTick();
    expect(captured.values?.().tags).toEqual(["tech", "people"]);
  });

  it("select-all toggles every row on and off", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(DatagridInput, { source: "tags", choices: CATEGORY_CHOICES }),
      { record: { id: 1, tags: [] } },
    );
    await flushPromises();

    const header = wrapper.findAll('input[type="checkbox"]')[0];
    await header.setValue(true);
    await nextTick();
    expect(captured.values?.().tags).toEqual(["tech", "lifestyle", "people"]);
    await header.setValue(false);
    await nextTick();
    expect(captured.values?.().tags).toEqual([]);
  });
});

describe("<ArrayInput>", () => {
  const rows = () =>
    h(
      ArrayInput,
      { source: "items" },
      {
        default: () => [
          h(TextInput, { source: "name" }),
          h(NumberInput, { source: "price" }),
        ],
      },
    );

  it("renders one row per array item and adds a row", async () => {
    const { wrapper, captured } = mountInForm(rows, {
      record: { id: 1, items: [{ name: "Widget", price: 3 }] },
    });
    await flushPromises();

    expect(wrapper.findAll('[data-slot="array-input-row"]')).toHaveLength(1);

    await wrapper.find('[data-slot="array-input-add"]').trigger("click");
    await nextTick();
    expect(wrapper.findAll('[data-slot="array-input-row"]')).toHaveLength(2);
    const items = captured.values?.().items as unknown[];
    expect(items).toHaveLength(2);
  });

  it("removes a row and drops its value", async () => {
    const { wrapper, captured } = mountInForm(rows, {
      record: {
        id: 1,
        items: [
          { name: "A", price: 1 },
          { name: "B", price: 2 },
        ],
      },
    });
    await flushPromises();

    expect(wrapper.findAll('[data-slot="array-input-row"]')).toHaveLength(2);
    const remove = wrapper.findAll('[data-slot="array-input-remove"]')[0];
    await remove.trigger("click");
    await nextTick();
    expect(wrapper.findAll('[data-slot="array-input-row"]')).toHaveLength(1);
    const items = captured.values?.().items as Array<{ name: string }>;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("B");
  });

  it("edits a nested field through the row scope", async () => {
    const { wrapper, captured } = mountInForm(rows, {
      record: { id: 1, items: [{ name: "A", price: 1 }] },
    });
    await flushPromises();

    await wrapper.find('input[type="text"]').setValue("Renamed");
    await nextTick();
    const items = captured.values?.().items as Array<{ name: string }>;
    expect(items[0].name).toBe("Renamed");
  });
});

describe("<ReferenceArrayInput>", () => {
  it("fetches the reference resource and lists its records as choices", async () => {
    const { wrapper } = mountInForm(
      () => h(ReferenceArrayInput, { source: "tag_ids", reference: "tags" }),
      { record: { id: 1, tag_ids: [] }, records: { tags: TAG_RECORDS } },
    );
    await flushPromises();
    await flushPromises();

    await wrapper.find('input[role="combobox"]').trigger("focus");
    await nextTick();
    const options = wrapper.findAll('[role="option"]');
    expect(options.length).toBe(3);
    expect(wrapper.find('[role="listbox"]').text()).toContain("Tech");
    expect(wrapper.find('[role="listbox"]').text()).toContain("News");
  });

  it("adds a selected choice id to the form array", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(ReferenceArrayInput, { source: "tag_ids", reference: "tags" }),
      { record: { id: 1, tag_ids: [] }, records: { tags: TAG_RECORDS } },
    );
    await flushPromises();
    await flushPromises();

    await wrapper.find('input[role="combobox"]').trigger("focus");
    await nextTick();
    const news = wrapper
      .findAll('[role="option"]')
      .find((o) => o.text().includes("News"));
    await news?.trigger("mousedown");
    await nextTick();
    expect(captured.values?.().tag_ids).toEqual([2]);
  });

  it("renders a <DatagridInput> child against the reference choices", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(
          ReferenceArrayInput,
          { source: "tag_ids", reference: "tags" },
          { default: () => h(DatagridInput) },
        ),
      { record: { id: 1, tag_ids: [] }, records: { tags: TAG_RECORDS } },
    );
    await flushPromises();
    await flushPromises();

    // header checkbox + one per fetched tag.
    const boxes = wrapper.findAll('input[type="checkbox"]');
    expect(boxes).toHaveLength(4);
    expect(wrapper.find("tbody").text()).toContain("Tech");

    await boxes[2].setValue(true); // News (id 2)
    await nextTick();
    expect(captured.values?.().tag_ids).toEqual([2]);
  });
});

/** Preview child that surfaces the per-file record `src`/`title` as a link. */
const FilePreviewChild = defineComponent({
  setup() {
    const record = useRecordContext<{ src?: string; title?: string }>();
    return () =>
      h("a", { href: record?.src, title: record?.title }, record?.title);
  },
});

describe("<FileInput>", () => {
  it("renders a hidden file input and the humanized label", async () => {
    const { wrapper } = mountInForm(
      () =>
        h(
          FileInput,
          { source: "attachments", multiple: true },
          {
            default: () => h(FilePreviewChild),
          },
        ),
      { record: { id: 1, attachments: [] } },
    );
    await flushPromises();

    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Attachments");
  });

  it("publishes each existing file to its preview child via RecordContext", async () => {
    const { wrapper } = mountInForm(
      () =>
        h(
          FileInput,
          { source: "attachments", multiple: true },
          {
            default: () => h(FilePreviewChild),
          },
        ),
      {
        record: {
          id: 1,
          attachments: [
            { src: "https://example.org/a.pdf", title: "Cover" },
            { src: "https://example.org/b.png", title: "Plan" },
          ],
        },
      },
    );
    await flushPromises();

    const links = wrapper.findAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].attributes("title")).toBe("Cover");
    expect(links[1].attributes("title")).toBe("Plan");
  });

  it("removes a file on its remove button", async () => {
    const { wrapper } = mountInForm(
      () =>
        h(
          FileInput,
          { source: "attachments", multiple: true },
          {
            default: () => h(FilePreviewChild),
          },
        ),
      {
        record: {
          id: 1,
          attachments: [
            { src: "https://example.org/a.pdf", title: "Cover" },
            { src: "https://example.org/b.png", title: "Plan" },
          ],
        },
      },
    );
    await flushPromises();

    const removeButtons = wrapper.findAll(
      '[data-slot="file-input-preview"] button',
    );
    expect(removeButtons).toHaveLength(2);
    await removeButtons[0].trigger("click");
    await nextTick();
    const links = wrapper.findAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].attributes("title")).toBe("Plan");
  });

  it("selecting a file sets the value", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(
          FileInput,
          { source: "avatar" },
          {
            default: () => h(FilePreviewChild),
          },
        ),
      { record: { id: 1, avatar: null } },
    );
    await flushPromises();
    expect(wrapper.findAll("a")).toHaveLength(0);

    const input = wrapper.find('input[type="file"]');
    const file = new File(["hello"], "hello.png", { type: "image/png" });
    Object.defineProperty(input.element, "files", {
      value: [file],
      configurable: true,
    });
    await input.trigger("change");
    await nextTick();

    const value = captured.values?.().avatar as { title?: string };
    expect(value?.title).toBe("hello.png");
    expect(wrapper.findAll("a")).toHaveLength(1);
    expect(wrapper.find("a").attributes("title")).toBe("hello.png");
  });
});

describe("<ImageInput>", () => {
  it("renders a thumbnail img per file by default", async () => {
    const { wrapper } = mountInForm(
      () => h(ImageInput, { source: "pictures", multiple: true }),
      {
        record: {
          id: 1,
          pictures: [{ src: "https://example.org/pic.png", title: "Pic" }],
        },
      },
    );
    await flushPromises();

    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://example.org/pic.png");
    expect(img.attributes("title")).toBe("Pic");
  });
});
