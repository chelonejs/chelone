/**
 * `<MdxField>` tests. jsdom cannot run the real editor, so `MDXEditor` is a
 * stub that renders its `markdown` and keeps the real module's exports.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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
    }
  >(function MDXEditor(props, ref) {
    // Uncontrolled like the real editor: only the first `markdown` is read.
    const current = useRef(props.markdown);
    hoisted.plugins = props.plugins;
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
    expect(hoisted.plugins).toBe(defaultFieldPlugins);
    unmount();

    const custom: never[] = [];
    render(<MdxField source="body" plugins={custom} />, {
      wrapper: wrap({ id: 1, body: "x" }),
    });
    expect(hoisted.plugins).toBe(custom);
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
});
