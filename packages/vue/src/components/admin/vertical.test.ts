/**
 * Task 7 gate probes for the `@chelone/vue` component vertical: a `<DataTable>`
 * over seeded data shows a seeded cell + a `<ReferenceField>` resolves the
 * referenced name; a `<TextInput>` two-way binds the ambient form; a
 * `<SaveButton>` submits the composed `<Edit>` pipeline (persists via the
 * dataProvider). Mounted under a real `<Admin>` (which provides the Chelone
 * context + a mounted vue-query client + the router adapter), exactly like the
 * Task 5 controller tests.
 */

import {
  createI18n,
  defaultMessages,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../admin/admin.vue";
import { useCheloneFormContext } from "../../form/form-context";
import { useForm } from "../../form/use-form";
import SaveButton from "./buttons/save-button.vue";
import ReferenceField from "./fields/reference-field.vue";
import BooleanInput from "./inputs/boolean-input.vue";
import NumberInput from "./inputs/number-input.vue";
import ReferenceInput from "./inputs/reference-input.vue";
import TextInput from "./inputs/text-input.vue";
import DataTable from "./list/data-table.vue";
import DataTableCol from "./list/data-table-col.vue";
import Create from "./view/create.vue";
import Edit from "./view/edit.vue";
import List from "./view/list.vue";

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
  { id: 1, title: "Hello World", author_id: 10, views: 5 },
  { id: 2, title: "Second Post", author_id: 11, views: 9 },
];
const seedAuthors: Author[] = [
  { id: 10, name: "Ada Lovelace" },
  { id: 11, name: "Alan Turing" },
];

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

/** Mount `render()` inside `<Admin>` + a router. Returns the wrapper + provider. */
function mountAdmin(render: () => unknown, dataProvider = makeProvider()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();
  const Harness = defineComponent({
    setup() {
      return () => h(Admin, { dataProvider, queryClient }, { default: render });
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, dataProvider, queryClient };
}

describe("<DataTable> + <ReferenceField>", () => {
  it("renders a seeded cell and resolves the referenced author name", async () => {
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
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

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Hello World");
    });
    // The reference field resolved the FK author_id=10 → "Ada Lovelace".
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Ada Lovelace");
    });
    expect(wrapper.text()).toContain("Second Post");
    expect(wrapper.text()).toContain("Alan Turing");
  });
});

describe("<TextInput>", () => {
  it("two-way binds the ambient form value", async () => {
    const captured: { values?: () => Record<string, unknown> } = {};
    const FormHost = defineComponent({
      setup(_, { slots }) {
        const form = useForm<Record<string, unknown>>({
          resource: "posts",
          record: { id: 1, title: "Initial", author_id: 10, views: 0 },
          onSubmit: () => undefined,
        });
        captured.values = () => form.values.value;
        return () => slots.default?.();
      },
    });

    const { wrapper } = mountAdmin(() =>
      h(FormHost, null, {
        default: () => h(TextInput, { source: "title" }),
      }),
    );
    await flushPromises();

    const input = wrapper.find('input[type="text"]');
    expect(elementOf(input.element, HTMLInputElement).value).toBe("Initial");

    await input.setValue("Rebound");
    await nextTick();
    expect(captured.values?.().title).toBe("Rebound");
  });
});

describe("<NumberInput> / <BooleanInput>", () => {
  function mountInputInForm(render: () => unknown) {
    const captured: { values?: () => Record<string, unknown> } = {};
    const FormHost = defineComponent({
      setup(_, { slots }) {
        const form = useForm<Record<string, unknown>>({
          resource: "posts",
          record: { id: 1, title: "T", author_id: 10, views: 3 },
          onSubmit: () => undefined,
        });
        captured.values = () => form.values.value;
        return () => slots.default?.();
      },
    });
    const { wrapper } = mountAdmin(() =>
      h(FormHost, null, { default: render }),
    );
    return { wrapper, captured };
  }

  it("NumberInput parses the typed string to a number", async () => {
    const { wrapper, captured } = mountInputInForm(() =>
      h(NumberInput, { source: "views" }),
    );
    await flushPromises();
    const input = wrapper.find('input[type="number"]');
    expect(elementOf(input.element, HTMLInputElement).value).toBe("3");
    await input.setValue("42");
    await nextTick();
    expect(captured.values?.().views).toBe(42);
  });

  it("BooleanInput writes a boolean via the switch", async () => {
    const { wrapper, captured } = mountInputInForm(() =>
      h(BooleanInput, { source: "featured" }),
    );
    await flushPromises();
    const toggle = wrapper.find('input[type="checkbox"]');
    await toggle.setValue(true);
    await nextTick();
    expect(captured.values?.().featured).toBe(true);
  });
});

