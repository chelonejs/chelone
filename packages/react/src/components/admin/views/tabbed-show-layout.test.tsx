/**
 * `<TabbedShowLayout>` tests: a show view's fields grouped into labeled tabs
 * that follow the URL under the show route's splat (`:id/show/*`).
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceContextProvider } from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { useLocation } from "../../../router/nav-hooks";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { TextField } from "../fields/text-field";
import {
  TabbedShowLayout,
  type TabbedShowLayoutTabDescriptor,
} from "./tabbed-show-layout";

afterEach(cleanup);

const record = {
  id: 1,
  title: "Hello World",
  body: "Lorem ipsum",
  tag: "news",
};

let currentLocation = { pathname: "", search: "" };
function CaptureLocation() {
  const { pathname, search } = useLocation();
  currentLocation = { pathname, search };
  return null;
}

function renderAt(
  entry: string,
  ui: ReactNode,
  options: { withRecord?: boolean; messages?: Record<string, string> } = {},
) {
  const { withRecord = true, messages = {} } = options;
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
  });
  return render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <MemoryRouter initialEntries={[entry]}>
          <CaptureLocation />
          <ResourceContextProvider value="posts">
            <Routes>
              <Route
                path="/posts/:id/show/*"
                element={
                  withRecord ? (
                    <RecordContextProvider value={record}>
                      {ui}
                    </RecordContextProvider>
                  ) : (
                    ui
                  )
                }
              />
            </Routes>
          </ResourceContextProvider>
        </MemoryRouter>
      </RouterAdapterProvider>
    </CheloneProvider>,
  );
}

function twoTabs(props: Partial<Parameters<typeof TabbedShowLayout>[0]> = {}) {
  return (
    <TabbedShowLayout {...props}>
      <TabbedShowLayout.Tab label="Summary">
        <TextField source="title" />
      </TabbedShowLayout.Tab>
      <TabbedShowLayout.Tab label="Details">
        <TextField source="body" />
      </TabbedShowLayout.Tab>
    </TabbedShowLayout>
  );
}

/** Radix triggers activate on mouse down, not click. */
function clickTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

