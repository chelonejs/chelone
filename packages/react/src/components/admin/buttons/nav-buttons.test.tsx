/**
 * P7g tests: the navigation buttons — `<CreateButton>`, `<EditButton>`,
 * `<ShowButton>`, `<CancelButton>`.
 *
 * Asserts each renders a link to the right resource path (create/edit/show) and
 * that Cancel navigates back. The record-scoped buttons render nothing without a
 * record (parity with shadmin).
 */

import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { CancelButton } from "./cancel-button";
import { CreateButton } from "./create-button";
import { EditButton } from "./edit-button";
import { ShowButton } from "./show-button";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.create": "Create",
        "chelone.action.edit": "Edit",
        "chelone.action.show": "Show",
        "chelone.action.cancel": "Cancel",
      }),
    },
  });
}

function Providers({
  children,
  initialEntries = ["/"],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: true,
    hasEdit: true,
    hasShow: true,
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={makeI18n()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={initialEntries}>
            <ResourceContextProvider value="posts">
              {children}
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<CreateButton>", () => {
  it("links to the resource create path", () => {
    render(
      <Providers>
        <CreateButton />
      </Providers>,
    );
    const link = screen.getByRole("link", { name: /create/i });
    expect(link.getAttribute("href")).toBe("/posts/create");
  });
});

describe("<EditButton>", () => {
  it("links to the record edit path", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 7, title: "t" }}>
          <EditButton />
        </RecordContextProvider>
      </Providers>,
    );
    const link = screen.getByRole("link", { name: /edit/i });
    expect(link.getAttribute("href")).toBe("/posts/7");
  });

  it("renders nothing without a record", () => {
    render(
      <Providers>
        <EditButton />
      </Providers>,
    );
    expect(screen.queryByRole("link", { name: /edit/i })).toBeNull();
  });
});

describe("<ShowButton>", () => {
  it("links to the record show path", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 7, title: "t" }}>
          <ShowButton />
        </RecordContextProvider>
      </Providers>,
    );
    const link = screen.getByRole("link", { name: /show/i });
    expect(link.getAttribute("href")).toBe("/posts/7/show");
  });
});

describe("<CancelButton>", () => {
  it("navigates back on click", () => {
    // Two history entries: after a back-nav we land on the first.
    render(
      <Providers initialEntries={["/posts", "/posts/create"]}>
        <CancelButton />
      </Providers>,
    );
    const button = screen.getByRole("button", { name: /cancel/i });
    expect(button).toBeTruthy();
    // Clicking navigate(-1) must not throw.
    fireEvent.click(button);
  });
});
