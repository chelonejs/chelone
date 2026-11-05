import {
  createI18n,
  createStore,
  type DataProvider,
  defaultMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useDataProvider,
  useIsMobile,
  useLoading,
  useLocaleState,
  useLocales,
  useRefresh,
} from "./compat-hooks";
import { CheloneProvider } from "./context";

afterEach(() => {
  cleanup();
});

/** A one-resource fake provider with a spy-able getList for loading/refresh. */
function makeProvider() {
  return fakeDataProvider({ posts: [{ id: 1, title: "hi" }] });
}

interface WrapperParts {
  wrapper: (props: { children: ReactNode }) => ReactNode;
  queryClient: QueryClient;
  dataProvider: DataProvider;
}

function makeWrapper(): WrapperParts {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = makeProvider();
  const store = createStore();
  const i18n = createI18n({
    locale: "en",
    // fr/de registered so setLocale in the locale-state tests is legal.
    messages: {
      en: defaultMessages,
      fr: defaultMessages,
      de: defaultMessages,
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
  return { wrapper, queryClient, dataProvider };
}

describe("useDataProvider", () => {
  it("returns the raw dataProvider from context", () => {
    const { wrapper, dataProvider } = makeWrapper();
    const { result } = renderHook(() => useDataProvider(), { wrapper });
    expect(result.current).toBe(dataProvider);
  });

  it("returns a callable provider whose methods resolve", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDataProvider(), { wrapper });
    const res = await result.current.getOne("posts", { id: 1 });
    expect(res.data).toEqual({ id: 1, title: "hi" });
  });

  it("throws without a provider (no CheloneProvider above)", () => {
    // renderHook with no wrapper: useCheloneContext throws.
    expect(() => renderHook(() => useDataProvider())).toThrow(
      /CheloneProvider/,
    );
  });
});

describe("useRefresh", () => {
  it("returns a stable callback across renders", () => {
    const { wrapper } = makeWrapper();
    const { result, rerender } = renderHook(() => useRefresh(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("invalidates all queries when called", () => {
    const { wrapper, queryClient } = makeWrapper();
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRefresh(), { wrapper });
    act(() => {
      result.current();
    });
    expect(spy).toHaveBeenCalledTimes(1);
    // Called with no filter → invalidates the entire cache.
    const arg = spy.mock.calls[0]?.[0];
    expect(arg).toBeUndefined();
  });
});

describe("useLoading", () => {
  it("is false when the query cache is idle", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useLoading(), { wrapper });
    expect(result.current).toBe(false);
  });

  it("flips true while a query is fetching, then false when it settles", async () => {
    const { wrapper, queryClient } = makeWrapper();
    let resolveFetch: (v: unknown) => void = () => {};
    const gated = new Promise((r) => {
      resolveFetch = r;
    });
    const { result } = renderHook(() => useLoading(), { wrapper });
    expect(result.current).toBe(false);
    act(() => {
      // A pending query pushes the global isFetching count above zero.
      void queryClient.fetchQuery({
        queryKey: ["gated"],
        queryFn: () => gated,
      });
    });
    await waitFor(() => expect(result.current).toBe(true));
    await act(async () => {
      resolveFetch("done");
      await gated;
    });
    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe("useLocales", () => {
  it("names each locale in its own language", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useLocales(), { wrapper });
    expect(result.current).toEqual([
      { locale: "en", name: "English" },
      { locale: "fr", name: "français" },
      { locale: "de", name: "Deutsch" },
    ]);
  });

  it("keeps the code as the name for a tag Intl rejects", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: defaultMessages, "not a tag!": defaultMessages },
    });
    const { result } = renderHook(() => useLocales(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <CheloneProvider
          dataProvider={makeProvider()}
          queryClient={new QueryClient()}
          i18n={i18n}
        >
          {children}
        </CheloneProvider>
      ),
    });
    expect(result.current).toEqual([
      { locale: "en", name: "English" },
      { locale: "not a tag!", name: "not a tag!" },
    ]);
  });

  it("is empty without an i18n instance", () => {
    const { result } = renderHook(() => useLocales(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <CheloneProvider
          dataProvider={makeProvider()}
          queryClient={new QueryClient()}
        >
          {children}
        </CheloneProvider>
      ),
    });
    expect(result.current).toEqual([]);
  });
});

describe("useLocaleState", () => {
  it("returns [locale, setLocale] with the current i18n locale", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useLocaleState(), { wrapper });
    const [locale, setLocale] = result.current;
    expect(locale).toBe("en");
    expect(typeof setLocale).toBe("function");
  });

  it("updates the locale and re-renders the reader", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useLocaleState(), { wrapper });
    act(() => {
      result.current[1]("fr");
    });
    expect(result.current[0]).toBe("fr");
  });

  it("shares locale across two consumers", () => {
    const { wrapper } = makeWrapper();
    function Two() {
      const [a, setA] = useLocaleState();
      const [b] = useLocaleState();
      return (
        <>
          <span data-testid="a">{a}</span>
          <span data-testid="b">{b}</span>
          <button type="button" onClick={() => setA("de")}>
            set
          </button>
        </>
      );
    }
    const { getByTestId, getByRole } = render(<Two />, { wrapper });
    expect(getByTestId("a").textContent).toBe("en");
    expect(getByTestId("b").textContent).toBe("en");
    act(() => {
      getByRole("button").click();
    });
    expect(getByTestId("a").textContent).toBe("de");
    expect(getByTestId("b").textContent).toBe("de");
  });
});

describe("useIsMobile", () => {
  const originalInnerWidth = window.innerWidth;
  let listeners: Array<EventListener>;

  function setViewport(width: number) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
  }

  /**
   * A `matchMedia` double: `matches` follows the stubbed viewport width, and the
   * change listeners land in `listeners` so a test can fire one.
   */
  function fakeMatchMedia(query: string): MediaQueryList {
    return {
      matches: window.innerWidth < 768,
      media: query,
      onchange: null,
      addEventListener(_type: string, cb: EventListenerOrEventListenerObject) {
        if (typeof cb === "function") listeners.push(cb);
      },
      removeEventListener(
        _type: string,
        cb: EventListenerOrEventListenerObject,
      ) {
        listeners = listeners.filter((l) => l !== cb);
      },
      // legacy API (unused; present for shape parity)
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    };
  }

  /** Fire the `change` event the hook registered on the double. */
  function fireChange() {
    for (const listener of listeners) listener(new Event("change"));
  }

  beforeEach(() => {
    listeners = [];
    vi.stubGlobal("matchMedia", fakeMatchMedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setViewport(originalInnerWidth);
  });

  it("returns false on a desktop-width viewport", () => {
    setViewport(1200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true on a mobile-width viewport", () => {
    setViewport(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("reacts to a viewport change event", () => {
    setViewport(1200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => {
      setViewport(500);
      fireChange();
    });
    expect(result.current).toBe(true);
  });

  it("removes its listener on unmount (no leak)", () => {
    setViewport(1200);
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners.length).toBe(1);
    unmount();
    expect(listeners.length).toBe(0);
  });
});