describe("<ReferenceInput>", () => {
  it("fetches choices and binds the selected FK", async () => {
    const captured: { values?: () => Record<string, unknown> } = {};
    const FormHost = defineComponent({
      setup(_, { slots }) {
        const form = useForm<Record<string, unknown>>({
          resource: "posts",
          record: { id: 1, title: "T", author_id: 10, views: 3 },
          onSubmit: () => undefined,
        });
        captured.values = () => form.values.value;
        return () => slots.default?.();
      },
    });
    const { wrapper } = mountAdmin(() =>
      h(FormHost, null, {
        default: () =>
          h(ReferenceInput, { source: "author_id", reference: "authors" }),
      }),
    );

    // Choices load from the authors resource.
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Ada Lovelace");
      expect(wrapper.text()).toContain("Alan Turing");
    });
    const select = wrapper.find("select");
    await select.setValue("11");
    await nextTick();
    // The FK is written back as its original numeric type.
    expect(captured.values?.().author_id).toBe(11);
  });
});

describe("<SaveButton> in <Create>", () => {
  it("submits the create pipeline and persists a new record", async () => {
    const dataProvider = makeProvider();
    const createSpy = vi.spyOn(dataProvider, "create");

    const { wrapper } = mountAdmin(
      () =>
        h(
          Create,
          { resource: "posts", redirectOnSave: false },
          {
            default: () => h(TextInput, { source: "title" }),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );
    await flushPromises();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("Brand New");
    await nextTick();
    await wrapper.find('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
    });
    expect(createSpy.mock.calls[0]?.[1]).toMatchObject({
      data: expect.objectContaining({ title: "Brand New" }),
    });
  });
});

describe("<SaveButton> in <Create>", () => {
  it("the button reads Save with no catalog entry for its label", async () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: defaultMessages },
    });
    const queryClient = new QueryClient();
    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            { dataProvider: makeProvider(), queryClient, i18n },
            {
              default: () =>
                h(
                  Create,
                  { resource: "posts", redirectOnSave: false },
                  {
                    default: () => h(TextInput, { source: "title" }),
                    toolbar: () => h(SaveButton),
                  },
                ),
            },
          );
      },
    });
    const wrapper = mount(Harness, { global: { plugins: [makeRouter()] } });
    await flushPromises();

    expect(wrapper.find('[data-slot="save-button"]').text()).toBe("Save");
  });
});

describe("<SaveButton> in <Edit>", () => {
  it("submits the composed edit pipeline and persists the change", async () => {
    const dataProvider = makeProvider();
    const updateSpy = vi.spyOn(dataProvider, "update");

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
      dataProvider,
    );

    // Wait for the record to hydrate (Edit renders its body once record lands).
    await vi.waitFor(() => {
      const input = wrapper.find('input[type="text"]');
      expect(input.exists()).toBe(true);
      expect(elementOf(input.element, HTMLInputElement).value).toBe(
        "Hello World",
      );
    });

    const input = wrapper.find('input[type="text"]');
    await input.setValue("Edited Title");
    await nextTick();

    await wrapper.find('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
    // The change persisted through the provider.
    const persisted = await dataProvider.getOne("posts", { id: 1 });
    expect(persisted.data.title).toBe("Edited Title");
  });
});

