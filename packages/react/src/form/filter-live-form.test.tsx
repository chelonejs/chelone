import {
  createNotificationStore,
  createStore,
  defineResources,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { makeListContext } from "../__fixtures__/list-context";
import { CheloneProvider } from "../context";
import type { UseListControllerResult } from "../controller-hooks";
import { useListController } from "../controller-hooks";
import { useInput } from "../form-hooks";
import { ResourceContextProvider } from "../resource";
import {
  FilterLiveForm,
  getFilterFormValues,
  ListContextProvider,
  useFilterForm,
  useListContext,
} from "./filter-live-form";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string() }),
  },
});

interface PostRecord {
  id: number;
  title: string;
}

function makeWrapper({ strict = false }: { strict?: boolean } = {}) {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({ posts: [] });
  const store = createStore();
  const inner = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      notifications={notifications}
    >
      {children}
    </CheloneProvider>
  );
  const Wrapper = strict
    ? ({ children }: { children: ReactNode }) => (
        <StrictMode>{inner({ children })}</StrictMode>
      )
    : inner;
  return { Wrapper };
}

/**
 * A fake list-context value plus the `setFilters` spy FilterLiveForm pushes
 * into. Only `filter` + `setFilters` are load-bearing here; the rest of the
 * surface comes from the shared fixture.
 */
function makeFakeList(filter: Record<string, unknown> = {}) {
  const setFilters = vi.fn();
  return {
    value: makeListContext<PostRecord>({ filter, setFilters }),
    setFilters,
  };
}

/** A one-input filter form driving `title`. Exposes the input handle. */
function makeFilterHarness({
  list,
  strict = false,
  validate,
}: {
  list: UseListControllerResult<PostRecord>;
  strict?: boolean;
  validate?: ReturnType<typeof required>;
}) {
  const input: { current: ReturnType<typeof useInput> | null } = {
    current: null,
  };
  function TitleInput() {
    input.current = useInput({ source: "title", validate });
    return null;
  }
  function Host() {
    return (
      <ResourceContextProvider value="posts">
        <ListContextProvider value={list}>
          <FilterLiveForm>
            <TitleInput />
          </FilterLiveForm>
        </ListContextProvider>
      </ResourceContextProvider>
    );
  }
  const { Wrapper } = makeWrapper({ strict });
  const view = render(
    <Wrapper>
      <Host />
    </Wrapper>,
  );
  return { input, view };
}

