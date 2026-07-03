import {
  type ChelonStore,
  createStore,
  fakeDataProvider,
  localStorageAdapter,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { CheloneProvider } from "./context";
import { useStore, useStoreItem } from "./store-hooks";

/** A minimal provider whose only exercised service is the KV store. */
function providerWrapper(store: ChelonStore) {
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      store={store}
    >
      {children}
    </CheloneProvider>
  );
}

function makeWrapper() {
  const store = createStore();
  return { wrapper: providerWrapper(store), store };
}

describe("useStore (ra alias over useStoreItem)", () => {
  it("is the same function as useStoreItem (signature parity)", () => {
    // The alias must be the identical implementation — no wrapper, no drift.
    expect(useStore).toBe(useStoreItem);
  });

  it("returns [value, setter] with the default value when the key is unset", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useStore("mykey", 7), { wrapper });
    const [value, setValue] = result.current;
    expect(value).toBe(7);
    expect(typeof setValue).toBe("function");
  });

  it("persists writes through the chelone store and re-renders the reader", () => {
    const { wrapper, store } = makeWrapper();
    const { result } = renderHook(() => useStore<number>("counter", 0), {
      wrapper,
    });
    expect(result.current[0]).toBe(0);
    act(() => {
      result.current[1](42);
    });
    expect(result.current[0]).toBe(42);
    // The write reached the underlying store, not just local component state.
    expect(store.getItem<number>("counter")).toBe(42);
  });

  it("cross-consumer: a write from one useStore updates a second reader on the same key", () => {
    const { wrapper } = makeWrapper();
    function Two() {
      const [a, setA] = useStore<string>("shared", "x");
      const [b] = useStore<string>("shared", "x");
      return (
        <>
          <span data-testid="a">{a}</span>
          <span data-testid="b">{b}</span>
          <button type="button" onClick={() => setA("y")}>
            set
          </button>
        </>
      );
    }
    const { getByTestId, getByRole } = render(<Two />, { wrapper });
    expect(getByTestId("a").textContent).toBe("x");
    expect(getByTestId("b").textContent).toBe("x");
    act(() => {
      getByRole("button").click();
    });
    expect(getByTestId("a").textContent).toBe("y");
    expect(getByTestId("b").textContent).toBe("y");
  });

  it("persists across a localStorage-backed store (survives a fresh reader mount)", () => {
    const store = createStore(localStorageAdapter({ prefix: "test-p7a-t5." }));
    const wrapper = providerWrapper(store);
    const first = renderHook(() => useStore<string>("persist", "init"), {
      wrapper,
    });
    act(() => {
      first.result.current[1]("saved");
    });
    first.unmount();
    // A brand-new reader (no default match) sees the persisted value.
    const second = renderHook(() => useStore<string>("persist", "init"), {
      wrapper,
    });
    expect(second.result.current[0]).toBe("saved");
    // Cleanup the localStorage entry the adapter wrote.
    store.removeItem("persist");
  });
});