describe("form options on the view", () => {
  // The registry schema accepts "Brand New", so only `validate` can block it.
  const reject = () => ({ title: "Rejected by validate" });

  it("validate on <Create> blocks a save that fails it", async () => {
    const dataProvider = makeProvider();
    const createSpy = vi.spyOn(dataProvider, "create");

    const { wrapper } = mountAdmin(
      () =>
        h(
          Create,
          { resource: "posts", redirectOnSave: false, validate: reject },
          {
            default: () => h(TextInput, { source: "title" }),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );
    await flushPromises();

    await wrapper.find('input[type="text"]').setValue("Brand New");
    await nextTick();
    await wrapper.find('[data-slot="save-button"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Rejected by validate");
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("validate on <Edit> blocks a save that fails it", async () => {
    const dataProvider = makeProvider();
    const updateSpy = vi.spyOn(dataProvider, "update");

    const { wrapper } = mountAdmin(
      () =>
        h(
          Edit,
          { resource: "posts", id: 1, redirectOnSave: false, validate: reject },
          {
            default: () => h(TextInput, { source: "title" }),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );

    await vi.waitFor(() => {
      const input = wrapper.find('input[type="text"]');
      expect(elementOf(input.element, HTMLInputElement).value).toBe(
        "Hello World",
      );
    });

    await wrapper.find('input[type="text"]').setValue("Edited Title");
    await nextTick();
    await wrapper.find('[data-slot="save-button"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Rejected by validate");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("sanitizeEmptyValues on <Edit> sends null for a cleared field of the record", async () => {
    const dataProvider = makeProvider();
    const updateSpy = vi.spyOn(dataProvider, "update");

    const { wrapper } = mountAdmin(
      () =>
        h(
          Edit,
          {
            resource: "posts",
            id: 1,
            redirectOnSave: false,
            sanitizeEmptyValues: true,
            // Only the sanitize step is under test, not the registry schema.
            schema: z.object({}).passthrough(),
          },
          {
            default: () => h(TextInput, { source: "title" }),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );

    await vi.waitFor(() => {
      const input = wrapper.find('input[type="text"]');
      expect(elementOf(input.element, HTMLInputElement).value).toBe(
        "Hello World",
      );
    });

    await wrapper.find('input[type="text"]').setValue("");
    await nextTick();
    await wrapper.find('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
    expect(updateSpy.mock.calls[0]?.[1].data).toHaveProperty("title", null);
  });

  it("sanitizeEmptyValues on <Create> sends null for a cleared field of the seed", async () => {
    const dataProvider = makeProvider();
    const createSpy = vi.spyOn(dataProvider, "create");

    const { wrapper } = mountAdmin(
      () =>
        h(
          Create,
          {
            resource: "posts",
            redirectOnSave: false,
            sanitizeEmptyValues: true,
            record: { title: "Seeded" },
            schema: z.object({}).passthrough(),
          },
          {
            default: () => h(TextInput, { source: "title" }),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );
    await flushPromises();

    await wrapper.find('input[type="text"]').setValue("");
    await nextTick();
    await wrapper.find('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
    });
    expect(createSpy.mock.calls[0]?.[1].data).toHaveProperty("title", null);
  });

  it("validate on <Edit> runs the latest prop, not the first", async () => {
    const dataProvider = makeProvider();
    const updateSpy = vi.spyOn(dataProvider, "update");
    const strict = ref(false);

    const { wrapper } = mountAdmin(
      () =>
        h(
          Edit,
          {
            resource: "posts",
            id: 1,
            redirectOnSave: false,
            validate: strict.value ? reject : () => undefined,
          },
          {
            default: () => h(TextInput, { source: "title" }),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );

    await vi.waitFor(() => {
      const input = wrapper.find('input[type="text"]');
      expect(elementOf(input.element, HTMLInputElement).value).toBe(
        "Hello World",
      );
    });

    strict.value = true;
    await nextTick();
    await wrapper.find('input[type="text"]').setValue("Edited Title");
    await nextTick();
    await wrapper.find('[data-slot="save-button"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Rejected by validate");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("validate added to <Edit> after mount blocks a save", async () => {
    const dataProvider = makeProvider();
    const updateSpy = vi.spyOn(dataProvider, "update");
    const strict = ref(false);

    const { wrapper } = mountAdmin(
      () =>
        h(
          Edit,
          {
            resource: "posts",
            id: 1,
            redirectOnSave: false,
            validate: strict.value ? reject : undefined,
          },
          {
            default: () => h(TextInput, { source: "title" }),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );

    await vi.waitFor(() => {
      const input = wrapper.find('input[type="text"]');
      expect(elementOf(input.element, HTMLInputElement).value).toBe(
        "Hello World",
      );
    });

    strict.value = true;
    await nextTick();
    await wrapper.find('input[type="text"]').setValue("Edited Title");
    await nextTick();
    await wrapper.find('[data-slot="save-button"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Rejected by validate");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("onSuccess on <Edit> sees the form reconciled to the server record", async () => {
    const dataProvider = makeProvider();
    vi.spyOn(dataProvider, "update").mockImplementation(async (_, params) => ({
      data: {
        ...defined(params.previousData),
        ...params.data,
        id: 1,
        title: "Server Title",
      },
    }));
    const seen: { title?: unknown; isDirty?: boolean } = {};
    let formApi: ReturnType<typeof useCheloneFormContext>["form"] | undefined;
    const Probe = defineComponent({
      setup() {
        formApi = useCheloneFormContext().form;
        return () => null;
      },
    });

    const { wrapper } = mountAdmin(
      () =>
        h(
          Edit,
          {
            resource: "posts",
            id: 1,
            redirectOnSave: false,
            onSuccess: () => {
              seen.title = formApi?.ambient.getFieldValue("title");
              seen.isDirty = formApi?.ambient.store.state.isDirty;
            },
          },
          {
            default: () => [h(Probe), h(TextInput, { source: "title" })],
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );

    await vi.waitFor(() => {
      const input = wrapper.find('input[type="text"]');
      expect(elementOf(input.element, HTMLInputElement).value).toBe(
        "Hello World",
      );
    });

    await wrapper.find('input[type="text"]').setValue("Edited Title");
    await nextTick();
    await wrapper.find('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => {
      expect(seen.title).toBeDefined();
    });
    expect(seen).toEqual({ title: "Server Title", isDirty: false });
  });
});
