/**
 * `<MonacoJsonField>` tests. jsdom cannot run Monaco, so `@monaco-editor/react`
 * is a stub `Editor` that renders its `value` and props, and `monaco-editor`
 * is an empty module.
 */

import { createStore, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { ThemeProvider } from "../admin/layout/theme-provider";
import { MonacoJsonField } from "./monaco-json-field";

vi.mock("monaco-editor", () => ({}));

const hoisted = vi.hoisted(() => ({ contentHeight: 0 }));

vi.mock("@monaco-editor/react", () => ({
  loader: { config: vi.fn() },
  default: function Editor(props: {
    value?: string;
    language?: string;
    theme?: string;
    height?: number | string;
    options?: Record<string, unknown>;
    onMount?: (editor: unknown) => void;
  }) {
    // Matches the real editor: `onMount` fires once, after the first render.
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only
    useEffect(() => {
      props.onMount?.({
        getContentHeight: () => hoisted.contentHeight,
        onDidContentSizeChange: () => ({ dispose() {} }),
        layout: () => {},
      });
    }, []);
    return (
      <pre
        data-testid="editor"
        data-language={props.language}
        data-theme={props.theme}
        data-height={String(props.height)}
        data-options={JSON.stringify(props.options)}
      >
        {props.value}
      </pre>
    );
  },
}));

beforeEach(() => {
  hoisted.contentHeight = 0;
});
afterEach(cleanup);

function wrap(theme: "light" | "dark" = "light") {
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      store={createStore()}
    >
      <ThemeProvider defaultTheme={theme} storageKey={`t-${theme}`}>
        {children}
      </ThemeProvider>
    </CheloneProvider>
  );
}

const options = () =>
  JSON.parse(screen.getByTestId("editor").dataset.options ?? "{}");

describe("<MonacoJsonField />", () => {
  // First, because `React.lazy` keeps the chunk once any test has resolved it.
  it("shows the loading skeleton until the editor chunk resolves", async () => {
    render(<MonacoJsonField source="meta" record={{ meta: 1 }} />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole("status", { name: "Loading editor" })).toBeTruthy();
    await screen.findByTestId("editor");
    expect(screen.queryByRole("status", { name: "Loading editor" })).toBeNull();
  });

  it("renders an object value as pretty JSON, read-only", async () => {
    render(<MonacoJsonField source="meta" record={{ meta: { a: 1 } }} />, {
      wrapper: wrap(),
    });
    const editor = await screen.findByTestId("editor");
    expect(editor.textContent).toBe(JSON.stringify({ a: 1 }, null, 2));
    expect(editor.dataset.language).toBe("json");
    expect(options()).toMatchObject({
      readOnly: true,
      domReadOnly: true,
      automaticLayout: false,
      minimap: { enabled: false },
      lineNumbers: "on",
      wordWrap: "on",
      tabSize: 2,
    });
  });

  it("renders a string value as given", async () => {
    render(<MonacoJsonField source="raw" record={{ raw: '{"x":1}' }} />, {
      wrapper: wrap(),
    });
    expect((await screen.findByTestId("editor")).textContent).toBe('{"x":1}');
  });

  it("renders null for a missing value", async () => {
    render(<MonacoJsonField source="missing" record={{ id: 1 }} />, {
      wrapper: wrap(),
    });
    expect((await screen.findByTestId("editor")).textContent).toBe("null");
  });

  it("shows the empty node instead of the editor for a missing value", async () => {
    render(
      <MonacoJsonField
        source="missing"
        empty="No metadata"
        record={{ id: 1 }}
      />,
      { wrapper: wrap() },
    );
    expect(await screen.findByText("No metadata")).toBeTruthy();
    expect(screen.queryByTestId("editor")).toBeNull();
  });

  it("ignores empty when the value is present", async () => {
    render(
      <MonacoJsonField
        source="meta"
        empty="No metadata"
        record={{ meta: { a: 1 } }}
      />,
      { wrapper: wrap() },
    );
    await screen.findByTestId("editor");
    expect(screen.queryByText("No metadata")).toBeNull();
  });

  it("uses the fixed height when autoHeight is false", async () => {
    hoisted.contentHeight = 999;
    const { unmount } = render(
      <MonacoJsonField
        source="meta"
        record={{ meta: 1 }}
        autoHeight={false}
        height={320}
      />,
      { wrapper: wrap() },
    );
    expect((await screen.findByTestId("editor")).dataset.height).toBe("320");
    unmount();

    render(
      <MonacoJsonField source="meta" record={{ meta: 1 }} autoHeight={false} />,
      { wrapper: wrap() },
    );
    expect((await screen.findByTestId("editor")).dataset.height).toBe("200");
  });

  it("grows to the content height up to maxHeight when autoHeight is on", async () => {
    hoisted.contentHeight = 300;
    const { unmount } = render(
      <MonacoJsonField source="meta" record={{ meta: 1 }} maxHeight={500} />,
      { wrapper: wrap() },
    );
    const editor = await screen.findByTestId("editor");
    await vi.waitFor(() => expect(editor.dataset.height).toBe("300"));
    unmount();

    render(
      <MonacoJsonField source="meta" record={{ meta: 1 }} maxHeight={250} />,
      { wrapper: wrap() },
    );
    const capped = await screen.findByTestId("editor");
    await vi.waitFor(() => expect(capped.dataset.height).toBe("250"));
  });

  it("uses the dark editor theme when the theme resolves dark", async () => {
    render(<MonacoJsonField source="meta" record={{ meta: 1 }} />, {
      wrapper: wrap("dark"),
    });
    expect((await screen.findByTestId("editor")).dataset.theme).toBe("vs-dark");
  });

  it("uses the light editor theme otherwise", async () => {
    render(<MonacoJsonField source="meta" record={{ meta: 1 }} />, {
      wrapper: wrap("light"),
    });
    expect((await screen.findByTestId("editor")).dataset.theme).toBe("vs");
  });

  it("lets monacoOptions override the defaults", async () => {
    render(
      <MonacoJsonField
        source="meta"
        record={{ meta: 1 }}
        monacoOptions={{ wordWrap: "off", tabSize: 4 }}
      />,
      { wrapper: wrap() },
    );
    await screen.findByTestId("editor");
    expect(options()).toMatchObject({
      wordWrap: "off",
      tabSize: 4,
      readOnly: true,
    });
  });
});
