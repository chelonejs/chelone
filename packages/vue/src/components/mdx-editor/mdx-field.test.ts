/**
 * `<MdxField>` tests. jsdom cannot run ProseMirror, so `@milkdown/crepe` is a
 * fake `Crepe` that records its config and calls and lets the test fire
 * `markdownUpdated` and `blur`, and `replaceAll` returns a callback that
 * carries the markdown it was given.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defineComponent,
  h,
  nextTick,
  type Ref,
  ref,
  type VNodeChild,
} from "vue";
import { provideCheloneContext } from "../../context";
import { provideRecordContext } from "../../record/record-context";
import CrepeEditor, {
  type CrepeEditorConfig,
} from "./internal/crepe-editor.vue";
import MdxField, { type MdxFieldProps } from "./mdx-field.vue";

// The real serializer normalizes: it ends the text with a newline.
const serialize = (markdown: string) =>
  markdown.endsWith("\n") ? markdown : `${markdown}\n`;

type Listener = (ctx: unknown, markdown: string) => void;

interface FakeCrepe {
  config: Record<string, unknown>;
  markdown: string;
  readonly: boolean[];
  actions: { markdown: string }[];
  destroyed: number;
  created: number;
  listeners: { markdownUpdated: Listener[]; blur: (() => void)[] };
  finishCreate(): void;
}

const hoisted = vi.hoisted(() => ({
  instances: [] as FakeCrepe[],
  deferCreate: false,
}));

vi.mock("@milkdown/crepe", () => {
  class FakeCrepeImpl implements FakeCrepe {
    static Feature = { CodeMirror: "code-mirror", Latex: "latex" };
    config: Record<string, unknown>;
    markdown: string;
    readonly: boolean[] = [];
    actions: { markdown: string }[] = [];
    destroyed = 0;
    created = 0;
    listeners: FakeCrepe["listeners"] = { markdownUpdated: [], blur: [] };
    finishCreate: () => void = () => {};
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
      this.created++;
      if (!hoisted.deferCreate) return Promise.resolve(this);
      return new Promise((resolve) => {
        this.finishCreate = () => resolve(this);
      });
    }
    setReadonly(value: boolean) {
      this.readonly.push(value);
      return this;
    }
    getMarkdown() {
      return this.markdown;
    }
    destroy() {
      this.destroyed++;
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
  hoisted.deferCreate = false;
});

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
});

const i18n = createI18n({
  locale: "en",
  messages: { en: defineMessages({ "myapp.empty": "*no notes*" }) },
});

function mountField(
  props: MdxFieldProps,
  record?: Ref<LooseRecord | undefined>,
  slots?: Record<string, () => VNodeChild>,
) {
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
        i18n,
      });
      if (record) provideRecordContext(record);
      return () => h(MdxField, props, slots);
    },
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

const only = () => {
  const [crepe] = hoisted.instances;
  if (!crepe || hoisted.instances.length !== 1) {
    throw new Error(`expected one editor, got ${hoisted.instances.length}`);
  }
  return crepe;
};

describe("MdxField", () => {
  it("creates a read-only editor with the markdown from the record source", async () => {
    mountField({ source: "body", record: { id: 1, body: "# Hello" } });
    await flushPromises();

    const crepe = only();
    expect(crepe.config.defaultValue).toBe("# Hello");
    expect(crepe.created).toBe(1);
    expect(crepe.readonly).toEqual([true]);
    // The editor holds "# Hello\n"; that is not a change to replace.
    expect(crepe.actions).toEqual([]);
  });

  it("turns a non-string value into text", async () => {
    mountField({ source: "n", record: { id: 1, n: 42 } });
    await flushPromises();
    expect(only().config.defaultValue).toBe("42");
  });

  it("switches the CodeMirror and Latex features off", async () => {
    const crepeConfig: CrepeEditorConfig = {
      features: { "code-mirror": true, table: false },
      featureConfigs: { placeholder: { text: "Write" } },
    };
    mountField({ source: "body", record: { id: 1, body: "x" }, crepeConfig });
    await flushPromises();

    const config = only().config;
    expect(config.features).toMatchObject({
      "code-mirror": false,
      latex: false,
      table: false,
    });
    expect(config.featureConfigs).toEqual({ placeholder: { text: "Write" } });
  });

  it("renders a translated empty string as the markdown when the value is missing", async () => {
    mountField({
      source: "body",
      record: { id: 1 },
      empty: "myapp.empty",
    });
    await flushPromises();
    expect(only().config.defaultValue).toBe("*no notes*");
  });

  it("renders the empty slot in place of the editor when the value is missing", async () => {
    const wrapper = mountField(
      { source: "body", record: { id: 1 } },
      undefined,
      { empty: () => h("p", { "data-testid": "empty" }, "Nothing here") },
    );
    await flushPromises();

    expect(wrapper.get('[data-testid="empty"]').text()).toBe("Nothing here");
    expect(hoisted.instances).toHaveLength(0);
  });

  it("replaces the content when the record value changes", async () => {
    const record = ref<LooseRecord | undefined>({ id: 1, body: "one" });
    mountField({ source: "body" }, record);
    await flushPromises();

    record.value = { id: 1, body: "two" };
    await nextTick();

    const crepe = only();
    expect(crepe.actions).toEqual([{ markdown: "two" }]);
    expect(crepe.created).toBe(1);
  });

  it("does not emit an edit when the content is replaced from outside", async () => {
    const wrapper = mount(CrepeEditor, {
      props: { markdown: "one", readonly: true },
    });
    mounted.push(wrapper);
    await flushPromises();

    await wrapper.setProps({ markdown: "two" });
    await flushPromises();
    expect(only().actions).toEqual([{ markdown: "two" }]);
    expect(wrapper.emitted("change")).toBeUndefined();

    // A user edit still gets through, and so does the blur.
    for (const l of only().listeners.markdownUpdated) l({}, "three\n");
    for (const l of only().listeners.blur) l();
    expect(wrapper.emitted("change")).toEqual([["three\n"]]);
    expect(wrapper.emitted("blur")).toHaveLength(1);
  });

  it("follows the readonly prop", async () => {
    const wrapper = mount(CrepeEditor, {
      props: { markdown: "one", readonly: true },
    });
    mounted.push(wrapper);
    await flushPromises();

    await wrapper.setProps({ readonly: false });
    expect(only().readonly).toEqual([true, false]);
  });

  it("destroys the editor on unmount, also when create resolves after unmount", async () => {
    const first = mountField({ source: "body", record: { id: 1, body: "x" } });
    await flushPromises();
    first.unmount();
    mounted.splice(0);
    await flushPromises();
    expect(only().destroyed).toBe(1);

    hoisted.instances.length = 0;
    hoisted.deferCreate = true;
    const second = mountField({ source: "body", record: { id: 1, body: "y" } });
    const late = only();
    second.unmount();
    mounted.splice(0);
    expect(late.destroyed).toBe(0);

    late.finishCreate();
    await flushPromises();
    expect(late.destroyed).toBe(1);
    expect(late.readonly).toEqual([]);
  });
});
