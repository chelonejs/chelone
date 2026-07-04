/**
 * P7e-T2 tests: `<Create>` — the create-page shell.
 *
 * Wires `useCreateForm` → publishes `CreateContext` + `SaveContext` +
 * `RecordContext(seed)` + the ambient `CheloneFormProvider`, so a bare
 * `<TextInput>` child binds to the form. Asserts: the form renders, the seed
 * record flows to inputs, submitting persists a new record via the data
 * provider, and the title resolves.
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
import { useCreateContext } from "../../../record-view-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { useSaveContext } from "../../../save-context";
import { TextInput } from "../inputs/text-input";
import { Create } from "./create";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "ra.page.create": "Create {name}",
      }),
    },
  });
}

function makeDataProvider() {
  return fakeDataProvider({
    posts: [] as Array<{ id: number; title: string }>,
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

describe("<Create>", () => {
  it("renders form children bound to the ambient form", () => {
    render(
      <Providers>
        <Create>
          <TextInput source="title" />
        </Create>
      </Providers>,
    );
    // The input renders (bound to the form via CheloneFormProvider).
    expect(screen.getByLabelText(/title/i)).toBeTruthy();
  });

  it("seeds inputs from the record prop via RecordContext", () => {
    render(
      <Providers>
        <Create record={{ title: "seed" }}>
          <TextInput source="title" />
        </Create>
      </Providers>,
    );
    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe(
      "seed",
    );
  });

  it("renders a heading from the resource label", () => {
    render(
      <Providers>
        <Create>
          <TextInput source="title" />
        </Create>
      </Providers>,
    );
    // ra.page.create = "Create {name}" and getResourceLabel("posts", 1) = "Post".
    expect(screen.getByRole("heading", { name: /create post/i })).toBeTruthy();
  });

  it("publishes a CreateContext + SaveContext to descendants", () => {
    const seen: { resource?: string; hasSave?: boolean } = {};
    function Probe() {
      const create = useCreateContext();
      const save = useSaveContext();
      seen.resource = create.resource;
      seen.hasSave = typeof save.save === "function";
      return null;
    }
    render(
      <Providers>
        <Create>
          <Probe />
          <TextInput source="title" />
        </Create>
      </Providers>,
    );
    expect(seen.resource).toBe("posts");
    expect(seen.hasSave).toBe(true);
  });

  it("persists a new record through the save handler", async () => {
    const dataProvider = makeDataProvider();
    function Submit() {
      const { save } = useSaveContext();
      return (
        <button type="button" onClick={() => save?.({ title: "created" })}>
          save
        </button>
      );
    }
    render(
      <Providers dataProvider={dataProvider}>
        <Create>
          <TextInput source="title" />
          <Submit />
        </Create>
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(async () => {
      const { data } = await dataProvider.getList("posts", {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      expect(
        data.some((r) => (r as { title?: string }).title === "created"),
      ).toBe(true);
    });
  });
});
