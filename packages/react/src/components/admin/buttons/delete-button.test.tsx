/**
 * P7g tests: `<DeleteButton>` — the confirm-gated record delete.
 *
 * Asserts: renders a Delete button, opens a `<Confirm>` on click, and on
 * confirm removes the record through the data provider. Rendered inside a
 * ResourceContext + RecordContext (its natural habitat: an Edit/Show action).
 */

import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
import { DeleteButton } from "./delete-button";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.delete": "Delete",
        "chelone.action.confirm": "Confirm",
        "chelone.action.cancel": "Cancel",
      }),
    },
  });
}

function makeDataProvider() {
  return fakeDataProvider({
    posts: [
      { id: 1, title: "One" },
      { id: 2, title: "Two" },
    ],
  });
}

function Providers({
  children,
  dataProvider = makeDataProvider(),
}: {
  children: ReactNode;
  dataProvider?: ReturnType<typeof makeDataProvider>;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={makeI18n()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/posts/1"]}>
            <ResourceContextProvider value="posts">
              {children}
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<DeleteButton>", () => {
  it("renders a Delete button", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, title: "One" }}>
          <DeleteButton />
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getByRole("button", { name: /delete/i })).toBeTruthy();
  });

  it("opens a confirmation dialog on click", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, title: "One" }}>
          <DeleteButton />
        </RecordContextProvider>
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    // The Confirm dialog now shows a Confirm action.
    expect(screen.getByRole("button", { name: /confirm/i })).toBeTruthy();
  });

  it("the confirm button is destructive by default", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, title: "One" }}>
          <DeleteButton />
        </RecordContextProvider>
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(
      screen.getByRole("button", { name: /confirm/i }).dataset.variant,
    ).toBe("destructive");
  });

  it("removes the record through the data provider on confirm", async () => {
    const dataProvider = makeDataProvider();
    render(
      <Providers dataProvider={dataProvider}>
        <RecordContextProvider value={{ id: 1, title: "One" }}>
          <DeleteButton />
        </RecordContextProvider>
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(async () => {
      const { data } = await dataProvider.getList("posts", {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      expect(data.map((r) => r.id)).toEqual([2]);
    });
  });
});