describe("useFilterForm / FilterLiveForm", () => {
  it("pushes typed values into setFilters, delegating the debounce to the list-controller", async () => {
    const { value, setFilters } = makeFakeList();
    const { input } = makeFilterHarness({ list: value });

    await act(async () => {
      input.current?.field.onChange("hello");
    });

    // Delegated debounce: setFilters called with debounced=true (3rd arg), NOT
    // a form-side debounce. The form pushes immediately; the controller waits.
    await waitFor(() => expect(setFilters).toHaveBeenCalled());
    const lastCall = setFilters.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({ title: "hello" });
    // debounced flag is the 3rd positional arg.
    expect(lastCall?.[2]).toBe(true);
  });

  it("merges new values OVER the existing permanent filter (object merge, not array)", async () => {
    const { value, setFilters } = makeFakeList({ category: "tech" });
    const { input } = makeFilterHarness({ list: value });

    await act(async () => {
      input.current?.field.onChange("hello");
    });

    await waitFor(() => expect(setFilters).toHaveBeenCalled());
    const merged = setFilters.mock.calls.at(-1)?.[0];
    expect(merged).toMatchObject({ category: "tech", title: "hello" });
  });

  it("reflects an EXTERNAL filter change back into the form input value", async () => {
    // Start empty, then swap the list value's filter (as a real list would on
    // an out-of-band setFilters) and re-render — the input mirrors it.
    const setFilters = vi.fn();
    let currentFilter: Record<string, unknown> = {};
    const input: { current: ReturnType<typeof useInput> | null } = {
      current: null,
    };
    function TitleInput() {
      input.current = useInput({ source: "title" });
      return null;
    }
    function Host() {
      const list = makeListContext<PostRecord>({
        filter: currentFilter,
        setFilters,
      });
      return (
        <ResourceContextProvider value="posts">
          <ListContextProvider value={list}>
            <FilterLiveForm>
              <TitleInput />
            </FilterLiveForm>
          </ListContextProvider>
        </ResourceContextProvider>
      );
    }
    const { Wrapper } = makeWrapper();
    const { rerender } = render(
      <Wrapper>
        <Host />
      </Wrapper>,
    );

    // External change: filter now has a title the user never typed.
    currentFilter = { title: "external" };
    await act(async () => {
      rerender(
        <Wrapper>
          <Host />
        </Wrapper>,
      );
    });

    expect(input.current?.field.value).toBe("external");
  });

  it("does NOT clobber the value the user just typed with a stale external filter", async () => {
    // The list's filter still reflects a PREVIOUS (debounced) value while the
    // user types a newer one; the hasJustBeenModifiedByUser guard prevents the
    // external-reflect effect from resetting the fresh input.
    const setFilters = vi.fn();
    const staleFilter: Record<string, unknown> = { title: "old" };
    const input: { current: ReturnType<typeof useInput> | null } = {
      current: null,
    };
    function TitleInput() {
      input.current = useInput({ source: "title" });
      return null;
    }
    function Host() {
      const list = makeListContext<PostRecord>({
        filter: staleFilter,
        setFilters,
      });
      return (
        <ResourceContextProvider value="posts">
          <ListContextProvider value={list}>
            <FilterLiveForm>
              <TitleInput />
            </FilterLiveForm>
          </ListContextProvider>
        </ResourceContextProvider>
      );
    }
    const { Wrapper } = makeWrapper();
    const { rerender } = render(
      <Wrapper>
        <Host />
      </Wrapper>,
    );

    // User types a NEW value.
    await act(async () => {
      input.current?.field.onChange("new");
    });
    // A re-render happens (staleFilter unchanged) — the guard must keep "new".
    await act(async () => {
      rerender(
        <Wrapper>
          <Host />
        </Wrapper>,
      );
    });
    expect(input.current?.field.value).toBe("new");
  });

  it("does not call setFilters while the form is invalid (validity gate)", async () => {
    const { value, setFilters } = makeFakeList();
    const { input } = makeFilterHarness({ list: value, validate: required() });

    // Type then clear — a required field is invalid when empty. Because the
    // form is invalid, setFilters must NOT be called with the empty value.
    await act(async () => {
      input.current?.field.onChange("x");
    });
    setFilters.mockClear();
    await act(async () => {
      // Clearing triggers a change; a required validator makes canSubmit false.
      input.current?.field.onChange("");
    });
    // Give any debounced push a chance to (not) fire.
    await new Promise((r) => setTimeout(r, 10));
    // Every recorded push must carry a non-empty title (invalid pushes blocked).
    for (const call of setFilters.mock.calls) {
      expect(call[0]?.title ?? "").not.toBe("");
    }
  });

  it("useListContext throws without a ListContextProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { Wrapper } = makeWrapper();
    expect(() =>
      renderHook(() => useListContext(), { wrapper: Wrapper }),
    ).toThrow(/ListContextProvider/);
    spy.mockRestore();
  });

  it("useFilterForm exposes the form + a filter-flavored source scope (resource-keyed labels)", () => {
    const { value } = makeFakeList();
    const { result } = renderHook(() => useFilterForm(), {
      wrapper: ({ children }: { children: ReactNode }) => {
        const { Wrapper } = makeWrapper();
        return (
          <Wrapper>
            <ResourceContextProvider value="posts">
              <ListContextProvider value={value}>
                {children}
              </ListContextProvider>
            </ResourceContextProvider>
          </Wrapper>
        );
      },
    });
    // Identity source, resource-keyed label (matches ra's FilterLiveForm scope).
    expect(result.current.sourceScope.getSource("title")).toBe("title");
    expect(result.current.sourceScope.getLabel("title")).toBe(
      "resources.posts.fields.title",
    );
    // A resource-prop override wins over the ambient ResourceContext.
    const { result: overridden } = renderHook(
      () => useFilterForm({ resource: "comments" }),
      {
        wrapper: ({ children }: { children: ReactNode }) => {
          const { Wrapper } = makeWrapper();
          return (
            <Wrapper>
              <ResourceContextProvider value="posts">
                <ListContextProvider value={value}>
                  {children}
                </ListContextProvider>
              </ResourceContextProvider>
            </Wrapper>
          );
        },
      },
    );
    expect(overridden.current.sourceScope.getLabel("body")).toBe(
      "resources.comments.fields.body",
    );
  });

  it("survives StrictMode double-invoke without duplicate filter pushes leaking", async () => {
    const { value, setFilters } = makeFakeList();
    const { input } = makeFilterHarness({ list: value, strict: true });
    await act(async () => {
      input.current?.field.onChange("hello");
    });
    await waitFor(() => expect(setFilters).toHaveBeenCalled());
    // The final pushed value is correct regardless of double-invoke.
    expect(setFilters.mock.calls.at(-1)?.[0]).toMatchObject({ title: "hello" });
  });

  it("reads the real list controller's setFilters through the context (integration)", async () => {
    // Wire a REAL useListController and assert the filter form drives its
    // filter state end-to-end.
    const latest: { current: UseListControllerResult<PostRecord> | null } = {
      current: null,
    };
    const input: { current: ReturnType<typeof useInput> | null } = {
      current: null,
    };
    function TitleInput() {
      input.current = useInput({ source: "title" });
      return null;
    }
    function Host() {
      const list = useListController<typeof resources, "posts">("posts", {
        debounceMs: 0,
      });
      latest.current = list;
      return (
        <ResourceContextProvider value="posts">
          <ListContextProvider value={list}>
            <FilterLiveForm>
              <TitleInput />
            </FilterLiveForm>
          </ListContextProvider>
        </ResourceContextProvider>
      );
    }
    const { Wrapper } = makeWrapper();
    render(
      <Wrapper>
        <Host />
      </Wrapper>,
    );
    await act(async () => {
      input.current?.field.onChange("q");
    });
    await waitFor(() => expect(latest.current?.filter.title).toBe("q"));
  });
});

describe("getFilterFormValues", () => {
  it("returns a value for every form key, falling back to '' when the filter lacks it", () => {
    const formValues = { title: "a", author: undefined };
    const filter = { title: "external" };
    const result = getFilterFormValues(formValues, filter);
    // Every form key present; a key the filter lacks becomes ''.
    expect(Object.keys(result).sort()).toEqual(["author", "title"]);
    expect(result.title).toBe("external");
    expect(result.author).toBe("");
  });

  it("never produces undefined for a present form key", () => {
    const formValues = { title: undefined, body: null };
    const result = getFilterFormValues(formValues, {});
    expect(result.title).toBe("");
    expect(result.body).toBe("");
  });
});
