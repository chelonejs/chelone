/**
 * Tests: `<I18nKeyEditor>` — the panel listing the keys the current locale
 * missed, with an input per key and an export of the typed translations.
 *
 * Mounted under `<CheloneProvider>` with a real `createI18n` wired to a real
 * `createMissingKeyStore` through `onMissingKey`. Asserts DOM, roles, the
 * clipboard write and the notification queue.
 */

import {
  createI18n,
  createMissingKeyStore,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
  type MissingKeyStore,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useTranslate } from "../../../i18n-hooks";
import { I18nKeyEditor, type I18nKeyEditorProps } from "./i18n-key-editor";

function Label({ k, fallback }: { k: string; fallback?: string }) {
  const translate = useTranslate();
  return <p>{translate(k, fallback === undefined ? {} : { _: fallback })}</p>;
}

function setup({
  content,
  editor,
  store = createMissingKeyStore(),
}: {
  content?: React.ReactNode;
  editor?: Omit<I18nKeyEditorProps, "store">;
  store?: MissingKeyStore;
} = {}) {
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({ "posts.title": "Posts" }),
      fr: defineMessages({}),
    },
    onMissingKey: store.record,
  });
  const notifications = createNotificationStore();
  const view = render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
      notifications={notifications}
    >
      {content}
      <I18nKeyEditor store={store} {...editor} />
    </CheloneProvider>,
  );
  return { ...view, store, i18n, notifications };
}

/** The store notifies on a microtask: let it and React settle. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("<I18nKeyEditor>", () => {
  it("lists a key a component translated with a _ fallback that the catalog lacks", async () => {
    setup({ content: <Label k="posts.subtitle" fallback="Subtitle" /> });
    await settle();
    const entry = document.querySelector('[data-slot="i18n-key-editor-entry"]');
    expect(entry?.textContent).toContain("posts.subtitle");
    expect(screen.getByText("Missing keys (1)")).toBeTruthy();
  });

  it("does not list a key the catalog holds", async () => {
    setup({ content: <Label k="posts.title" fallback="Posts" /> });
    await settle();
    expect(
      document.querySelector('[data-slot="i18n-key-editor-entry"]'),
    ).toBeNull();
    expect(screen.getByText("No missing keys yet")).toBeTruthy();
  });

  it("does not list its own labels", async () => {
    setup();
    await settle();
    expect(
      document.querySelector('[data-slot="i18n-key-editor-entry"]'),
    ).toBeNull();
    expect(screen.getByText("Missing keys (0)")).toBeTruthy();
  });

  it("a key recorded while another component renders logs no React warning", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setup({ content: <Label k="posts.subtitle" fallback="Subtitle" /> });
    await settle();
    expect(screen.getByText("posts.subtitle")).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
  });

  it("switching the locale lists that locale's missing keys", async () => {
    const { i18n } = setup({
      content: <Label k="posts.subtitle" fallback="Subtitle" />,
    });
    await settle();
    expect(screen.getAllByText("posts.subtitle").length).toBeGreaterThan(0);
    act(() => i18n.setLocale("fr"));
    await settle();
    // Label re-rendered in fr and recorded the key there; the en list is gone
    const entries = document.querySelectorAll(
      '[data-slot="i18n-key-editor-entry"]',
    );
    expect(entries).toHaveLength(1);
    expect(screen.getByLabelText("posts.subtitle")).toBeTruthy();
  });

  it("switching to a locale with no misses shows the empty state", async () => {
    const store = createMissingKeyStore();
    store.record("only.en", "en", undefined);
    const { i18n } = setup({ store });
    await settle();
    expect(screen.getByLabelText("only.en")).toBeTruthy();
    act(() => i18n.setLocale("fr"));
    expect(screen.getByText("No missing keys yet")).toBeTruthy();
  });

  it("the input placeholder is the _ fallback", async () => {
    setup({ content: <Label k="posts.subtitle" fallback="Subtitle" /> });
    await settle();
    const input = screen.getByLabelText("posts.subtitle");
    expect(input.getAttribute("placeholder")).toBe("Subtitle");
  });

  it("has no placeholder for a key without a fallback", async () => {
    setup({ content: <Label k="posts.bare" /> });
    await settle();
    expect(
      screen.getByLabelText("posts.bare").getAttribute("placeholder"),
    ).toBeNull();
  });

  it("typing stores the translation in the input", async () => {
    const { store } = setup({
      content: <Label k="posts.subtitle" fallback="Subtitle" />,
    });
    await settle();
    const input = screen.getByLabelText("posts.subtitle");
    fireEvent.change(input, { target: { value: "Sous-titre" } });
    await settle();
    expect(store.getEntries("en")[0]?.translation).toBe("Sous-titre");
    const typed = screen.getByLabelText("posts.subtitle");
    expect(typed instanceof HTMLInputElement && typed.value).toBe("Sous-titre");
  });

  it("the input shows the typed text before the store notifies", async () => {
    setup({ content: <Label k="posts.subtitle" fallback="Subtitle" /> });
    await settle();
    const input = screen.getByLabelText("posts.subtitle");
    // The store notifies on a microtask; a controlled input that waits for it
    // is reset by React and loses the caret.
    fireEvent.change(input, { target: { value: "Sous" } });
    expect(input instanceof HTMLInputElement && input.value).toBe("Sous");
    await settle();
    expect(input instanceof HTMLInputElement && input.value).toBe("Sous");
  });

  it("export copies the typed translations as JSON and shows Copied", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    setup({ content: <Label k="posts.subtitle" fallback="Subtitle" /> });
    await settle();
    fireEvent.change(screen.getByLabelText("posts.subtitle"), {
      target: { value: "Sous-titre" },
    });
    await settle();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
    });
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ "posts.subtitle": "Sous-titre" }, null, 2),
    );
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
  });

  it("a rejected clipboard write notifies an error", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const { notifications } = setup();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
    });
    expect(notifications.getSnapshot()).toMatchObject([
      { message: "Could not copy the translations", type: "error" },
    ]);
    expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
  });

  it("defaultOpen false starts hidden and the toggle shows the list", async () => {
    setup({
      content: <Label k="posts.subtitle" fallback="Subtitle" />,
      editor: { defaultOpen: false },
    });
    await settle();
    const root = document.querySelector('[data-slot="i18n-key-editor"]');
    expect(root?.getAttribute("data-open")).toBe("false");
    expect(screen.queryByLabelText("posts.subtitle")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Show" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(root?.getAttribute("data-open")).toBe("true");
    expect(screen.getByLabelText("posts.subtitle")).toBeTruthy();
    const hide = screen.getByRole("button", { name: "Hide" });
    expect(hide.getAttribute("aria-expanded")).toBe("true");
  });

  it("showExport false hides the export button", () => {
    setup({ editor: { showExport: false } });
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });

  it("renders a key and a fallback that hold markup as text", async () => {
    const key = "<img src=x onerror=alert(1)>";
    const fallback = "<script>alert(1)</script>";
    setup({ content: <Label k={key} fallback={fallback} /> });
    await settle();
    expect(screen.getByText(key)).toBeTruthy();
    expect(screen.getByLabelText(key).getAttribute("placeholder")).toBe(
      fallback,
    );
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });
});
