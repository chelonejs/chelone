/**
 * `<MonacoJsonInput>` tests. jsdom cannot run Monaco, so `@monaco-editor/react`
 * is a stub `Editor`: a textarea that calls `onChange`, and an `onMount` that
 * hands back a fake editor and a fake `monaco` the tests drive.
 */

import {
  createI18n,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { CheloneFormProvider } from "../../form-context";
import { useForm } from "../../form-hooks";
import { MonacoJsonInput } from "./monaco-json-input";

vi.mock("monaco-editor", () => ({}));

interface Marker {
  severity: number;
  message: string;
}

interface DiagnosticsOptions {
  validate?: boolean;
  allowComments?: boolean;
  trailingCommas?: string;
  enableSchemaRequest?: boolean;
  schemas?: { uri: string; fileMatch?: string[]; schema?: unknown }[];
}

const hoisted = vi.hoisted(() => ({
  markers: [] as { severity: number; message: string }[],
  markerListeners: new Set<(uris: { toString(): string }[]) => void>(),
  blurListeners: new Set<() => void>(),
  diagnosticsOptions: {} as Record<string, unknown>,
  formatRun: vi.fn(),
  modelUri: "",
  editorOptions: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@monaco-editor/react", () => ({
  loader: { config: vi.fn() },
  default: function Editor(props: {
    value?: string;
    path?: string;
    height?: number | string;
    options?: Record<string, unknown>;
    onChange?: (value: string | undefined) => void;
    onMount?: (editor: unknown, monaco: unknown) => void;
  }) {
    hoisted.editorOptions = props.options;
    // Matches the real editor: `onMount` fires once, after the first render.
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only
    useEffect(() => {
      hoisted.modelUri = props.path ?? "";
      const uri = { toString: () => props.path ?? "" };
      props.onMount?.(
        {
          getModel: () => ({ uri }),
          getContentHeight: () => 0,
          onDidContentSizeChange: () => ({ dispose() {} }),
          onDidBlurEditorWidget: (listener: () => void) => {
            hoisted.blurListeners.add(listener);
            return { dispose: () => hoisted.blurListeners.delete(listener) };
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
          languages: {
            json: {
              jsonDefaults: {
                get diagnosticsOptions() {
                  return hoisted.diagnosticsOptions;
                },
                setDiagnosticsOptions: (options: Record<string, unknown>) => {
                  hoisted.diagnosticsOptions = options;
                },
              },
            },
          },
        },
      );
    }, []);
    return (
      <textarea
        data-testid="editor"
        data-path={props.path}
        data-height={String(props.height)}
        readOnly={Boolean(props.options?.readOnly)}
        value={props.value ?? ""}
        onChange={(event) => props.onChange?.(event.target.value)}
      />
    );
  },
}));

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
};

function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    onData,
  }: {
    defaultValues?: TFormData;
    onData?: (data: TFormData) => void;
  } = {},
) {
  const i18n = createI18n({ locale: "en", messages });
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data): Promise<FieldErrors | undefined> => {
        onData?.(data);
        return undefined;
      },
    });
    submitRef.current = form.submit;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <FormHost>{ui}</FormHost>
    </CheloneProvider>,
  );
  return { submitRef };
}

async function editor() {
  return (await screen.findByTestId("editor")) as HTMLTextAreaElement;
}

function setMarkers(markers: Marker[]) {
  hoisted.markers = markers;
  act(() => {
    for (const listener of hoisted.markerListeners) {
      listener([{ toString: () => hoisted.modelUri }]);
    }
  });
}

function type(el: HTMLTextAreaElement, value: string) {
  fireEvent.change(el, { target: { value } });
}

async function submit(submitRef: { current: (() => Promise<void>) | null }) {
  await act(async () => {
    await submitRef.current?.();
  });
}

beforeEach(() => {
  hoisted.markers = [];
  hoisted.markerListeners.clear();
  hoisted.blurListeners.clear();
  hoisted.diagnosticsOptions = {};
  hoisted.formatRun.mockReset();
  hoisted.editorOptions = undefined;
});
afterEach(cleanup);

