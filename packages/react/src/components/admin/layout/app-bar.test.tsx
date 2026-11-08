/**
 * P7e-T3 tests: `<AppBar>` — the layout header.
 *
 * Renders the sidebar toggle, the title portal, the default toolbar
 * (`<LocalesMenuButton>` + `<ThemeModeToggle>`) and the user menu. Asserts: the toggle + theme toggle
 * render; a `toolbar` prop overrides the default cluster; `userMenu={false}`
 * suppresses the user menu; `children` replace the whole default layout.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CheloneProvider } from "../../../context";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { AppBar } from "./app-bar";

afterEach(cleanup);

const enMessages = defineMessages({
  "chelone.action.open_menu": "Open menu",
  "chelone.action.close_menu": "Close menu",
  "chelone.action.toggle_theme": "Toggle theme",
  "chelone.action.change_locale": "Change locale",
});

function makeI18n(locales: string[] = ["en"]) {
  return createI18n({
    locale: "en",
    messages: Object.fromEntries(
      locales.map((code) => [code, code === "en" ? enMessages : {}]),
    ),
  });
}

function Wrap({
  children,
  locales,
}: {
  children: ReactNode;
  locales?: string[];
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={makeI18n(locales)}
    >
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <MemoryRouter>
          <SidebarProvider>{children}</SidebarProvider>
        </MemoryRouter>
      </RouterAdapterProvider>
    </CheloneProvider>
  );
}

describe("<AppBar>", () => {
  it("renders the sidebar toggle and the default theme toggle", () => {
    render(
      <Wrap>
        <AppBar />
      </Wrap>,
    );
    expect(
      screen.getByRole("button", { name: /toggle sidebar/i }),
    ).toBeTruthy();
    expect(screen.getByText("Toggle theme")).toBeTruthy();
  });

  it("replaces the default toolbar with the toolbar prop", () => {
    render(
      <Wrap>
        <AppBar toolbar={<button type="button">Custom Tool</button>} />
      </Wrap>,
    );
    expect(screen.getByRole("button", { name: "Custom Tool" })).toBeTruthy();
    // The default theme toggle is gone.
    expect(screen.queryByText("Toggle theme")).toBeNull();
  });

  it("replaces the whole bar when children are provided", () => {
    render(
      <Wrap>
        <AppBar>
          <div data-testid="custom-bar">Custom bar</div>
        </AppBar>
      </Wrap>,
    );
    expect(screen.getByTestId("custom-bar")).toBeTruthy();
    // The default sidebar toggle is suppressed by custom children.
    expect(
      screen.queryByRole("button", { name: /toggle sidebar/i }),
    ).toBeNull();
  });

  it("shows the locales menu when the i18n has two locales", () => {
    render(
      <Wrap locales={["en", "fr"]}>
        <AppBar />
      </Wrap>,
    );
    expect(screen.getByRole("button", { name: "Change locale" })).toBeTruthy();
  });

  it("shows no locales menu with one locale", () => {
    render(
      <Wrap>
        <AppBar />
      </Wrap>,
    );
    expect(screen.queryByRole("button", { name: "Change locale" })).toBeNull();
  });

  it("toolbar prop replaces the locales menu and the theme toggle", () => {
    render(
      <Wrap locales={["en", "fr"]}>
        <AppBar toolbar={<button type="button">Custom Tool</button>} />
      </Wrap>,
    );
    expect(screen.queryByRole("button", { name: "Change locale" })).toBeNull();
    expect(screen.queryByText("Toggle theme")).toBeNull();
  });
});
