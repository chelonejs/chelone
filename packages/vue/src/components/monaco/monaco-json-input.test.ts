/**
 * `<MonacoJsonInput>` tests. jsdom cannot run Monaco, so `@guolao/vue-monaco-editor`
 * is a stub `VueMonacoEditor`: a textarea that emits `update:value`, and a
 * `mount` that hands back a fake editor and a fake `monaco` the tests drive.
 * Mounted under a real `<Admin>` with a `useForm` host.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  MONACO_DIAGNOSTICS_DELAY_MS,
  type Validator,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { defineComponent, h, nextTick, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../form/use-form";
import { useInput } from "../../form/use-input";
import MonacoJsonInput from "./monaco-json-input.vue";

vi.mock("monaco-editor", () => ({}));

interface Marker {
  severity: number;
  message: string;
}

interface DiagnosticsOptions {
  validate?: boolean;
  allowComments?: boolean;
  trailingCommas?: string;
  schemaValidation?: string;
  enableSchemaRequest?: boolean;
  schemas?: { uri: string; fileMatch?: string[]; schema?: unknown }[];
}

/** Everything the fake monaco keeps between tests. */
interface Hoisted {
  markers: Marker[];
  markerListeners: Set<(uris: { toString(): string }[]) => void>;
  blurListeners: Set<() => void>;
  contentListeners: Set<() => void>;
  diagnosticsOptions: DiagnosticsOptions;
  formatRun: Mock<() => void>;
  modelUri: string;
  noJson: boolean;
}

const hoisted = vi.hoisted(
  (): Hoisted => ({
    markers: [],
    markerListeners: new Set<(uris: { toString(): string }[]) => void>(),
    blurListeners: new Set<() => void>(),
    contentListeners: new Set<() => void>(),
    diagnosticsOptions: {},
    formatRun: vi.fn<() => void>(),
    modelUri: "",
    noJson: false,
  }),
);

// One object for every editor, as in Monaco.
const jsonDefaults = {
  get diagnosticsOptions(): DiagnosticsOptions {
    return hoisted.diagnosticsOptions;
  },
  setDiagnosticsOptions(options: DiagnosticsOptions) {
    hoisted.diagnosticsOptions = options;
  },
};

vi.mock("@guolao/vue-monaco-editor", async () => {
  const { defineComponent, h, onMounted } = await import("vue");
  return {
    loader: { config: vi.fn() },
    VueMonacoEditor: defineComponent({
      props: {
        value: String,
        path: String,
        language: String,
        theme: String,
        height: [Number, String],
        options: Object,
      },
      emits: ["update:value", "mount"],
      setup(props, { emit }) {
        // Matches the real editor: `mount` fires once, after the first render.
        onMounted(() => {
          hoisted.modelUri = props.path ?? "";
          const uri = { toString: () => props.path ?? "" };
          emit(
            "mount",
            {
              getModel: () => ({
                uri,
                onDidChangeContent: (listener: () => void) => {
                  hoisted.contentListeners.add(listener);
                  return {
                    dispose: () => hoisted.contentListeners.delete(listener),
                  };
                },
              }),
              getContentHeight: () => 0,
              onDidContentSizeChange: () => ({ dispose() {} }),
              onDidBlurEditorWidget: (listener: () => void) => {
                hoisted.blurListeners.add(listener);
                return {
                  dispose: () => hoisted.blurListeners.delete(listener),
                };
              },
              getAction: (id: string) =>
                id === "editor.action.formatDocument"
                  ? { run: hoisted.formatRun }
                  : null,
              layout: () => {},
            },
            {
              editor: {
                getModelMarkers: () => hoisted.markers,
                onDidChangeMarkers: (
                  listener: (uris: { toString(): string }[]) => void,
                ) => {
                  hoisted.markerListeners.add(listener);
                  return {
                    dispose: () => hoisted.markerListeners.delete(listener),
                  };
                },
              },
              languages: hoisted.noJson ? {} : { json: { jsonDefaults } },
            },
          );
        });
        return () =>
          h("textarea", {
            "data-testid": "editor",
            "data-path": props.path,
            "data-height": String(props.height),
            readonly: Boolean(props.options?.readOnly),
            value: props.value ?? "",
            onInput: (event: Event) => {
              for (const listener of hoisted.contentListeners) listener();
              const area = event.target;
              if (!(area instanceof HTMLTextAreaElement)) {
                throw new Error("Expected a textarea");
              }
              emit("update:value", area.value);
            },
          });
      },
    }),
  };
});

