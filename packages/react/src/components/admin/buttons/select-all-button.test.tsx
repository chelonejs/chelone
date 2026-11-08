/**
 * Tests: `<SelectAllButton>` labels. A real `useListController("posts")` over a
 * `fakeDataProvider` feeds a `ListContextProvider`, and every row of the page is
 * selected so the button is visible. Pins the three label paths: a literal label
 * renders as written, the default key falls back to "Select all", and a
 * registered key renders its translation.
 */

import {
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, useEffect, useRef } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { useListController } from "../../../controller-hooks";
import { ListContextProvider } from "../../../form";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { SelectAllButton } from "./select-all-button";

afterEach(cleanup);

const messages = {
  "chelone.action.select_all": "Take the whole list",
  "app.pick_all": "Every row on this page",
};

/** The live list, with the page's ids selected so the button shows. */
function ListInner({
  children,
  selectedIds,
  perPage,
}: {
  children: ReactNode;
  selectedIds: number[];
  perPage: number;
}) {
  const list = useListController("posts", { perPage });
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && selectedIds.length > 0 && list.data) {
      seeded.current = true;
      list.select(selectedIds);
    }
  }, [list, selectedIds]);
  return <ListContextProvider value={list}>{children}</ListContextProvider>;
}

function Harness({
  children,
  registered,
  selectedIds,
  perPage = 2,
}: {
  children: ReactNode;
  /** Which of `messages` this mount registers; an empty object registers none. */
  registered: Record<string, string>;
  selectedIds: number[];
  perPage?: number;
}) {
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
      dataProvider={fakeDataProvider({
        posts: [
          { id: 1, title: "One" },
          { id: 2, title: "Two" },
          { id: 3, title: "Three" },
          { id: 4, title: "Four" },
          { id: 5, title: "Five" },
        ],
      })}
      queryClient={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages(registered) },
      })}
      notifications={createNotificationStore()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/posts"]}>
            <ResourceContextProvider value="posts">
              <ListInner perPage={perPage} selectedIds={selectedIds}>
                {children}
              </ListInner>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<SelectAllButton>", () => {
  it("renders a literal label as given", async () => {
    render(
      <Harness registered={{}} selectedIds={[1, 2]}>
        <SelectAllButton label="Pick every row" />
      </Harness>,
    );
    expect(
      await screen.findByRole("button", { name: "Pick every row" }),
    ).toBeTruthy();
  });

  it("falls back to 'Select all' for the default key with no catalog entry", async () => {
    render(
      <Harness registered={{}} selectedIds={[1, 2]}>
        <SelectAllButton />
      </Harness>,
    );
    expect(
      await screen.findByRole("button", { name: "Select all" }),
    ).toBeTruthy();
  });

  it("renders the translation of a registered key", async () => {
    render(
      <Harness registered={messages} selectedIds={[1, 2]}>
        <SelectAllButton />
        <SelectAllButton label="app.pick_all" />
      </Harness>,
    );
    expect(
      await screen.findByRole("button", { name: "Take the whole list" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Every row on this page" }),
    ).toBeTruthy();
  });

  it("renders a non-string label as given", async () => {
    render(
      <Harness registered={{}} selectedIds={[1, 2]}>
        <SelectAllButton label={<em>Pick every row</em>} />
      </Harness>,
    );
    const button = await screen.findByRole("button", {
      name: "Pick every row",
    });
    expect(button.querySelector("em")?.textContent).toBe("Pick every row");
  });
});
