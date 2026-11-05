/**
 * `<MdxInput>` tests. jsdom cannot run ProseMirror, so `@milkdown/crepe` is a
 * fake `Crepe` that records its config and calls and lets the test fire
 * `markdownUpdated` and `blur`, and `replaceAll` returns a callback that
 * carries the markdown it was given. Mounted under a real `<Admin>` with a
 * `useForm` host.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import type { CrepeEditorConfig } from "./internal/crepe-editor.vue";
import MdxInput, { type MdxInputProps } from "./mdx-input.vue";

// The real serializer normalizes: it ends the text with a newline.
const serialize = (markdown: string) =>
  markdown.endsWith("\n") ? markdown : `${markdown}\n`;

type Listener = (ctx: unknown, markdown: string) => void;

interface FakeCrepe {
  config: Record<string, unknown>;
  markdown: string;
  readonly: boolean[];
  actions: { markdown: string }[];
  listeners: { markdownUpdated: Listener[]; blur: (() => void)[] };
}

const hoisted = vi.hoisted(() => ({ instances: [] as FakeCrepe[] }));

vi.mock("@milkdown/crepe", () => {
  class FakeCrepeImpl implements FakeCrepe {
    static Feature = { CodeMirror: "code-mirror", Latex: "latex" };
    config: Record<string, unknown>;
    markdown: string;
    readonly: boolean[] = [];
    actions: { markdown: string }[] = [];
    listeners: FakeCrepe["listeners"] = { markdownUpdated: [], blur: [] };
    editor = {
      action: (fn: { markdown: string }) => {
        this.actions.push(fn);
        this.markdown = serialize(fn.markdown);
        // The real editor reports the new text back through `markdownUpdated`,
        // after a debounce, so not before `action` returns.
        const text = this.markdown;
        void Promise.resolve().then(() => {
          for (const l of this.listeners.markdownUpdated) l({}, text);
        });
      },
    };

    constructor(config: Record<string, unknown>) {
      this.config = config;
      this.markdown = serialize(String(config.defaultValue ?? ""));
      hoisted.instances.push(this);
    }
    on(fn: (api: unknown) => void) {
      fn({
        markdownUpdated: (l: Listener) =>
          this.listeners.markdownUpdated.push(l),
        blur: (l: () => void) => this.listeners.blur.push(l),
      });
      return this;
    }
    create() {
      return Promise.resolve(this);
    }
    setReadonly(value: boolean) {
      this.readonly.push(value);
      return this;
    }
    getMarkdown() {
      return this.markdown;
    }
    destroy() {
      return Promise.resolve(this);
    }
  }
  return { Crepe: FakeCrepeImpl };
});

vi.mock("@milkdown/kit/utils", () => ({
  replaceAll: (markdown: string) => ({ markdown }),
}));

beforeEach(() => {
  hoisted.instances.length = 0;
});

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
});

const i18nMessages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
};

interface FormValues {
  body?: unknown;
}

function mountInput(
  props: Partial<MdxInputProps>,
  { record }: { record: FormValues },
) {
  const captured: { form?: UseFormReturn<FormValues> } = {};
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const FormHost = defineComponent({
    setup() {
      const form = useForm<FormValues>({
        record,
        onSubmit: async () => undefined,
      });
      captured.form = form;
      return () => h(MdxInput, { source: "body", ...props });
    },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
            i18n: createI18n({ locale: "en", messages: i18nMessages }),
          },
          { default: () => h(FormHost) },
        );
    },
  });
  const wrapper = mount(Harness, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return { wrapper, form: captured.form as UseFormReturn<FormValues> };
}

const only = () => {
  const [crepe] = hoisted.instances;
  if (!crepe || hoisted.instances.length !== 1) {
    throw new Error(`expected one editor, got ${hoisted.instances.length}`);
  }
  return crepe;
};

const type = (markdown: string) => {
  for (const l of only().listeners.markdownUpdated) l({}, markdown);
};

describe("MdxInput", () => {
  it("creates the editor with the initial markdown value", async () => {
    mountInput({}, { record: { body: "# Hello" } });
    await flushPromises();

    expect(only().config.defaultValue).toBe("# Hello");
    // The editor holds "# Hello\n"; that is not a change to replace.
    expect(only().actions).toEqual([]);
  });

  it("renders a custom label and helper text", async () => {
    const { wrapper } = mountInput(
      { label: "Notes", helperText: "Markdown only" },
      { record: { body: "x" } },
    );
    await flushPromises();

    const label = wrapper.get("label");
    expect(label.text()).toContain("Notes");
    expect(wrapper.text()).toContain("Markdown only");
    const editor = wrapper.get('[data-slot="mdx-editor"]');
    const id = editor.element.parentElement?.id;
    expect(id).toBeTruthy();
    expect(label.attributes("for")).toBe(id);
  });

  it("is read-only when disabled", async () => {
    mountInput({ disabled: true }, { record: { body: "x" } });
    await flushPromises();
    expect(only().readonly).toEqual([true]);
  });

  it("is read-only when readOnly is set", async () => {
    mountInput({ readOnly: true }, { record: { body: "x" } });
    await flushPromises();
    expect(only().readonly).toEqual([true]);
  });

  it("is editable by default", async () => {
    mountInput({}, { record: { body: "x" } });
    await flushPromises();
    expect(only().readonly).toEqual([false]);
  });

  it("shows the required error on submit when the value is empty", async () => {
    const { wrapper, form } = mountInput(
      { validate: required() },
      { record: { body: "" } },
    );
    await flushPromises();
    await form.submit();
    await flushPromises();
    expect(wrapper.text()).toContain("Required");
  });

  it("writes the editor markdown to the form on change", async () => {
    const { form } = mountInput({}, { record: { body: "" } });
    await flushPromises();

    type("# Typed");
    await nextTick();
    expect(form.values.value.body).toBe("# Typed");
  });

  it("keeps an empty string when the editor is cleared", async () => {
    const { form } = mountInput({}, { record: { body: "# Old" } });
    await flushPromises();

    type("");
    await nextTick();
    expect(form.values.value.body).toBe("");
  });

  it("replaces the editor content when the form value changes from outside", async () => {
    const { form } = mountInput({}, { record: { body: "one" } });
    await flushPromises();

    form.form.setFieldValue("body", "two");
    await flushPromises();
    expect(only().actions).toEqual([{ markdown: "two" }]);

    form.form.setFieldValue("body", null);
    await flushPromises();
    expect(only().actions).toEqual([{ markdown: "two" }, { markdown: "" }]);
  });

  it("does not write to the form when the content is replaced from outside", async () => {
    const { form } = mountInput({}, { record: { body: "one" } });
    await flushPromises();

    form.form.setFieldValue("body", "two");
    await flushPromises();

    // The editor reported "two\n" back; the form still holds what was written.
    expect(form.values.value.body).toBe("two");
  });

  it("marks the field touched on blur", async () => {
    const { form } = mountInput({}, { record: { body: "x" } });
    await flushPromises();
    expect(form.form.getFieldMeta("body")?.isTouched).toBeFalsy();

    for (const l of only().listeners.blur) l();
    await flushPromises();
    expect(form.form.getFieldMeta("body")?.isTouched).toBe(true);
  });

  it("passes crepeConfig through to the editor", async () => {
    const crepeConfig: CrepeEditorConfig = {
      featureConfigs: { placeholder: { text: "Write" } },
    };
    mountInput({ crepeConfig }, { record: { body: "x" } });
    await flushPromises();
    expect(only().config.featureConfigs).toEqual({
      placeholder: { text: "Write" },
    });
  });
});
