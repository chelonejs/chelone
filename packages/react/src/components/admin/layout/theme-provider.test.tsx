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
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { ThemeProvider } from "./theme-provider";
import { useTheme } from "./use-theme";

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
});
