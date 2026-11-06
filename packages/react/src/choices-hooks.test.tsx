import {
  createI18n,
  createNotificationStore,
  createStore,
  defineMessages,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ChoicesContextProvider,
  useChoices,
  useChoicesContext,
  useReferenceInput,
} from "./choices-hooks";
import { CheloneProvider } from "./context";

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      isbn: z.string(),
      category: z.string(),
    }),
  },
});

const rows = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `t${String(i + 1).padStart(2, "0")}`,
  isbn: `isbn-${i + 1}`,
  category: i % 2 === 0 ? "tech" : "life",
}));

function makeWrapper() {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(rows),
  });
  const store = createStore();
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "my.color.red": "Rouge" }) },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      notifications={notifications}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
  return { wrapper, dataProvider, queryClient };
}

describe("useChoicesContext — inline choices synthesis", () => {
  it("synthesizes a client-side list from a record[] (pagination off, not from reference)", () => {
    const { wrapper } = makeWrapper();
    const choices = [
      { id: 1, name: "Red" },
      { id: 2, name: "Blue" },
    ];
    const { result } = renderHook(
      () => useChoicesContext({ choices, source: "color" }),
      { wrapper },
    );
    expect(result.current.availableChoices).toEqual(choices);
    expect(result.current.allChoices).toEqual(choices);
    expect(result.current.total).toBe(2);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isFromReference).toBe(false);
    expect(result.current.source).toBe("color");
  });

  it("coerces a string[] into { id, name } choices", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useChoicesContext({ choices: ["a", "b"] }),
      { wrapper },
    );
    expect(result.current.availableChoices).toEqual([
      { id: "a", name: "a" },
      { id: "b", name: "b" },
    ]);
  });

  it("prefers props over an ambient context", () => {
    const { wrapper } = makeWrapper();
    const ambient = [{ id: 9, name: "Ambient" }];
    const own = [{ id: 1, name: "Own" }];
    function Child() {
      const ctx = useChoicesContext({ choices: own });
      return <span data-testid="src">{String(ctx.allChoices[0]?.name)}</span>;
    }
    const view = render(
      <ChoicesContextProvider value={{ choices: ambient }}>
        <Child />
      </ChoicesContextProvider>,
      { wrapper },
    );
    expect(view.getByTestId("src").textContent).toBe("Own");
  });

  it("falls back to the ambient context when no props are given", () => {
    const { wrapper } = makeWrapper();
    const ambient = [{ id: 9, name: "Ambient" }];
    function Child() {
      const ctx = useChoicesContext();
      return <span data-testid="src">{String(ctx.allChoices[0]?.name)}</span>;
    }
    const view = render(
      <ChoicesContextProvider value={{ choices: ambient }}>
        <Child />
      </ChoicesContextProvider>,
      { wrapper },
    );
    expect(view.getByTestId("src").textContent).toBe("Ambient");
  });
});

