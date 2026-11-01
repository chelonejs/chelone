import {
  type AnyCheloneI18n,
  createI18n,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { CheloneProvider } from "./context";
import {
  TranslatableContextProvider,
  useTranslatable,
  useTranslatableContext,
} from "./translatable-hooks";

function makeWrapper(i18n?: AnyCheloneI18n) {
  const queryClient = new QueryClient();
  const dataProvider = fakeDataProvider({});
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        i18n={i18n}
      >
        {children}
      </CheloneProvider>
    );
  };
}

function appI18n(locale: string) {
  return createI18n({
    locale,
    messages: {
      en: defineMessages({}),
      fr: defineMessages({}),
      de: defineMessages({}),
    },
  });
}

describe("useTranslatable", () => {
  it("starts on defaultLocale when it is listed", () => {
    const { result } = renderHook(
      () =>
        useTranslatable({ locales: ["en", "fr", "de"], defaultLocale: "fr" }),
      { wrapper: makeWrapper(appI18n("en")) },
    );
    expect(result.current.selectedLocale).toBe("fr");
    expect(result.current.locales).toEqual(["en", "fr", "de"]);
  });

  it("starts on the app locale when it is listed and no defaultLocale is given", () => {
    const { result } = renderHook(
      () => useTranslatable({ locales: ["en", "fr", "de"] }),
      { wrapper: makeWrapper(appI18n("de")) },
    );
    expect(result.current.selectedLocale).toBe("de");
  });

  it("falls back to the app locale when defaultLocale is not listed", () => {
    const { result } = renderHook(
      () => useTranslatable({ locales: ["en", "fr"], defaultLocale: "de" }),
      { wrapper: makeWrapper(appI18n("fr")) },
    );
    expect(result.current.selectedLocale).toBe("fr");
  });

  it("starts on the first locale when the app locale is not listed", () => {
    const { result } = renderHook(
      () => useTranslatable({ locales: ["fr", "de"] }),
      { wrapper: makeWrapper(appI18n("en")) },
    );
    expect(result.current.selectedLocale).toBe("fr");
  });

  it("selectLocale changes selectedLocale and re-renders consumers", () => {
    const { result } = renderHook(
      () => useTranslatable({ locales: ["en", "fr"] }),
      { wrapper: makeWrapper(appI18n("en")) },
    );
    act(() => result.current.selectLocale("fr"));
    expect(result.current.selectedLocale).toBe("fr");
  });

  it("keeps the selection when locales is a new array with the same entries", () => {
    const { result, rerender } = renderHook(
      () => useTranslatable({ locales: ["en", "fr"] }),
      { wrapper: makeWrapper(appI18n("en")) },
    );
    act(() => result.current.selectLocale("fr"));
    rerender();
    expect(result.current.selectedLocale).toBe("fr");
  });

  it("starts over when the entries of locales change", () => {
    const { result, rerender } = renderHook(
      ({ locales }: { locales: string[] }) => useTranslatable({ locales }),
      {
        wrapper: makeWrapper(appI18n("en")),
        initialProps: { locales: ["en", "fr"] },
      },
    );
    act(() => result.current.selectLocale("fr"));
    rerender({ locales: ["fr", "de"] });
    expect(result.current.locales).toEqual(["fr", "de"]);
    expect(result.current.selectedLocale).toBe("fr");
    rerender({ locales: ["de", "fr"] });
    expect(result.current.selectedLocale).toBe("de");
  });

  it("works without an i18n instance", () => {
    const { result } = renderHook(
      () => useTranslatable({ locales: ["en", "fr"] }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.selectedLocale).toBe("en");
    act(() => result.current.selectLocale("fr"));
    expect(result.current.selectedLocale).toBe("fr");
  });

  it("getRecordForLocale picks the selected locale's values", () => {
    const { result } = renderHook(
      () => useTranslatable({ locales: ["en", "fr"] }),
      { wrapper: makeWrapper(appI18n("en")) },
    );
    const record = {
      id: 1,
      title: { en: "Hello", fr: "Bonjour" },
    };
    expect(result.current.getRecordForLocale(record)).toEqual({
      id: 1,
      title: "Hello",
    });
    act(() => result.current.selectLocale("fr"));
    expect(result.current.getRecordForLocale(record)).toEqual({
      id: 1,
      title: "Bonjour",
    });
  });

  it("shares the selection with consumers of the context", () => {
    function Group({ children }: { children: ReactNode }) {
      const translatable = useTranslatable({ locales: ["en", "fr"] });
      return (
        <TranslatableContextProvider value={translatable}>
          {children}
        </TranslatableContextProvider>
      );
    }
    function Tab() {
      const { selectedLocale, selectLocale } = useTranslatableContext();
      return (
        <button type="button" onClick={() => selectLocale("fr")}>
          {selectedLocale}
        </button>
      );
    }
    const Wrapper = makeWrapper(appI18n("en"));
    render(
      <Wrapper>
        <Group>
          <Tab />
        </Group>
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(screen.getByRole("button", { name: "fr" })).toBeDefined();
  });
});

describe("useTranslatableContext", () => {
  it("throws outside a provider", () => {
    expect(() => renderHook(() => useTranslatableContext())).toThrow(
      "useTranslatableContext: no <TranslatableContextProvider> found above this component",
    );
  });
});
