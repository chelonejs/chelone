/**
 * `<MonacoJsonField>` tests. jsdom cannot run Monaco, so `@guolao/vue-monaco-editor`
 * is a stub `VueMonacoEditor` that renders its `value` and props and emits
 * `mount` with a fake editor, and `monaco-editor` is an empty module.
 */

import { fakeDataProvider, type LooseRecord } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { provideCheloneContext } from "../../context";
import type { Theme } from "../admin/layout/theme-context";
import ThemeProvider from "../admin/layout/theme-provider.vue";
import MonacoJsonField, {
  type MonacoJsonFieldProps,
} from "./monaco-json-field.vue";

vi.mock("monaco-editor", () => ({}));

const hoisted = vi.hoisted(() => ({ contentHeight: 0 }));

vi.mock("@guolao/vue-monaco-editor", async () => {
  const { defineComponent, h, onMounted } = await import("vue");
  return {
    loader: { config: vi.fn() },
    VueMonacoEditor: defineComponent({
      props: {
        value: String,
        language: String,
        theme: String,
        height: [Number, String],
        options: Object,
      },
      emits: ["mount"],
      setup(props, { emit }) {
        // Matches the real editor: `mount` fires once, after the first render.
        onMounted(() =>
          emit("mount", {
            getContentHeight: () => hoisted.contentHeight,
            onDidContentSizeChange: () => ({ dispose() {} }),
            layout: () => {},
          }),
        );
        return () =>
          h(
            "pre",
            {
              "data-testid": "editor",
              "data-language": props.language,
              "data-theme": props.theme,
              "data-height": String(props.height),
              "data-options": JSON.stringify(props.options),
            },
            props.value,
          );
      },
    }),
  };
});

beforeEach(() => {
  hoisted.contentHeight = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  vi.unstubAllGlobals();
  for (const w of mounted.splice(0)) w.unmount();
});

// The component is generic in its record, and `h` reads one at its bound, so the
// props are named at the loose record and spread into a fresh literal below.
function mountField(
  props: MonacoJsonFieldProps<LooseRecord>,
  theme: Theme = "light",
  slots?: Record<string, () => unknown>,
) {
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
      });
      return () =>
        h(
          ThemeProvider,
          { defaultTheme: theme, storageKey: `t-${theme}` },
          () => h(MonacoJsonField, { ...props }, slots),
        );
    },
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

/** Waits for the lazy chunk, then returns the stub editor element. */
async function editor(wrapper: ReturnType<typeof mountField>) {
  await vi.waitFor(() =>
    expect(wrapper.find('[data-testid="editor"]').exists()).toBe(true),
  );
  await flushPromises();
  return wrapper.get<HTMLElement>('[data-testid="editor"]').element;
}

const options = (el: HTMLElement) => JSON.parse(el.dataset.options ?? "{}");

describe("MonacoJsonField", () => {
  // First, because `defineAsyncComponent` keeps the chunk once it has resolved.
  it("shows the loading skeleton until the editor chunk resolves", async () => {
    const wrapper = mountField({ source: "meta", record: { id: 1, meta: 1 } });
    const skeleton = wrapper.find('[role="status"]');
    expect(skeleton.exists()).toBe(true);
    expect(skeleton.attributes("aria-label")).toBe("Loading editor");
    await editor(wrapper);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it("renders an object value as pretty JSON, read-only", async () => {
    const el = await editor(
      mountField({ source: "meta", record: { id: 1, meta: { a: 1 } } }),
    );
    expect(el.textContent).toBe(JSON.stringify({ a: 1 }, null, 2));
    expect(el.dataset.language).toBe("json");
    expect(options(el)).toMatchObject({
      readOnly: true,
      domReadOnly: true,
      automaticLayout: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: "on",
      wordWrap: "on",
      tabSize: 2,
    });
  });

  it("renders a string value as given", async () => {
    const el = await editor(
      mountField({ source: "raw", record: { id: 1, raw: '{"x":1}' } }),
    );
    expect(el.textContent).toBe('{"x":1}');
  });

  it("renders null for a missing value", async () => {
    const el = await editor(
      mountField({ source: "missing", record: { id: 1 } }),
    );
    expect(el.textContent).toBe("null");
  });

  it("shows the empty text instead of the editor when the value is missing", async () => {
    const wrapper = mountField({
      source: "missing",
      empty: "No metadata",
      record: { id: 1 },
    });
    await vi.waitFor(() => expect(wrapper.text()).toContain("No metadata"));
    expect(wrapper.find('[data-testid="editor"]').exists()).toBe(false);
    expect(wrapper.find("[empty]").exists()).toBe(false);
  });

  it("renders the #empty slot when given", async () => {
    const wrapper = mountField(
      { source: "missing", empty: "No metadata", record: { id: 1 } },
      "light",
      { empty: () => h("p", { "data-testid": "empty" }, "Nothing here") },
    );
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="empty"]').text()).toBe("Nothing here"),
    );
    expect(wrapper.text()).not.toContain("No metadata");
    expect(wrapper.find('[data-testid="editor"]').exists()).toBe(false);
  });

  it("ignores empty when the value is present", async () => {
    const wrapper = mountField(
      {
        source: "meta",
        empty: "No metadata",
        record: { id: 1, meta: { a: 1 } },
      },
      "light",
      { empty: () => h("p", "Nothing here") },
    );
    await editor(wrapper);
    expect(wrapper.text()).not.toContain("No metadata");
    expect(wrapper.text()).not.toContain("Nothing here");
  });

  it("uses the fixed height when autoHeight is false", async () => {
    hoisted.contentHeight = 999;
    const fixed = await editor(
      mountField({
        source: "meta",
        record: { id: 1, meta: 1 },
        autoHeight: false,
        height: 320,
      }),
    );
    expect(fixed.dataset.height).toBe("320px");

    const fallback = await editor(
      mountField({
        source: "meta",
        record: { id: 1, meta: 1 },
        autoHeight: false,
      }),
    );
    expect(fallback.dataset.height).toBe("200px");
  });

  it("grows to the content height up to maxHeight when autoHeight is on", async () => {
    hoisted.contentHeight = 300;
    const roomy = await editor(
      mountField({
        source: "meta",
        record: { id: 1, meta: 1 },
        maxHeight: 500,
      }),
    );
    await vi.waitFor(() => expect(roomy.dataset.height).toBe("300px"));

    const capped = await editor(
      mountField({
        source: "meta",
        record: { id: 1, meta: 1 },
        maxHeight: 250,
      }),
    );
    await vi.waitFor(() => expect(capped.dataset.height).toBe("250px"));
  });

  it("uses the dark editor theme when the theme resolves dark", async () => {
    const el = await editor(
      mountField({ source: "meta", record: { id: 1, meta: 1 } }, "dark"),
    );
    expect(el.dataset.theme).toBe("vs-dark");
  });

  it("uses the light editor theme otherwise", async () => {
    const el = await editor(
      mountField({ source: "meta", record: { id: 1, meta: 1 } }, "light"),
    );
    expect(el.dataset.theme).toBe("vs");
  });

  it("lets monacoOptions override the defaults", async () => {
    const el = await editor(
      mountField({
        source: "meta",
        record: { id: 1, meta: 1 },
        monacoOptions: { wordWrap: "off", tabSize: 4 },
      }),
    );
    expect(options(el)).toMatchObject({
      wordWrap: "off",
      tabSize: 4,
      readOnly: true,
    });
  });
});