describe("<TabbedShowLayout>", () => {
  it("TabbedShowLayout shows the first tab's labeled fields and hides the others", () => {
    renderAt("/posts/1/show", twoTabs());
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Summary",
      "Details",
    ]);
    expect(screen.getByText("Title")).toBeTruthy();
    expect(screen.getByText("Hello World")).toBeTruthy();
    expect(screen.queryByText("Lorem ipsum")).toBeNull();
    expect(screen.queryByText("Body")).toBeNull();
  });

  it("TabbedShowLayout clicking a tab navigates to its path and keeps the query string", () => {
    renderAt("/posts/1/show?sort=asc", twoTabs());
    clickTab("Details");
    expect(currentLocation).toEqual({
      pathname: "/posts/1/show/1",
      search: "?sort=asc",
    });
    expect(screen.getByText("Lorem ipsum")).toBeTruthy();
    expect(screen.queryByText("Hello World")).toBeNull();
    clickTab("Summary");
    expect(currentLocation).toEqual({
      pathname: "/posts/1/show",
      search: "?sort=asc",
    });
  });

  it("TabbedShowLayout switches tabs when the show URL ends in a slash", () => {
    renderAt("/posts/1/show/", twoTabs());
    clickTab("Details");
    expect(currentLocation.pathname).toBe("/posts/1/show/1");
    expect(screen.getByText("Lorem ipsum")).toBeTruthy();
    expect(screen.queryByText("Hello World")).toBeNull();
  });

  it("TabbedShowLayout opens the tab named by the URL on load", () => {
    renderAt(
      "/posts/1/show/extra",
      <TabbedShowLayout>
        <TabbedShowLayout.Tab label="Summary">
          <TextField source="title" />
        </TabbedShowLayout.Tab>
        <TabbedShowLayout.Tab label="Details">
          <TextField source="body" />
        </TabbedShowLayout.Tab>
        <TabbedShowLayout.Tab label="Extra" path="extra">
          <TextField source="tag" />
        </TabbedShowLayout.Tab>
      </TabbedShowLayout>,
    );
    expect(screen.getByText("news")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Extra" }).ariaSelected).toBe(
      "true",
    );
    expect(screen.queryByText("Hello World")).toBeNull();
  });

  it("TabbedShowLayout falls back to the first tab for an unknown segment", () => {
    renderAt("/posts/1/show/nope", twoTabs());
    expect(screen.getByText("Hello World")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Summary" }).ariaSelected).toBe(
      "true",
    );
  });

  it("TabbedShowLayout with syncWithLocation false leaves the URL alone", () => {
    renderAt("/posts/1/show?sort=asc", twoTabs({ syncWithLocation: false }));
    clickTab("Details");
    expect(screen.getByText("Lorem ipsum")).toBeTruthy();
    expect(screen.queryByText("Hello World")).toBeNull();
    expect(currentLocation).toEqual({
      pathname: "/posts/1/show",
      search: "?sort=asc",
    });
  });

  it("TabbedShowLayout value prop controls the active tab", () => {
    const { unmount } = renderAt("/posts/1/show", twoTabs({ value: "1" }));
    expect(screen.getByText("Lorem ipsum")).toBeTruthy();
    expect(screen.queryByText("Hello World")).toBeNull();
    unmount();
    renderAt("/posts/1/show", twoTabs({ value: "1", syncWithLocation: false }));
    expect(screen.getByText("Lorem ipsum")).toBeTruthy();
    expect(screen.queryByText("Hello World")).toBeNull();
  });

  it("TabbedShowLayout renders a translated label, an icon and a count", () => {
    renderAt(
      "/posts/1/show",
      <TabbedShowLayout>
        <TabbedShowLayout.Tab
          label="post.tab.details"
          count={3}
          icon={<svg data-testid="tab-icon" />}
        >
          <TextField source="title" />
        </TabbedShowLayout.Tab>
        <TabbedShowLayout.Tab label="Untranslated">
          <TextField source="body" />
        </TabbedShowLayout.Tab>
      </TabbedShowLayout>,
      { messages: { "post.tab.details": "Détails" } },
    );
    expect(screen.getByRole("tab", { name: "Détails (3)" })).toBeTruthy();
    expect(screen.getByTestId("tab-icon")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Untranslated" })).toBeTruthy();
  });

  it("TabbedShowLayout renders nothing until the record has loaded", () => {
    renderAt("/posts/1/show", twoTabs(), { withRecord: false });
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText("Hello World")).toBeNull();
  });

  it("TabbedShowLayout keeps tabs found inside a Fragment", () => {
    renderAt(
      "/posts/1/show",
      <TabbedShowLayout>
        <>
          <TabbedShowLayout.Tab label="Summary">
            <TextField source="title" />
          </TabbedShowLayout.Tab>
          <TabbedShowLayout.Tab label="Details">
            <TextField source="body" />
          </TabbedShowLayout.Tab>
        </>
      </TabbedShowLayout>,
    );
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByText("Hello World")).toBeTruthy();
  });

  it("TabbedShowLayout ignores a child that is not a tab", () => {
    renderAt(
      "/posts/1/show",
      <TabbedShowLayout>
        <p>Stray paragraph</p>
        <TextField source="tag" />
        text
        <TabbedShowLayout.Tab label="Summary">
          <TextField source="title" />
        </TabbedShowLayout.Tab>
      </TabbedShowLayout>,
    );
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(screen.getByText("Hello World")).toBeTruthy();
    expect(screen.queryByText("Stray paragraph")).toBeNull();
    expect(screen.queryByText("news")).toBeNull();
    expect(screen.queryByText("text")).toBeNull();
  });

  it("TabbedShowLayout tabs prop replaces the default tab list", () => {
    function CustomTabs({
      tabs,
    }: {
      tabs?: TabbedShowLayoutTabDescriptor[];
    }): ReactElement {
      return (
        <ul data-testid="custom-tabs">
          {tabs?.map((tab) => (
            <li key={tab.value}>{tab.label}</li>
          ))}
        </ul>
      );
    }
    renderAt("/posts/1/show", twoTabs({ tabs: <CustomTabs /> }));
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByTestId("custom-tabs").textContent).toBe(
      "SummaryDetails",
    );
    expect(screen.getByText("Hello World")).toBeTruthy();
  });

  it("TabbedShowLayout puts the divider between a tab's fields only", () => {
    renderAt(
      "/posts/1/show",
      <TabbedShowLayout divider={<hr />}>
        <TabbedShowLayout.Tab label="Summary">
          <TextField source="title" />
          <TextField source="body" />
          <TextField source="tag" />
        </TabbedShowLayout.Tab>
      </TabbedShowLayout>,
    );
    expect(screen.getAllByRole("separator")).toHaveLength(2);
  });
});
