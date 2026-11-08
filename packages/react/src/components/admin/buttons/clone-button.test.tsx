/**
 * `<CloneButton>` — links to the create page with the record (minus its id) in
 * `?source=`; `<Create>` reads it back, so the form opens pre-filled.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
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
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import {
  Admin,
  Create,
  Edit,
  Resource,
  SaveButton,
  TextInput,
} from "../../../index";
import { RecordContextProvider } from "../../../record/record-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { CloneButton } from "./clone-button";

afterEach(cleanup);

const baseAuth = (over: Partial<AuthProvider> = {}): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  ...over,
});

function Providers({
  children,
  authProvider,
  messages = {},
}: {
  children: ReactNode;
  authProvider?: AuthProvider;
  messages?: Record<string, string>;
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
      dataProvider={fakeDataProvider({})}
      queryClient={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
      authProvider={authProvider}
      i18n={createI18n({
        locale: "en",
        messages: {
          en: defineMessages({ "chelone.action.clone": "Clone", ...messages }),
        },
      })}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            <ResourceContextProvider value="posts">
              {children}
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<CloneButton>", () => {
  it("links to the create page with the record minus its id in the source param", () => {
    render(
      <Providers>
        <CloneButton record={{ id: 7, title: "A & B", tags: ["x"] }} />
      </Providers>,
    );
    const href = screen
      .getByRole("link", { name: "Clone" })
      .getAttribute("href");
    const url = new URL(href ?? "", "http://localhost");
    expect(url.pathname).toBe("/posts/create");
    expect(JSON.parse(url.searchParams.get("source") ?? "")).toEqual({
      title: "A & B",
      tags: ["x"],
    });
    expect(href).toContain(
      `source=${encodeURIComponent('{"title":"A & B","tags":["x"]}')}`,
    );
  });

  it("renders nothing without a record id", () => {
    // Wire-shaped on purpose: a record off the wire can have no id.
    const noId = JSON.parse('{"title":"no id"}');
    render(
      <Providers>
        <CloneButton record={noId} />
        <RecordContextProvider value={undefined}>
          <CloneButton />
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("hides when create access is denied and shows when access control is unconfigured", async () => {
    const denied = render(
      <Providers authProvider={baseAuth({ canAccess: async () => false })}>
        <CloneButton record={{ id: 1, title: "a" }} />
      </Providers>,
    );
    await waitFor(() => expect(screen.queryByRole("link")).toBeNull());
    denied.unmount();

    render(
      <Providers authProvider={baseAuth()}>
        <CloneButton record={{ id: 1, title: "a" }} />
      </Providers>,
    );
    expect(screen.getByRole("link", { name: "Clone" })).toBeTruthy();
  });

  it("uses a resource-specific label key before the default", () => {
    render(
      <Providers
        messages={{ "resources.posts.action.clone": "Duplicate post" }}
      >
        <CloneButton record={{ id: 1, title: "a" }} />
      </Providers>,
    );
    expect(screen.getByRole("link", { name: "Duplicate post" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Clone" })).toBeNull();
  });

  it("clicking it does not reach a parent click handler", () => {
    const onParentClick = vi.fn();
    render(
      <Providers>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: stands in for a clickable table row */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: same */}
        <div onClick={onParentClick}>
          <CloneButton record={{ id: 1, title: "a" }} />
        </div>
      </Providers>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Clone" }));
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("cloning from the edit page pre-fills Create and saving calls create without an id", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha" }],
    });
    const create = vi.spyOn(dataProvider, "create");
    render(
      <MemoryRouter initialEntries={["/posts/1"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
          i18n={createI18n({
            locale: "en",
            messages: {
              en: defineMessages({
                "chelone.action.clone": "Clone",
                "chelone.action.save": "Save",
                "chelone.page.create": "Create {name}",
              }),
            },
          })}
          notifications={createNotificationStore()}
        >
          <Resource
            name="posts"
            edit={() => (
              <Edit actions={<CloneButton />}>
                <TextInput source="title" />
              </Edit>
            )}
            create={() => (
              <Create>
                <TextInput source="title" />
                <SaveButton />
              </Create>
            )}
          />
        </Admin>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("link", { name: "Clone" }));

    const title = elementOf(
      await screen.findByLabelText(/title/i),
      HTMLInputElement,
    );
    await waitFor(() => expect(title.value).toBe("Alpha"));

    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    const params = create.mock.calls[0]?.[1];
    expect(params?.data).toEqual({ title: "Alpha" });
  });
});