const i18nMessages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
};

interface FormValues {
  meta?: unknown;
  a?: unknown;
  b?: unknown;
}

const mounted: VueWrapper[] = [];

function setup(
  render: () => VNode | VNode[],
  {
    record,
    onData,
  }: { record: FormValues; onData?: (data: FormValues) => void },
) {
  let form: UseFormReturn<FormValues> | undefined;
  const FormHost = defineComponent({
    setup(_, { slots }) {
      form = useForm<FormValues>({
        record,
        onSubmit: async (data) => {
          onData?.(data);
          return undefined;
        },
      });
      return () => slots.default?.();
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
          { default: () => h(FormHost, null, { default: render }) },
        );
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  const submit = async () => {
    await form?.submit();
    await flushPromises();
  };
  return { wrapper, submit };
}

// The component is generic in its record, so its props are its first parameter.
function input(props: Parameters<typeof MonacoJsonInput>[0]) {
  return () => h(MonacoJsonInput, props);
}

async function editor(wrapper: VueWrapper) {
  await vi.waitFor(() =>
    expect(wrapper.find('[data-testid="editor"]').exists()).toBe(true),
  );
  await flushPromises();
  // The hook subscribes a tick after the stub mounts.
  await vi.waitFor(() => expect(hoisted.contentListeners.size).toBe(1));
  return wrapper.get('[data-testid="editor"]');
}

/** The stub's editor element, checked to be the textarea the stub renders. */
const areaOf = (area: { element: Node }) =>
  elementOf(area.element, HTMLTextAreaElement);

async function type(
  el: { setValue(value: string): Promise<void> },
  text: string,
) {
  await el.setValue(text);
  await flushPromises();
  // After a submit that waited on markers, form-core keeps the field on its
  // async validator, which runs on a zero-delay timer. Let it run, as the gap
  // between a keystroke and a click would.
  if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0);
  else await new Promise((resolve) => setTimeout(resolve, 0));
}

// Only the clock the hook reads is faked; the test utils flush on `setImmediate`.
function useClock() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
}

const errorText = (wrapper: VueWrapper) =>
  wrapper.find('[data-slot="field-error"]').text();

async function setMarkers(markers: Marker[]) {
  hoisted.markers = markers;
  for (const listener of hoisted.markerListeners) {
    listener([{ toString: () => hoisted.modelUri }]);
  }
  await flushPromises();
}

const options = () => hoisted.diagnosticsOptions;

// The first render of the lazy chunk pays for loading its module graph, which
// can outlast a short wait when the whole suite runs in parallel. Load it once
// up front so the tests only wait on rendering.
beforeAll(async () => {
  await import("./monaco-json-input-lazy.vue");
}, 30_000);

