/**
 * P7e-T2 tests: `<Edit>` — the edit-page shell.
 *
 * Wires `useEditForm` (id from the route params) → publishes `EditContext` +
 * `SaveContext` + `RecordContext(record)` + the ambient `CheloneFormProvider`.
 * Asserts: the fetched record hydrates the form inputs, the title resolves from
 * the record representation, the contexts are published, and saving persists an
 * update through the data provider.
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
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useEditContext } from "../../../record-view-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { useSaveContext } from "../../../save-context";
import { TextInput } from "../inputs/text-input";
import { Edit } from "./edit";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.edit": "Edit",
      }),
    },
  });
}

function makeDataProvider() {
  return fakeDataProvider({
    posts: [{ id: 1, title: "Original" }],
  });
}

function Providers({
  children,
  dataProvider = makeDataProvider(),
  path = ":id",
  entry = "/1",
}: {
  children: ReactNode;
  path?: string;
  entry?: string;
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
          <MemoryRouter initialEntries={[entry]}>
            <ResourceContextProvider value="posts">
              <Routes>
                <Route path={path} element={children} />
              </Routes>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("<Edit>", () => {
  it("hydrates form inputs from the fetched record", async () => {
    render(
      <Providers>
        <Edit>
          <TextInput source="title" />
        </Edit>
      </Providers>,
    );
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Original"),
    );
  });

  it("renders a heading from the record representation", async () => {
    render(
      <Providers>
        <Edit>
          <TextInput source="title" />
        </Edit>
      </Providers>,
    );
    // Default representation prefers `title` → "Original".
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Original" })).toBeTruthy(),
    );
  });

  it("publishes an EditContext with the record + a SaveContext", async () => {
    const seen: { title?: string; resource?: string; hasSave?: boolean } = {};
    function Probe() {
      const edit = useEditContext<{ id: number; title: string }>();
      const save = useSaveContext();
      seen.title = edit.record?.title;
      seen.resource = edit.resource;
      seen.hasSave = typeof save.save === "function";
      return null;
    }
    render(
      <Providers>
        <Edit>
          <Probe />
          <TextInput source="title" />
        </Edit>
      </Providers>,
    );
    await waitFor(() => expect(seen.title).toBe("Original"));
    expect(seen.resource).toBe("posts");
    expect(seen.hasSave).toBe(true);
  });

  it("persists an update through the save handler", async () => {
    const dataProvider = makeDataProvider();
    function Submit() {
      const { save } = useSaveContext<{ id: number; title: string }>();
      return (
        <button type="button" onClick={() => save?.({ title: "Updated" })}>
          save
        </button>
      );
    }
    render(
      <Providers dataProvider={dataProvider}>
        <Edit>
          <TextInput source="title" />
          <Submit />
        </Edit>
      </Providers>,
    );
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Original"),
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(async () => {
      const { data } = await dataProvider.getOne("posts", { id: 1 });
      expect(data).toMatchObject({ title: "Updated" });
    });
  });
  it("save forwards its call-time options: transform, meta and onSuccess run", async () => {
    const dataProvider = makeDataProvider();
    const update = vi.spyOn(dataProvider, "update");
    const onSuccess = vi.fn();
    function Submit() {
      const { save } = useSaveContext<{ id: number; title: string }>();
      return (
        <button
          type="button"
          onClick={() =>
            save?.(
              { title: "x" },
              {
                transform: (data) => ({ ...data, title: "transformed" }),
                meta: { a: 1 },
                onSuccess,
              },
            )
          }
        >
          save
        </button>
      );
    }
    render(
      <Providers dataProvider={dataProvider}>
        <Edit>
          <TextInput source="title" />
          <Submit />
        </Edit>
      </Providers>,
    );
    await screen.findByDisplayValue("Original");
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        data: expect.objectContaining({ title: "transformed" }),
        meta: { a: 1 },
      }),
    );
  });

  it("validate on <Edit> blocks a save that fails it", async () => {
    const dataProvider = makeDataProvider();
    const update = vi.spyOn(dataProvider, "update");
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
        <Edit
          validate={(values) =>
            values.title ? undefined : { title: "Title is required" }
          }
        >
          <TextInput source="title" />
          <Submit />
        </Edit>
      </Providers>,
    );
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Original"),
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await screen.findByText("Title is required");
    expect(update).not.toHaveBeenCalled();
  });

  it("validate on <Edit> reads the latest render, not the first", async () => {
    const dataProvider = makeDataProvider();
    const update = vi.spyOn(dataProvider, "update");
    function Submit() {
      const { save } = useSaveContext<{ id: number; title: string }>();
      return (
        <button type="button" onClick={() => save?.({ title: "Next" })}>
          save
        </button>
      );
    }
    function Page() {
      const [strict, setStrict] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setStrict(true)}>
            strict
          </button>
          <Edit validate={() => (strict ? { title: "Too strict" } : undefined)}>
            <TextInput source="title" />
            <Submit />
          </Edit>
        </>
      );
    }
    render(
      <Providers dataProvider={dataProvider}>
        <Page />
      </Providers>,
    );
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Original"),
    );
    fireEvent.click(screen.getByRole("button", { name: "strict" }));
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await screen.findByText("Too strict");
    expect(update).not.toHaveBeenCalled();
  });

  it("validate added to <Edit> after mount blocks a save", async () => {
    const dataProvider = makeDataProvider();
    const update = vi.spyOn(dataProvider, "update");
    function Submit() {
      const { save } = useSaveContext<{ id: number; title: string }>();
      return (
        <button type="button" onClick={() => save?.({ title: "Next" })}>
          save
        </button>
      );
    }
    function Page() {
      const [strict, setStrict] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setStrict(true)}>
            strict
          </button>
          <Edit validate={strict ? () => ({ title: "Too strict" }) : undefined}>
            <TextInput source="title" />
            <Submit />
          </Edit>
        </>
      );
    }
    render(
      <Providers dataProvider={dataProvider}>
        <Page />
      </Providers>,
    );
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Original"),
    );
    fireEvent.click(screen.getByRole("button", { name: "strict" }));
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await screen.findByText("Too strict");
    expect(update).not.toHaveBeenCalled();
  });

  it("Edit throws without an id prop or a route id", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      expect(() =>
        render(
          <Providers path="/" entry="/">
            <Edit />
          </Providers>,
        ),
      ).toThrow(/Edit.*`id`.*`:id`/);
    } finally {
      consoleError.mockRestore();
    }
  });
});
