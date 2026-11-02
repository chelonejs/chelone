/**
 * `<MdxField>` tests. jsdom cannot run the real editor, so `MDXEditor` is a
 * stub that renders its `markdown` and keeps the real module's exports.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { headingsPlugin } from "@mdxeditor/editor";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { RecordContextProvider } from "../../record/record-context";
import { ThemeProvider } from "../admin/layout/theme-provider";
import { defaultFieldPlugins } from "./default-plugins";
import { MdxField } from "./mdx-field";

const hoisted = vi.hoisted(() => ({
  setMarkdown: vi.fn(),
  plugins: undefined as unknown,
  suppressHtmlProcessing: undefined as unknown,
  onError: undefined as
    | ((payload: { error: string; source: string }) => void)
    | undefined,
}));

vi.mock("@mdxeditor/editor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mdxeditor/editor")>();
  const { forwardRef, useImperativeHandle, useRef } = await import("react");
  const MDXEditor = forwardRef<
    unknown,
    {
      markdown: string;
      className?: string;
      readOnly?: boolean;
      plugins?: unknown;
      suppressHtmlProcessing?: boolean;
      onError?: (payload: { error: string; source: string }) => void;
    }
  >(function MDXEditor(props, ref) {
    // Uncontrolled like the real editor: only the first `markdown` is read.
    const current = useRef(props.markdown);
    hoisted.plugins = props.plugins;
    hoisted.suppressHtmlProcessing = props.suppressHtmlProcessing;
    hoisted.onError = props.onError;
    useImperativeHandle(ref, () => ({
      getMarkdown: () => current.current,
      setMarkdown: (value: string) => {
        current.current = value;
        hoisted.setMarkdown(value);
      },
    }));
    return (
      <div
        data-testid="editor"
        className={props.className}
        data-readonly={String(props.readOnly)}
      >
        {props.markdown}
      </div>
    );
  });
  return { ...actual, MDXEditor };
});

beforeEach(() => {
  hoisted.setMarkdown.mockClear();
  hoisted.plugins = undefined;
  hoisted.suppressHtmlProcessing = undefined;
  hoisted.onError = undefined;
});
afterEach(cleanup);

function wrap(record: unknown, theme: "light" | "dark" = "light") {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "*no notes*" }) },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <ThemeProvider defaultTheme={theme} storageKey={`t-${theme}`}>
        <RecordContextProvider value={record as Record<string, unknown>}>
          {children}
        </RecordContextProvider>
      </ThemeProvider>
    </CheloneProvider>
  );
}

describe("<MdxField />", () => {
  it("renders the markdown from the record source, read-only", () => {
    render(<MdxField source="body" />, {
      wrapper: wrap({ id: 1, body: "# Hello" }),
    });
    const editor = screen.getByTestId("editor");
    expect(editor.textContent).toBe("# Hello");
    expect(editor.dataset.readonly).toBe("true");
  });

  it("passes the field plugin preset by default and honors a plugins prop", () => {
    const { unmount } = render(<MdxField source="body" />, {
      wrapper: wrap({ id: 1, body: "x" }),
    });
    expect(hoisted.plugins).toEqual(
      expect.arrayContaining(defaultFieldPlugins),
    );
    unmount();

    const custom = [headingsPlugin()];
    render(<MdxField source="body" plugins={custom} />, {
      wrapper: wrap({ id: 1, body: "x" }),
    });
    expect(hoisted.plugins).toEqual(expect.arrayContaining(custom));
    expect(hoisted.plugins).not.toEqual(
      expect.arrayContaining(defaultFieldPlugins),
    );
  });

  it("renders a translated empty string as the markdown when the value is missing", () => {
    render(<MdxField source="body" empty="myapp.empty" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(screen.getByTestId("editor").textContent).toBe("*no notes*");
  });

  it("returns an empty element in place of the editor when the value is missing", () => {
    render(<MdxField source="body" empty={<em>Nothing yet</em>} />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(screen.getByText("Nothing yet")).toBeTruthy();
    expect(screen.queryByTestId("editor")).toBeNull();
  });

  it("calls setMarkdown when the record value changes", () => {
    const { rerender } = render(
      <MdxField source="body" record={{ id: 1, body: "one" }} />,
      { wrapper: wrap({}) },
    );
    expect(hoisted.setMarkdown).not.toHaveBeenCalled();

    rerender(<MdxField source="body" record={{ id: 1, body: "two" }} />);
    expect(hoisted.setMarkdown).toHaveBeenCalledTimes(1);
    expect(hoisted.setMarkdown).toHaveBeenCalledWith("two");

    rerender(<MdxField source="body" record={{ id: 1, body: "two" }} />);
    expect(hoisted.setMarkdown).toHaveBeenCalledTimes(1);
  });

  it("adds the mdxeditor-dark class when the theme resolves dark", () => {
    render(<MdxField source="body" />, {
      wrapper: wrap({ id: 1, body: "x" }, "dark"),
    });
    expect(
      screen.getByTestId("editor").classList.contains("mdxeditor-dark"),
    ).toBe(true);
  });

  it("omits the mdxeditor-dark class when the theme resolves light", () => {
    render(<MdxField source="body" />, {
      wrapper: wrap({ id: 1, body: "x" }, "light"),
    });
    expect(
      screen.getByTestId("editor").classList.contains("mdxeditor-dark"),
    ).toBe(false);
  });

  it("passes suppressHtmlProcessing to the editor by default", () => {
    render(<MdxField source="body" />, {
      wrapper: wrap({ id: 1, body: "<iframe></iframe>" }),
    });
    expect(hoisted.suppressHtmlProcessing).toBe(true);
  });

  it("lets a caller turn HTML processing back on", () => {
    render(<MdxField source="body" suppressHtmlProcessing={false} />, {
      wrapper: wrap({ id: 1, body: "<b>x</b>" }),
    });
    expect(hoisted.suppressHtmlProcessing).toBe(false);
  });

  it("shows the raw markdown as text when the editor reports a parse error", () => {
    const body = "<img src=x>";
    render(<MdxField source="body" />, { wrapper: wrap({ id: 1, body }) });
    expect(screen.queryByTestId("editor")).not.toBeNull();

    act(() => hoisted.onError?.({ error: "bad attribute", source: body }));

    const fallback = document.querySelector('[data-slot="mdx-field-fallback"]');
    expect(fallback?.tagName).toBe("PRE");
    expect(fallback?.textContent).toBe(body);
    expect(screen.queryByTestId("editor")).toBeNull();
  });

  it("calls a caller's onError as well as showing the fallback", () => {
    const onError = vi.fn();
    render(<MdxField source="body" onError={onError} />, {
      wrapper: wrap({ id: 1, body: "<img src=x>" }),
    });
    const payload = { error: "bad", source: "<img src=x>" };
    act(() => hoisted.onError?.(payload));
    expect(onError).toHaveBeenCalledWith(payload);
  });

  it("tries the editor again when the value changes after a parse error", () => {
    const { rerender } = render(
      <MdxField source="body" record={{ id: 1, body: "<img src=x>" }} />,
      { wrapper: wrap({}) },
    );
    act(() => hoisted.onError?.({ error: "bad", source: "<img src=x>" }));
    expect(screen.queryByTestId("editor")).toBeNull();

    rerender(<MdxField source="body" record={{ id: 1, body: "# Fixed" }} />);
    expect(screen.getByTestId("editor").textContent).toBe("# Fixed");
  });
});
