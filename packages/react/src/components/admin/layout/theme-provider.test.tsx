/**
 * P7e-T3 tests: `<ThemeProvider>` + `useTheme`.
 *
 * Store-backed light/dark/system mode. Applies the resolved mode as a class on
 * `<html>` (so Tailwind `dark:` + the shadcn `.dark` token block resolve) and
 * persists the selection via chelone's `useStore`. Asserts the initial class,
 * a toggle updating the class, and persistence surviving a remount off the same
 * store.
 */

import {
  type CheloneStore,
  createStore,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { ThemeProvider } from "./theme-provider";
import { useTheme } from "./use-theme";

/** A provider harness with no store configured. */
function WrapWithoutStore({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
    >
      {children}
    </CheloneProvider>
  );
}

/** Minimal provider harness — ThemeProvider only needs the store. */
function Wrap({
  store,
  children,
}: {
  store: CheloneStore;
  children: ReactNode;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      store={store}
    >
      {children}
    </CheloneProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.classList.remove("light", "dark");
});

function Probe() {
  const [theme, setTheme] = useTheme();
  return (
    <div>
      <span data-testid="mode">{theme}</span>
      <button type="button" onClick={() => setTheme("dark")}>
        go dark
      </button>
      <button type="button" onClick={() => setTheme("light")}>
        go light
      </button>
    </div>
  );
}

describe("<ThemeProvider>", () => {
  it("applies the default light class on <html> and publishes the mode", () => {
    const store = createStore();
    render(
      <Wrap store={store}>
        <ThemeProvider defaultTheme="light">
          <Probe />
        </ThemeProvider>
      </Wrap>,
    );
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(screen.getByTestId("mode").textContent).toBe("light");
  });

  it("toggles the <html> class when the mode changes", () => {
    const store = createStore();
    render(
      <Wrap store={store}>
        <ThemeProvider defaultTheme="light">
          <Probe />
        </ThemeProvider>
      </Wrap>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("the mode persists under chelone-theme by default", () => {
    const store = createStore();
    render(
      <Wrap store={store}>
        <ThemeProvider defaultTheme="system">
          <Probe />
        </ThemeProvider>
      </Wrap>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go dark" }));
    expect(store.getItem("chelone-theme")).toBe("dark");
    expect(store.getItem("theme")).toBeUndefined();
  });

  it("persists the selection to the store across a remount", () => {
    const store = createStore();
    const { unmount } = render(
      <Wrap store={store}>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <Probe />
        </ThemeProvider>
      </Wrap>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go dark" }));
    expect(store.getItem("theme")).toBe("dark");
    unmount();

    render(
      <Wrap store={store}>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <Probe />
        </ThemeProvider>
      </Wrap>,
    );
    // The persisted "dark" wins over the "system" default on remount.
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("ignores a stored value that is not a mode and uses the default", () => {
    const store = createStore();
    store.setItem("theme", "blue");
    render(
      <Wrap store={store}>
        <ThemeProvider defaultTheme="light">
          <Probe />
        </ThemeProvider>
      </Wrap>,
    );
    expect(screen.getByTestId("mode").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("blue")).toBe(false);
  });

  it("without a store the mode persists to localStorage", () => {
    const { unmount } = render(
      <WrapWithoutStore>
        <ThemeProvider defaultTheme="light" storageKey="theme">
          <Probe />
        </ThemeProvider>
      </WrapWithoutStore>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    unmount();

    render(
      <WrapWithoutStore>
        <ThemeProvider defaultTheme="light" storageKey="theme">
          <Probe />
        </ThemeProvider>
      </WrapWithoutStore>,
    );
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("renders and still switches the mode when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    render(
      <WrapWithoutStore>
        <ThemeProvider defaultTheme="light">
          <Probe />
        </ThemeProvider>
      </WrapWithoutStore>,
    );
    expect(screen.getByTestId("mode").textContent).toBe("light");
    fireEvent.click(screen.getByRole("button", { name: "go dark" }));
    expect(screen.getByTestId("mode").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("keeps its children mounted when a store appears", () => {
    const queryClient = new QueryClient();
    const dataProvider = fakeDataProvider({});
    function Instance() {
      const [id] = useState(() => Math.random());
      return <span data-testid="instance">{id}</span>;
    }
    const tree = (store?: CheloneStore) => (
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        store={store}
      >
        <ThemeProvider defaultTheme="light">
          <Instance />
        </ThemeProvider>
      </CheloneProvider>
    );
    const { rerender } = render(tree());
    const before = screen.getByTestId("instance").textContent;
    rerender(tree(createStore()));
    expect(screen.getByTestId("instance").textContent).toBe(before);
  });

  it("without a store a new storageKey reads the mode stored under it", () => {
    localStorage.setItem("a", "dark");
    localStorage.setItem("b", "light");
    const tree = (storageKey: string) => (
      <WrapWithoutStore>
        <ThemeProvider storageKey={storageKey}>
          <Probe />
        </ThemeProvider>
      </WrapWithoutStore>
    );
    const { rerender } = render(tree("a"));
    expect(screen.getByTestId("mode").textContent).toBe("dark");
    rerender(tree("b"));
    expect(screen.getByTestId("mode").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