describe("useChoices", () => {
  it("getChoiceText: string path, function, and translation with {_: name} fallback", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useChoices({ optionText: "name", optionValue: "id" }),
      { wrapper },
    );
    // default string-path optionText, no translation catalog entry -> raw name
    expect(result.current.getChoiceText({ id: 1, name: "Plain" })).toBe(
      "Plain",
    );

    // function optionText
    const fnResult = renderHook(
      () =>
        useChoices({
          optionText: (c: Record<string, unknown>) => `#${c.id} ${c.name}`,
        }),
      { wrapper },
    );
    expect(
      fnResult.result.current.getChoiceText({ id: 7, name: "Seven" }),
    ).toBe("#7 Seven");
  });

  it("getChoiceText: translates when the text is a catalog key", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChoices({ optionText: "label" }), {
      wrapper,
    });
    // "my.color.red" IS a catalog key -> translated to "Rouge"
    expect(result.current.getChoiceText({ id: 1, label: "my.color.red" })).toBe(
      "Rouge",
    );
    // a non-key label survives via the {_: name} fallback
    expect(result.current.getChoiceText({ id: 2, label: "Just Text" })).toBe(
      "Just Text",
    );
  });

  it("getChoiceValue: reads optionValue path, defaults to id", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChoices({ optionValue: "isbn" }), {
      wrapper,
    });
    expect(result.current.getChoiceValue({ id: 1, isbn: "x-1" })).toBe("x-1");

    const idResult = renderHook(() => useChoices({}), { wrapper });
    expect(idResult.result.current.getChoiceValue({ id: 42 })).toBe(42);
  });

  it("getDisableValue: reads the disable path (default disabled)", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChoices({}), { wrapper });
    expect(result.current.getDisableValue({ id: 1, disabled: true })).toBe(
      true,
    );
    expect(result.current.getDisableValue({ id: 2 })).toBeFalsy();
  });

  it("optionText reads a bracket path", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useChoices({ optionText: "author[0].name" }),
      { wrapper },
    );
    expect(
      result.current.getChoiceText({ id: 1, author: [{ name: "Ada" }] }),
    ).toBe("Ada");
  });

  it("optionValue reads a bracket path", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useChoices({ optionValue: "refs[1].id" }),
      { wrapper },
    );
    expect(
      result.current.getChoiceValue({
        id: 1,
        refs: [{ id: "first" }, { id: "second" }],
      }),
    ).toBe("second");
  });

  it("a flat key that contains a dot still wins", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useChoices({ optionText: "nested.level", optionValue: "nested.level" }),
      { wrapper },
    );
    const choice = { id: 1, "nested.level": "Flat", nested: { level: "Deep" } };
    expect(result.current.getChoiceText(choice)).toBe("Flat");
    expect(result.current.getChoiceValue(choice)).toBe("Flat");
  });

  it("an empty option path reads nothing, not the whole choice", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useChoices({ optionText: "", optionValue: "", disableValue: "" }),
      { wrapper },
    );
    const choice = { id: 7, name: "Seven" };
    expect(result.current.getChoiceText(choice)).toBe("");
    expect(result.current.getChoiceValue(choice)).toBe(7);
    expect(result.current.getDisableValue(choice)).toBe(false);
  });

  it("disables translation when translateChoice is false", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useChoices({ optionText: "label", translateChoice: false }),
      { wrapper },
    );
    // catalog key NOT translated
    expect(result.current.getChoiceText({ id: 1, label: "my.color.red" })).toBe(
      "my.color.red",
    );
  });
});

describe("useReferenceInput — end-to-end vs fake provider", () => {
  it("provides a reference-backed ChoicesContext and fetches choices", async () => {
    const { wrapper } = makeWrapper();
    const latest: { current: ReturnType<typeof useReferenceInput> | null } = {
      current: null,
    };
    const { result } = renderHook(
      () => useReferenceInput({ reference: "posts", source: "postId" }),
      { wrapper },
    );
    latest.current = result.current;
    await act(async () => {});
    await vi.waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isFromReference).toBe(true);
    expect(result.current.availableChoices.length).toBeGreaterThan(0);
    expect(result.current.resource).toBe("posts");
  });

  it("search debounce: setFilters(..., true) applies after the debounce", async () => {
    vi.useFakeTimers();
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useReferenceInput({
          reference: "posts",
          source: "postId",
          perPage: 100,
          debounceMs: 300,
        }),
      { wrapper },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await vi.waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.availableChoices.length).toBe(25);

    // Filter on an exact-match field (fake provider uses ===).
    act(() => result.current.setFilters({ category: "tech" }, true));
    // Not yet applied before the debounce elapses.
    expect(result.current.filter).toEqual({});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.filter).toEqual({ category: "tech" });
    await vi.waitFor(() =>
      expect(
        result.current.availableChoices.every((r) => r.category === "tech"),
      ).toBe(true),
    );
    vi.useRealTimers();
  });

  it("non-id lookupKey resolves the selected record via a getList filter", async () => {
    const { wrapper, dataProvider } = makeWrapper();
    const getListSpy = vi.spyOn(dataProvider, "getList");
    const { result } = renderHook(
      () =>
        useReferenceInput({
          reference: "posts",
          source: "isbn",
          lookupKey: "isbn",
        }),
      { wrapper },
    );
    await act(async () => {});
    await vi.waitFor(() => expect(result.current.isPending).toBe(false));

    act(() => result.current.setValue("isbn-20"));
    await act(async () => {});
    await vi.waitFor(() =>
      expect(result.current.selectedChoices[0]?.isbn).toBe("isbn-20"),
    );
    // a getList call carried the lookupKey filter
    expect(
      getListSpy.mock.calls.some((call) => call[1]?.filter?.isbn === "isbn-20"),
    ).toBe(true);
  });
});
