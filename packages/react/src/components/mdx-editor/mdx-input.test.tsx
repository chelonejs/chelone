/**
 * `<MdxInput>` tests. jsdom cannot run the real editor, so `MDXEditor` is a
 * stub that reads `markdown` once like the real one, keeps its own content, and
 * has buttons that report a change and a blur.
 */

import {
  createI18n,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { CheloneFormProvider } from "../../form-context";
import { useForm } from "../../form-hooks";
import { ThemeProvider } from "../admin/layout/theme-provider";
import { defaultInputPlugins } from "./default-plugins";
import { MdxInput } from "./mdx-input";

const hoisted = vi.hoisted(() => ({
  setMarkdown: vi.fn(),
  plugins: undefined as unknown,
  suppressHtmlProcessing: undefined as unknown,
  markdownProps: [] as string[],
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
      onChange?: (markdown: string, initialMarkdownNormalize: boolean) => void;
      onBlur?: () => void;
    }
  >(function MDXEditor(props, ref) {
    // Uncontrolled like the real editor: only the first `markdown` is read.
    const current = useRef(props.markdown);
    hoisted.plugins = props.plugins;
    hoisted.suppressHtmlProcessing = props.suppressHtmlProcessing;
    hoisted.markdownProps.push(props.markdown);
    useImperativeHandle(ref, () => ({
      getMarkdown: () => current.current,
      setMarkdown: (value: string) => {
        current.current = value;
        hoisted.setMarkdown(value);
      },
    }));
    const edit = (value: string, initialMarkdownNormalize = false) => {
      current.current = value;
      props.onChange?.(value, initialMarkdownNormalize);
    };
    return (
      <div
        data-testid="editor"
        className={props.className}
        data-readonly={String(props.readOnly)}
      >
        <span data-testid="content">{current.current}</span>
        <button type="button" onClick={() => edit("# Typed")}>
          type
        </button>
        <button type="button" onClick={() => edit("")}>
          clear
        </button>
        <button type="button" onClick={() => edit("- item", true)}>
          normalize
        </button>
        <button type="button" onClick={() => props.onBlur?.()}>
          blur
        </button>
      </div>
    );
  });
  return { ...actual, MDXEditor };
});

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
};

function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    onData,
    theme = "light",
  }: {
    defaultValues?: TFormData;
    onData?: (data: TFormData) => void;
    theme?: "light" | "dark";
  } = {},
) {
  const i18n = createI18n({ locale: "en", messages });
  const handle: {
    submit: () => Promise<void>;
    form: ReturnType<typeof useForm<TFormData>>["form"];
  } = { submit: async () => {}, form: undefined as never };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data): Promise<FieldErrors | undefined> => {
        onData?.(data);
        return undefined;
      },
    });
    handle.submit = form.submit;
    handle.form = form.form;
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
      <ThemeProvider defaultTheme={theme} storageKey={`t-${theme}`}>
        <FormHost>{ui}</FormHost>
      </ThemeProvider>
    </CheloneProvider>,
  );
  return handle;
}

beforeEach(() => {
  hoisted.setMarkdown.mockClear();
  hoisted.plugins = undefined;
  hoisted.suppressHtmlProcessing = undefined;
  hoisted.markdownProps = [];
});
afterEach(cleanup);