describe("<MonacoJsonInput />", () => {
  it("renders an object value as pretty JSON text", async () => {
    setup(<MonacoJsonInput source="meta" />, {
      defaultValues: { meta: { a: 1, b: [true] } },
    });
    expect((await editor()).value).toBe(
      JSON.stringify({ a: 1, b: [true] }, null, 2),
    );
  });

  it("keeps a string value a string and writes text back verbatim", async () => {
    const onData = vi.fn();
    const { submitRef } = setup(<MonacoJsonInput source="meta" />, {
      defaultValues: { meta: '{"a":1}' },
      onData,
    });
    const el = await editor();
    expect(el.value).toBe('{"a":1}');
    type(el, '{"a": 2, "b"');
    await submit(submitRef);
    expect(onData).toHaveBeenCalledWith({ meta: '{"a": 2, "b"' });
  });

  it("writes the parsed object to the form when the text is valid JSON", async () => {
    const onData = vi.fn();
    const { submitRef } = setup(<MonacoJsonInput source="meta" />, {
      defaultValues: { meta: { a: 1 } },
      onData,
    });
    type(await editor(), '{"a":2,"c":[1]}');
    await submit(submitRef);
    expect(onData).toHaveBeenCalledWith({ meta: { a: 2, c: [1] } });
  });

  it("keeps the last valid value while the text is invalid JSON", async () => {
    const onData = vi.fn();
    const { submitRef } = setup(<MonacoJsonInput source="meta" />, {
      defaultValues: { meta: { a: 1 } },
      onData,
    });
    const el = await editor();
    type(el, '{"a":2}');
    type(el, '{"a":2,');
    expect(el.value).toBe('{"a":2,');
    await submit(submitRef);
    expect(onData).toHaveBeenCalledWith({ meta: { a: 2 } });
  });

  it("writes null for blank text in object shape", async () => {
    const onData = vi.fn();
    const { submitRef } = setup(<MonacoJsonInput source="meta" />, {
      defaultValues: { meta: { a: 1 } },
      onData,
    });
    type(await editor(), "  \n");
    await submit(submitRef);
    expect(onData).toHaveBeenCalledWith({ meta: null });
  });

  it("registers its schema for its own model and removes it on unmount", async () => {
    const schema = { type: "object", required: ["a"] };
    setup(<MonacoJsonInput source="meta" id="meta-input" schema={schema} />, {
      defaultValues: { meta: { a: 1 } },
    });
    await editor();
    const options = hoisted.diagnosticsOptions as DiagnosticsOptions;
    const modelUri = "inmemory://monaco-json-input/meta-input.json";
    expect(hoisted.modelUri).toBe(modelUri);
    expect(options.validate).toBe(true);
    expect(options.schemas).toEqual([
      expect.objectContaining({ fileMatch: [modelUri], schema }),
    ]);
    cleanup();
    expect((hoisted.diagnosticsOptions as DiagnosticsOptions).schemas).toEqual(
      [],
    );
  });

  it("keeps other editors' schemas when it registers and unregisters", async () => {
    const other = { uri: "inmemory://other", fileMatch: ["other.json"] };
    hoisted.diagnosticsOptions = { schemas: [other] };
    setup(
      <MonacoJsonInput source="meta" id="m" schema={{ type: "object" }} />,
      {
        defaultValues: { meta: {} },
      },
    );
    await editor();
    expect(
      (hoisted.diagnosticsOptions as DiagnosticsOptions).schemas,
    ).toHaveLength(2);
    cleanup();
    expect((hoisted.diagnosticsOptions as DiagnosticsOptions).schemas).toEqual([
      other,
    ]);
  });

  it("registers a schemaUri as a remote schema entry", async () => {
    setup(
      <MonacoJsonInput
        source="meta"
        id="m"
        schemaUri="https://example.com/settings.schema.json"
      />,
      { defaultValues: { meta: {} } },
    );
    await editor();
    const options = hoisted.diagnosticsOptions as DiagnosticsOptions;
    expect(options.enableSchemaRequest).toBe(true);
    expect(options.schemas).toEqual([
      {
        uri: "https://example.com/settings.schema.json",
        fileMatch: ["inmemory://monaco-json-input/m.json"],
      },
    ]);
  });

  it("registers no schema in string shape", async () => {
    setup(
      <MonacoJsonInput source="meta" id="m" schema={{ type: "object" }} />,
      {
        defaultValues: { meta: "{}" },
      },
    );
    await editor();
    expect(
      (hoisted.diagnosticsOptions as DiagnosticsOptions).schemas ?? [],
    ).toEqual([]);
  });

  it("ignores trailing commas when allowComments is set", async () => {
    setup(
      <MonacoJsonInput
        source="meta"
        id="m"
        allowComments
        schema={{ type: "object" }}
      />,
      { defaultValues: { meta: {} } },
    );
    await editor();
    const options = hoisted.diagnosticsOptions as DiagnosticsOptions;
    expect(options.allowComments).toBe(true);
    expect(options.trailingCommas).toBe("ignore");
  });

  it("blocks submit and shows the marker message when the model has an error marker", async () => {
    const onData = vi.fn();
    const { submitRef } = setup(<MonacoJsonInput source="meta" />, {
      defaultValues: { meta: { a: 1 } },
      onData,
    });
    await editor();
    setMarkers([{ severity: 8, message: "Expected a number" }]);
    await submit(submitRef);
    expect(screen.getByRole("alert").textContent).toContain(
      "Expected a number",
    );
    expect(onData).not.toHaveBeenCalled();
  });

  it("ignores warning markers", async () => {
    const onData = vi.fn();
    const { submitRef } = setup(<MonacoJsonInput source="meta" />, {
      defaultValues: { meta: { a: 1 } },
      onData,
    });
    await editor();
    setMarkers([{ severity: 4, message: "Just a warning" }]);
    await submit(submitRef);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onData).toHaveBeenCalledWith({ meta: { a: 1 } });
  });

  it("clears the error once the markers clear on a dirty field", async () => {
    const { submitRef } = setup(<MonacoJsonInput source="meta" />, {
      defaultValues: { meta: { a: 1 } },
    });
    type(await editor(), '{"a":"x"}');
    setMarkers([{ severity: 8, message: "Expected a number" }]);
    await submit(submitRef);
    expect(screen.getByRole("alert").textContent).toContain(
      "Expected a number",
    );
    setMarkers([]);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("runs the user validators after the marker check", async () => {
    const validate = vi.fn(() => "From the user");
    const first = setup(<MonacoJsonInput source="meta" validate={validate} />, {
      defaultValues: { meta: { a: 1 } },
    });
    await editor();
    await submit(first.submitRef);
    expect(screen.getByRole("alert").textContent).toContain("From the user");
    cleanup();

    validate.mockClear();
    const second = setup(
      <MonacoJsonInput source="meta" validate={validate} />,
      { defaultValues: { meta: { a: 1 } } },
    );
    await editor();
    setMarkers([{ severity: 8, message: "Marker first" }]);
    await submit(second.submitRef);
    expect(screen.getByRole("alert").textContent).toContain("Marker first");
    expect(validate).not.toHaveBeenCalled();
  });
});
