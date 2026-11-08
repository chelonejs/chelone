/**
 * `<ConfigurableInputs>` mounted the way an app does: inside `<Edit>`, under a
 * real provider stack with an `<Inspector>` around it. Assertions are on DOM,
 * roles, the store and data-provider calls; jsdom applies no CSS.
 */

import {
  createI18n,
  createResourceRegistry,
  createStore,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import {
  listCentre,
  mousePointerEvent,
  stubListDragDom,
} from "@chelone/test-utils/drag-dom";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  getConfig,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../resource";
import { RouterAdapterProvider } from "../../router/adapter";
import { reactRouterAdapter } from "../../router/react-router-adapter";
import { SaveButton } from "../admin/buttons/save-button";
import { TextInput } from "../admin/inputs/text-input";
import { Edit } from "../admin/views/edit";
import { ConfigurableInputs } from "./configurable-inputs";
import { Inspector } from "./inspector";
import { InspectorButton } from "./inspector-button";

afterEach(cleanup);

const messages = defineMessages({
  "chelone.action.save": "Save",
  "resources.posts.fields.title": "Headline",
});

interface MountOptions {
  inputs: ReactNode;
  store?: ReturnType<typeof createStore>;
  dataProvider?: ReturnType<typeof fakeDataProvider>;
}

function Providers({
  children,
  store,
  dataProvider,
}: {
  children: ReactNode;
  store: ReturnType<typeof createStore>;
  dataProvider: ReturnType<typeof fakeDataProvider>;
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
      dataProvider={dataProvider}
      queryClient={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
      i18n={createI18n({ locale: "en", messages: { en: messages } })}
      store={store}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/1"]}>
            <ResourceContextProvider value="posts">
              <Inspector>
                <Routes>
                  <Route path=":id" element={children} />
                </Routes>
              </Inspector>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

function mount({
  inputs,
  store = createStore(),
  dataProvider = fakeDataProvider({
    posts: [{ id: 1, title: "Alpha", views: 3, author: "Ada" }],
  }),
}: MountOptions) {
  const page = (
    <Edit>
      <InspectorButton />
      {inputs}
      <SaveButton />
    </Edit>
  );
  const view = render(
    <Providers store={store} dataProvider={dataProvider}>
      {page}
    </Providers>,
  );
  return { store, dataProvider, view };
}

const inputs = [
  <TextInput key="title" source="title" />,
  <TextInput key="views" source="views" />,
  <TextInput key="author" source="author" />,
];

/** The values of the text inputs on the page, in document order. */
const values = () =>
  screen
    .queryAllByRole("textbox")
    .map((el) => (el instanceof HTMLInputElement ? el.value : ""));
const rowLabels = () =>
  Array.from(document.querySelectorAll("[data-slot=fields-selector-row]")).map(
    (row) => row.querySelector("[role=switch]")?.getAttribute("aria-label"),
  );
const switchFor = (name: string) =>
  screen.getByRole("switch", { name, hidden: true });

async function openPanel() {
  fireEvent.click(
    await screen.findByRole("button", { name: "Configure mode" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Customize" }));
  return within(screen.getByRole("dialog", { name: "Form" }));
}

describe("<ConfigurableInputs>", () => {
  it("renders every input in declared order with no stored choice", async () => {
    mount({ inputs: <ConfigurableInputs>{inputs}</ConfigurableInputs> });
    await screen.findByDisplayValue("Alpha");
    expect(values()).toEqual(["Alpha", "3", "Ada"]);
  });

  it("the selector in the panel lists the inputs by label", async () => {
    mount({ inputs: <ConfigurableInputs>{inputs}</ConfigurableInputs> });
    await screen.findByDisplayValue("Alpha");
    await openPanel();
    expect(rowLabels()).toEqual(["Headline", "Views", "Author"]);
  });

  it("hiding an input unmounts it and showing it puts it back in place", async () => {
    mount({ inputs: <ConfigurableInputs>{inputs}</ConfigurableInputs> });
    await screen.findByDisplayValue("Alpha");
    await openPanel();

    fireEvent.click(switchFor("Views"));
    expect(values()).toEqual(["Alpha", "Ada"]);
    expect(screen.queryByDisplayValue("3")).toBeNull();

    fireEvent.click(switchFor("Views"));
    expect(values()).toEqual(["Alpha", "3", "Ada"]);
  });

  describe("moving an input", () => {
    const layout = {
      rowSelector: "[data-slot=fields-selector-row]",
      rowHeight: 40,
    };
    const grip = (index: number) =>
      defined(
        screen.getAllByRole("button", { name: "Drag to reorder" })[index],
      );
    const pointer = (
      target: Element | Document,
      type: "pointerdown" | "pointermove" | "pointerup",
      at: { x: number; y: number },
    ) => fireEvent(target, mousePointerEvent(type, at));
    /** Real time outside `act`, which holds back the renders dnd-kit waits for. */
    const wait = (ms: number) =>
      getConfig().asyncWrapper(
        () => new Promise<void>((resolve) => setTimeout(resolve, ms)),
      );

    beforeEach(() => stubListDragDom(layout));
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("moving an input by button or by drag changes the render order and survives a remount", async () => {
      const first = mount({
        inputs: <ConfigurableInputs>{inputs}</ConfigurableInputs>,
      });
      await screen.findByDisplayValue("Alpha");
      const panel = await openPanel();

      fireEvent.click(
        panel.getByRole("button", { name: "Move down Headline" }),
      );
      await waitFor(() => expect(values()).toEqual(["3", "Alpha", "Ada"]));
      expect(rowLabels()).toEqual(["Views", "Headline", "Author"]);

      // Drag Views, the first row, onto the last.
      const from = listCentre(grip(0), layout);
      pointer(grip(0), "pointerdown", from);
      pointer(document, "pointermove", { x: from.x + 10, y: from.y });
      await waitFor(() =>
        expect(document.querySelector("[data-dragging]")).not.toBeNull(),
      );
      // Off the last row's exact centre: a zero distance has no ranking.
      const over = { x: 150, y: 2 * layout.rowHeight + 30 };
      pointer(document, "pointermove", over);
      await wait(100);
      pointer(document, "pointerup", over);
      await waitFor(() => expect(values()).toEqual(["Alpha", "Ada", "3"]));

      first.view.unmount();
      mount({
        inputs: <ConfigurableInputs>{inputs}</ConfigurableInputs>,
        store: first.store,
      });
      await screen.findByDisplayValue("Alpha");
      expect(values()).toEqual(["Alpha", "Ada", "3"]);
    });
  });

  it("defaultHiddenInputs hides inputs until a choice is stored", async () => {
    mount({
      inputs: (
        <ConfigurableInputs defaultHiddenInputs={["views"]}>
          {inputs}
        </ConfigurableInputs>
      ),
    });
    await screen.findByDisplayValue("Alpha");
    expect(values()).toEqual(["Alpha", "Ada"]);

    await openPanel();
    expect(switchFor("Views").getAttribute("aria-checked")).toBe("false");
    fireEvent.click(switchFor("Author"));
    // Hiding one stores the choice, which now wins over the default.
    expect(values()).toEqual(["Alpha"]);
    fireEvent.click(switchFor("Views"));
    expect(values()).toEqual(["Alpha", "3"]);
  });

  it("an input with no source is listed as input-<index>", async () => {
    mount({
      inputs: (
        <ConfigurableInputs>
          <TextInput source="title" />
          <p>A note</p>
        </ConfigurableInputs>
      ),
    });
    await screen.findByText("A note");
    await openPanel();
    expect(rowLabels()).toEqual(["Headline", "input-1"]);

    fireEvent.click(switchFor("input-1"));
    expect(screen.queryByText("A note")).toBeNull();
  });

  it("saves the visible inputs through the data provider", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha", views: 3, author: "Ada" }],
    });
    const update = vi.spyOn(dataProvider, "update");
    mount({
      dataProvider,
      inputs: <ConfigurableInputs>{inputs}</ConfigurableInputs>,
    });
    await screen.findByDisplayValue("Alpha");
    await openPanel();
    fireEvent.click(switchFor("Author"));
    fireEvent.change(screen.getByDisplayValue("Alpha"), {
      target: { value: "Beta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    // The hidden input is unmounted, but the record keeps its loaded value.
    expect(update).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        id: "1",
        data: expect.objectContaining({
          title: "Beta",
          views: 3,
          author: "Ada",
        }),
      }),
    );
  });
});