describe("<MdxInput />", () => {
  it("renders the initial markdown value", () => {
    setup(<MdxInput source="body" />, {
      defaultValues: { body: "# Hello" },
    });
    expect(screen.getByTestId("content").textContent).toBe("# Hello");
  });

  it("passes the input plugin preset with the toolbar", () => {
    setup(<MdxInput source="body" />, { defaultValues: { body: "x" } });
    expect(hoisted.plugins).toBe(defaultInputPlugins);
  });

  it("renders a custom label and helper text", () => {
    setup(<MdxInput source="body" label="Notes" helperText="Markdown only" />, {
      defaultValues: { body: "x" },
    });
    const label = screen.getByText("Notes").closest("label");
    expect(label).toBeTruthy();
    expect(screen.getByText("Markdown only")).toBeTruthy();
    const wrapper = screen.getByTestId("editor").parentElement;
    expect(wrapper?.id).toBeTruthy();
    expect(label?.htmlFor).toBe(wrapper?.id);
  });

  it("is read-only when disabled", () => {
    setup(<MdxInput source="body" disabled />, {
      defaultValues: { body: "x" },
    });
    expect(screen.getByTestId("editor").dataset.readonly).toBe("true");
  });

  it("is read-only when readOnly is set", () => {
    setup(<MdxInput source="body" readOnly />, {
      defaultValues: { body: "x" },
    });
    expect(screen.getByTestId("editor").dataset.readonly).toBe("true");
  });

  it("is editable by default", () => {
    setup(<MdxInput source="body" />, { defaultValues: { body: "x" } });
    expect(screen.getByTestId("editor").dataset.readonly).toBe("false");
  });

  it("shows the required error on submit when the value is empty", async () => {
    const handle = setup(<MdxInput source="body" validate={required()} />, {
      defaultValues: { body: "" },
    });
    await act(async () => {
      await handle.submit();
    });
    expect(await screen.findByText("Required")).toBeTruthy();
  });

  it("writes the editor markdown to the form on change", async () => {
    const onData = vi.fn();
    const handle = setup<{ body: string }>(<MdxInput source="body" />, {
      defaultValues: { body: "" },
      onData,
    });
    fireEvent.click(screen.getByText("type"));
    await act(async () => {
      await handle.submit();
    });
    expect(onData).toHaveBeenCalledWith({ body: "# Typed" });
  });

  it("keeps an empty string when the editor is cleared", async () => {
    const onData = vi.fn();
    const handle = setup<{ body: string }>(<MdxInput source="body" />, {
      defaultValues: { body: "# Old" },
      onData,
    });
    fireEvent.click(screen.getByText("clear"));
    await act(async () => {
      await handle.submit();
    });
    expect(onData).toHaveBeenCalledWith({ body: "" });
  });

  it("leaves the form untouched when the editor normalizes the initial markdown", async () => {
    const onData = vi.fn();
    const handle = setup<{ body: string }>(<MdxInput source="body" />, {
      defaultValues: { body: "* item" },
      onData,
    });
    fireEvent.click(screen.getByText("normalize"));
    expect(handle.form.getFieldMeta("body")?.isDirty).toBeFalsy();
    await act(async () => {
      await handle.submit();
    });
    expect(onData).toHaveBeenCalledWith({ body: "* item" });
  });

  it("calls setMarkdown when the form value changes from outside", () => {
    const handle = setup<{ body: string | null }>(<MdxInput source="body" />, {
      defaultValues: { body: "one" },
    });
    expect(hoisted.setMarkdown).not.toHaveBeenCalled();

    act(() => handle.form.setFieldValue("body", "two"));
    expect(hoisted.setMarkdown).toHaveBeenCalledTimes(1);
    expect(hoisted.setMarkdown).toHaveBeenLastCalledWith("two");

    act(() => handle.form.setFieldValue("body", null));
    expect(hoisted.setMarkdown).toHaveBeenLastCalledWith("");
  });

  it("does not call setMarkdown for a change the editor itself made", () => {
    setup(<MdxInput source="body" />, { defaultValues: { body: "one" } });
    fireEvent.click(screen.getByText("type"));
    expect(hoisted.setMarkdown).not.toHaveBeenCalled();
  });

  it("does not reset the editor when the parent re-renders", () => {
    function Parent() {
      const [count, setCount] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setCount(count + 1)}>
            rerender {count}
          </button>
          <MdxInput source="body" helperText={`render ${count}`} />
        </>
      );
    }
    setup(<Parent />, { defaultValues: { body: "# Initial" } });

    fireEvent.click(screen.getByText("type"));
    fireEvent.click(screen.getByText("rerender 0"));

    expect(screen.getByText("render 1")).toBeTruthy();
    expect(new Set(hoisted.markdownProps)).toEqual(new Set(["# Initial"]));
    expect(hoisted.setMarkdown).not.toHaveBeenCalled();
  });

  it("marks the field touched on blur", () => {
    const handle = setup(<MdxInput source="body" />, {
      defaultValues: { body: "x" },
    });
    expect(handle.form.getFieldMeta("body")?.isTouched).toBeFalsy();
    fireEvent.click(screen.getByText("blur"));
    expect(handle.form.getFieldMeta("body")?.isTouched).toBe(true);
  });

  it("passes suppressHtmlProcessing to the editor by default", () => {
    setup(<MdxInput source="body" />, {
      defaultValues: { body: "<iframe></iframe>" },
    });
    expect(hoisted.suppressHtmlProcessing).toBe(true);
  });

  it("lets mdxProps turn HTML processing back on", () => {
    setup(
      <MdxInput source="body" mdxProps={{ suppressHtmlProcessing: false }} />,
      { defaultValues: { body: "<b>x</b>" } },
    );
    expect(hoisted.suppressHtmlProcessing).toBe(false);
  });

  it("lets mdxProps replace the plugins", () => {
    const custom: never[] = [];
    setup(<MdxInput source="body" mdxProps={{ plugins: custom }} />, {
      defaultValues: { body: "x" },
    });
    expect(hoisted.plugins).toBe(custom);
  });

  it("adds the mdxeditor-dark class when the theme resolves dark", () => {
    setup(<MdxInput source="body" />, {
      defaultValues: { body: "x" },
      theme: "dark",
    });
    expect(
      screen.getByTestId("editor").classList.contains("mdxeditor-dark"),
    ).toBe(true);
  });

  it("omits the mdxeditor-dark class when the theme resolves light", () => {
    setup(<MdxInput source="body" />, { defaultValues: { body: "x" } });
    expect(
      screen.getByTestId("editor").classList.contains("mdxeditor-dark"),
    ).toBe(false);
  });
});
