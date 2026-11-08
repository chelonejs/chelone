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
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
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
        "chelone.page.create": "Create {name}",
      }),
    },
  });
}

function makeDataProvider() {
  const posts: Array<{ id: number; title: string }> = [];
  return fakeDataProvider({ posts });
}

function Providers({
  children,
  dataProvider = makeDataProvider(),
  initialEntries,
  withRouter = true,
}: {
  children: ReactNode;
  dataProvider?: ReturnType<typeof makeDataProvider>;
  initialEntries?: string[];
  withRouter?: boolean;
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
  const resourced = (
    <ResourceContextProvider value="posts">{children}</ResourceContextProvider>
  );
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={makeI18n()}
    >
      <ResourceRegistryProvider registry={registry}>
        {withRouter ? (
          <RouterAdapterProvider adapter={reactRouterAdapter}>
            <MemoryRouter initialEntries={initialEntries}>
              {resourced}
            </MemoryRouter>
          </RouterAdapterProvider>
        ) : (
          resourced
        )}
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
    expect(
      elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
    ).toBe("seed");
  });

  it("renders a heading from the resource label", () => {
    render(
      <Providers>
        <Create>
          <TextInput source="title" />
        </Create>
      </Providers>,
    );
    // chelone.page.create = "Create {name}" and getResourceLabel("posts", 1) = "Post".
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
      const { save } = useSaveContext<{ id: number; title: string }>();
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
      expect(data.some((r) => r.title === "created")).toBe(true);
    });
  });

  it("save forwards its call-time options: meta and onError run", async () => {
    const dataProvider = makeDataProvider();
    const create = vi
      .spyOn(dataProvider, "create")
      .mockRejectedValue(new Error("boom"));
    const onError = vi.fn();
    function Submit() {
      const { save } = useSaveContext<{ id: number; title: string }>();
      return (
        <button
          type="button"
          onClick={() =>
            save?.({ title: "x" }, { meta: { a: 1 }, onError })?.catch(() => {})
          }
        >
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
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({ meta: { a: 1 } }),
    );
  });

  it("validate on <Create> blocks a save that fails it", async () => {
    const dataProvider = makeDataProvider();
    const create = vi.spyOn(dataProvider, "create");
    function Submit() {
      const { save } = useSaveContext<{ id: number; title: string }>();
      return (
        <button type="button" onClick={() => save?.({ title: "" })}>
          save
        </button>
      );
    }
    render(
      <Providers dataProvider={dataProvider}>
        <Create
          validate={(values) =>
            values.title ? undefined : { title: "Title is required" }
          }
        >
          <TextInput source="title" />
          <Submit />
        </Create>
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await screen.findByText("Title is required");
    expect(create).not.toHaveBeenCalled();
  });

  it("onSuccess on <Create> reads the latest render, not the first", async () => {
    const seen: string[] = [];
    function Submit() {
      const { save } = useSaveContext<{ id: number; title: string }>();
      return (
        <button type="button" onClick={() => save?.({ title: "created" })}>
          save
        </button>
      );
    }
    function Page() {
      const [target, setTarget] = useState("first");
      return (
        <>
          <button type="button" onClick={() => setTarget("second")}>
            retarget
          </button>
          <Create onSuccess={() => void seen.push(target)}>
            <TextInput source="title" />
            <Submit />
          </Create>
        </>
      );
    }
    render(
      <Providers>
        <Page />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "retarget" }));
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(seen).toEqual(["second"]));
  });

  it("onSuccess added to <Create> after mount is called", async () => {
    const seen: string[] = [];
    function Submit() {
      const { save } = useSaveContext<{ id: number; title: string }>();
      return (
        <button type="button" onClick={() => save?.({ title: "created" })}>
          save
        </button>
      );
    }
    function Page() {
      const [listening, setListening] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setListening(true)}>
            listen
          </button>
          <Create
            onSuccess={listening ? () => void seen.push("saved") : undefined}
          >
            <TextInput source="title" />
            <Submit />
          </Create>
        </>
      );
    }
    render(
      <Providers>
        <Page />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "listen" }));
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(seen).toEqual(["saved"]));
  });
});

describe("<Create> location seed", () => {
  const cloneUrl = (record: unknown) =>
    `/posts/create?source=${encodeURIComponent(JSON.stringify(record))}`;
  const titleValue = () =>
    elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value;

  it("seeds the form from the source search param", () => {
    render(
      <Providers initialEntries={[cloneUrl({ title: "cloned" })]}>
        <Create>
          <TextInput source="title" />
        </Create>
      </Providers>,
    );
    expect(titleValue()).toBe("cloned");
  });

  it("location keys win over the record prop", () => {
    render(
      <Providers initialEntries={[cloneUrl({ title: "from url" })]}>
        <Create record={{ title: "from prop", body: "kept" }}>
          <TextInput source="title" />
          <TextInput source="body" />
        </Create>
      </Providers>,
    );
    expect(titleValue()).toBe("from url");
    expect(
      elementOf(screen.getByLabelText(/body/i), HTMLInputElement).value,
    ).toBe("kept");
  });

  it("a malformed source param leaves the form empty", () => {
    render(
      <Providers initialEntries={["/posts/create?source={oops"]}>
        <Create>
          <TextInput source="title" />
        </Create>
      </Providers>,
    );
    expect(titleValue()).toBe("");
  });

  it("renders without a router adapter", () => {
    render(
      <Providers withRouter={false}>
        <Create record={{ title: "seed" }}>
          <TextInput source="title" />
        </Create>
      </Providers>,
    );
    expect(titleValue()).toBe("seed");
  });
});