beforeEach(() => {
  hoisted.markers = [];
  hoisted.markerListeners.clear();
  hoisted.blurListeners.clear();
  hoisted.contentListeners.clear();
  hoisted.diagnosticsOptions = {};
  hoisted.formatRun.mockReset();
  hoisted.noJson = false;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  for (const wrapper of mounted.splice(0)) {
    try {
      wrapper.unmount();
    } catch {
      // Already unmounted by the test.
    }
  }
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("MonacoJsonInput", () => {
  it("renders an object value as pretty JSON text", async () => {
    const { wrapper } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1, b: [true] } },
    });
    expect(areaOf(await editor(wrapper)).value).toBe(
      JSON.stringify({ a: 1, b: [true] }, null, 2),
    );
  });

  it("keeps a string value a string and writes text back verbatim", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: '{"a":1}' },
      onData,
    });
    const el = await editor(wrapper);
    expect(areaOf(el).value).toBe('{"a":1}');
    await type(el, '{"a": 2, "b"');
    await submit();
    expect(onData).toHaveBeenCalledWith({ meta: '{"a": 2, "b"' });
  });

  it("writes the parsed object to the form when the text is valid JSON", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    await type(await editor(wrapper), '{"a":2,"c":[1]}');
    await submit();
    expect(onData).toHaveBeenCalledWith({ meta: { a: 2, c: [1] } });
  });

  it("keeps the last valid value while the text is invalid JSON", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    const el = await editor(wrapper);
    await type(el, '{"a":2}');
    await type(el, '{"a":2,');
    expect(areaOf(el).value).toBe('{"a":2,');
    await submit();
    expect(errorText(wrapper)).toContain("Invalid JSON");
    expect(onData).not.toHaveBeenCalled();
    await type(el, '{"a":3}');
    await submit();
    expect(onData).toHaveBeenCalledWith({ meta: { a: 3 } });
  });

  it("writes null for blank text in object shape", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    await type(await editor(wrapper), "  \n");
    await submit();
    expect(onData).toHaveBeenCalledWith({ meta: null });
  });

  it("mounts and registers nothing when monaco has no json defaults", async () => {
    hoisted.noJson = true;
    const { wrapper } = setup(
      input({ source: "meta", schema: { type: "object" } }),
      { record: { meta: {} } },
    );
    expect(await editor(wrapper)).toBeTruthy();
    expect(hoisted.diagnosticsOptions).toEqual({});
  });

  it("stores an object that looks like a DOM event as the object", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: {} },
      onData,
    });
    await type(await editor(wrapper), '{"target":{"value":1}}');
    await submit();
    expect(onData).toHaveBeenCalledWith({ meta: { target: { value: 1 } } });
  });

  it("registers its schema for its own model and removes it on unmount", async () => {
    const schema = { type: "object", required: ["a"] };
    const { wrapper } = setup(input({ source: "meta", schema }), {
      record: { meta: { a: 1 } },
    });
    const el = await editor(wrapper);
    const id = wrapper.get("label").attributes("for") ?? "";
    const modelUri = `inmemory://monaco-json-input/${id.replace(/[^\w-]/g, "-")}.json`;
    expect(hoisted.modelUri).toBe(modelUri);
    expect(el.attributes("data-path")).toBe(modelUri);
    expect(options().validate).toBe(true);
    expect(options().schemaValidation).toBe("error");
    expect(options().schemas).toEqual([
      expect.objectContaining({ fileMatch: [modelUri], schema }),
    ]);
    wrapper.unmount();
    expect(options().schemas).toEqual([]);
  });

  it("keeps other editors' schemas when it registers and unregisters", async () => {
    const other = { uri: "inmemory://other", fileMatch: ["other.json"] };
    hoisted.diagnosticsOptions = { schemas: [other] };
    const { wrapper } = setup(
      input({ source: "meta", schema: { type: "object" } }),
      { record: { meta: {} } },
    );
    await editor(wrapper);
    expect(options().schemas).toHaveLength(2);
    wrapper.unmount();
    expect(options().schemas).toEqual([other]);
  });

  it("registers a schemaUri as a remote schema entry", async () => {
    const { wrapper } = setup(
      input({
        source: "meta",
        schemaUri: "https://example.com/settings.schema.json",
      }),
      { record: { meta: {} } },
    );
    await editor(wrapper);
    expect(options().enableSchemaRequest).toBe(true);
    expect(options().schemas).toEqual([
      {
        uri: "https://example.com/settings.schema.json",
        fileMatch: [hoisted.modelUri],
      },
    ]);
  });

  it("registers no schema in string shape", async () => {
    const { wrapper } = setup(
      input({ source: "meta", schema: { type: "object" } }),
      { record: { meta: "{}" } },
    );
    await editor(wrapper);
    expect(options().schemas ?? []).toEqual([]);
  });

  it("tolerates comments when allowComments is set", async () => {
    const { wrapper } = setup(input({ source: "meta", allowComments: true }), {
      record: { meta: {} },
    });
    await editor(wrapper);
    expect(options().allowComments).toBe(true);
    expect(options().trailingCommas).toBe("ignore");
  });

  it("accepts comments and trailing commas when allowComments is set", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(
      input({ source: "meta", allowComments: true }),
      { record: { meta: { a: 1 } }, onData },
    );
    await type(
      await editor(wrapper),
      '{"a": 2, // note "x"\n "b": "// kept", /* c */}',
    );
    await submit();
    expect(onData).toHaveBeenCalledWith({ meta: { a: 2, b: "// kept" } });
  });

  it("puts Monaco's options back when the last editor unmounts", async () => {
    hoisted.diagnosticsOptions = { validate: true, allowComments: false };
    const { wrapper } = setup(
      input({
        source: "meta",
        allowComments: true,
        schemaUri: "https://x/s.json",
      }),
      { record: { meta: {} } },
    );
    await editor(wrapper);
    wrapper.unmount();
    expect(options().allowComments).toBe(false);
    expect(options().trailingCommas).toBeUndefined();
    expect(options().enableSchemaRequest).toBeUndefined();
    expect(options().schemas).toEqual([]);
  });

  it("blocks submit and shows the marker message when the model has an error marker", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    await editor(wrapper);
    await setMarkers([{ severity: 8, message: "Expected a number" }]);
    await submit();
    expect(errorText(wrapper)).toContain("Expected a number");
    expect(onData).not.toHaveBeenCalled();
  });

  it("blocks submit on text that is not JSON before Monaco reports a marker", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    await type(await editor(wrapper), '{"a":2,');
    expect(hoisted.markers).toEqual([]);
    await submit();
    expect(errorText(wrapper)).toContain("Invalid JSON");
    expect(onData).not.toHaveBeenCalled();
  });

  it("ignores warning markers", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    await editor(wrapper);
    await setMarkers([{ severity: 4, message: "Just a warning" }]);
    await submit();
    expect(wrapper.find('[data-slot="field-error"]').exists()).toBe(false);
    expect(onData).toHaveBeenCalledWith({ meta: { a: 1 } });
  });

  it("clears the error once the markers clear on a touched field", async () => {
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
    });
    await type(await editor(wrapper), '{"a":"x"}');
    await setMarkers([{ severity: 8, message: "Expected a number" }]);
    await submit();
    expect(errorText(wrapper)).toContain("Expected a number");
    await setMarkers([]);
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="field-error"]').exists()).toBe(false),
    );
  });

  it("runs the user validators after the marker check", async () => {
    const validate = vi.fn<Validator>(() => "From the user");
    const first = setup(input({ source: "meta", validate }), {
      record: { meta: { a: 1 } },
    });
    await editor(first.wrapper);
    await first.submit();
    expect(errorText(first.wrapper)).toContain("From the user");
    first.wrapper.unmount();

    validate.mockClear();
    const second = setup(input({ source: "meta", validate }), {
      record: { meta: { a: 1 } },
    });
    await editor(second.wrapper);
    await setMarkers([{ severity: 8, message: "Marker first" }]);
    await second.submit();
    expect(errorText(second.wrapper)).toContain("Marker first");
    expect(validate).not.toHaveBeenCalled();
  });

  it("runs the format action from the Format button", async () => {
    const { wrapper } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
    });
    await editor(wrapper);
    await wrapper.get('button[aria-label="Format"]').trigger("click");
    expect(hoisted.formatRun).toHaveBeenCalledTimes(1);
  });

  it("hides the Format button when showFormatButton is false", async () => {
    const { wrapper } = setup(
      input({ source: "meta", showFormatButton: false }),
      { record: { meta: { a: 1 } } },
    );
    await editor(wrapper);
    expect(wrapper.find('button[aria-label="Format"]').exists()).toBe(false);
  });

  it("is read-only when readOnly or disabled is set", async () => {
    const plain = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
    });
    expect(areaOf(await editor(plain.wrapper)).readOnly).toBe(false);
    plain.wrapper.unmount();

    const readOnly = setup(input({ source: "meta", readOnly: true }), {
      record: { meta: { a: 1 } },
    });
    expect(areaOf(await editor(readOnly.wrapper)).readOnly).toBe(true);
    readOnly.wrapper.unmount();

    const disabled = setup(input({ source: "meta", disabled: true }), {
      record: { meta: { a: 1 } },
    });
    expect(areaOf(await editor(disabled.wrapper)).readOnly).toBe(true);
  });

  it("lets monacoOptions override the editor defaults", async () => {
    const { wrapper } = setup(
      input({
        source: "meta",
        readOnly: true,
        monacoOptions: { readOnly: false },
      }),
      { record: { meta: { a: 1 } } },
    );
    expect(areaOf(await editor(wrapper)).readOnly).toBe(false);
  });

  it("sizes the editor from the height prop", async () => {
    const { wrapper } = setup(input({ source: "meta", height: 250 }), {
      record: { meta: {} },
    });
    expect((await editor(wrapper)).attributes("data-height")).toBe("250px");
  });

  it("marks the field touched when the editor loses focus", async () => {
    const touched: boolean[] = [];
    const Probe = defineComponent({
      setup() {
        const { touched: isTouched } = useInput({ source: "meta" });
        return () => {
          touched.push(isTouched.value);
          return null;
        };
      },
    });
    const { wrapper } = setup(
      () => [h(MonacoJsonInput, { source: "meta" }), h(Probe)],
      { record: { meta: { a: 1 } } },
    );
    await editor(wrapper);
    expect(touched.at(-1)).toBe(false);
    for (const listener of hoisted.blurListeners) listener();
    await nextTick();
    expect(touched.at(-1)).toBe(true);
  });

  it("labels the editor container and renders the helper text", async () => {
    const { wrapper } = setup(
      input({ source: "meta", helperText: "Raw settings" }),
      { record: { meta: { a: 1 } } },
    );
    const el = await editor(wrapper);
    const label = wrapper.get("label");
    expect(label.text()).toContain("Meta");
    const container = document.getElementById(label.attributes("for") ?? "");
    expect(container?.contains(el.element)).toBe(true);
    expect(wrapper.text()).toContain("Raw settings");
  });

  it("blocks Save on a schema error that arrives after the click", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    const el = await editor(wrapper);
    useClock();
    await type(el, '{"a":"x"}');
    const saving = submit();
    await vi.advanceTimersByTimeAsync(500);
    expect(onData).not.toHaveBeenCalled();
    await setMarkers([{ severity: 8, message: "Expected a number" }]);
    await saving;
    expect(onData).not.toHaveBeenCalled();
    expect(errorText(wrapper)).toContain("Expected a number");
  });

  it("blocks Save when a marker event inside the diagnostics delay reports no errors", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    const el = await editor(wrapper);
    useClock();
    await type(el, '{"a":"x"}');
    await vi.advanceTimersByTimeAsync(100);
    // Monaco computed this list from the text before the edit.
    await setMarkers([]);
    const saving = submit();
    await vi.advanceTimersByTimeAsync(MONACO_DIAGNOSTICS_DELAY_MS - 100);
    expect(onData).not.toHaveBeenCalled();
    await setMarkers([{ severity: 8, message: "Expected a number" }]);
    await saving;
    expect(onData).not.toHaveBeenCalled();
    expect(errorText(wrapper)).toContain("Expected a number");
  });

  it("saves a valid edit without waiting once its markers have arrived", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    const el = await editor(wrapper);
    useClock();
    await type(el, '{"a":2}');
    await vi.advanceTimersByTimeAsync(MONACO_DIAGNOSTICS_DELAY_MS);
    await setMarkers([]);
    const saving = submit();
    // form-core starts an async validator on a zero-delay timer.
    await vi.advanceTimersByTimeAsync(0);
    await saving;
    expect(onData).toHaveBeenCalledWith({ meta: { a: 2 } });
  });

  it("saves a valid edit when no marker event comes", async () => {
    const onData = vi.fn();
    const { wrapper, submit } = setup(input({ source: "meta" }), {
      record: { meta: { a: 1 } },
      onData,
    });
    const el = await editor(wrapper);
    useClock();
    await type(el, '{"a":2}');
    const saving = submit();
    await vi.advanceTimersByTimeAsync(749);
    expect(onData).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await saving;
    expect(onData).toHaveBeenCalledWith({ meta: { a: 2 } });
  });
});
