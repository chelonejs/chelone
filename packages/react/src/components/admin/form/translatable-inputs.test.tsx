/**
 * `<TranslatableInputs>` edits one field in several locales, one tab per
 * locale: a child `<TextInput source="name" />` binds `name.en` and `name.fr`.
 * Mounted inside a real form host (or `<Edit>` / `<Create>`) and asserted
 * through DOM, roles, the saved form value and data-provider calls.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { TabbedForm, useTabbedFormContext } from "../../../form/tabbed-form";
import { useWizardFormContext, WizardForm } from "../../../form/wizard-form";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { useSaveContext } from "../../../save-context";
import { ArrayInput } from "../inputs/array-input";
import { TextInput } from "../inputs/text-input";
import { Create } from "../views/create";
import { Edit } from "../views/edit";
import { SimpleFormIterator } from "./simple-form-iterator";
import { TranslatableInputs } from "./translatable-inputs";

const baseMessages = {
  "chelone.validation.required": "Required",
  "chelone.action.add": "Add",
  "chelone.action.remove": "Remove",
};

function makeI18n(extra: Record<string, string> = {}) {
  return createI18n({
    locale: "en",
    messages: { en: defineMessages({ ...baseMessages, ...extra }) },
  });
}

/** Mount `ui` inside a real form + provider stack; expose submit. */
function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    messages,
  }: { defaultValues?: TFormData; messages?: Record<string, string> } = {},
) {
  const onData = vi.fn<(data: TFormData) => void>();
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data): Promise<FieldErrors | undefined> => {
        onData(data);
        return undefined;
      },
    });
    submitRef.current = form.submit;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={makeI18n(messages)}
    >
      <FormHost>{ui}</FormHost>
    </CheloneProvider>,
  );
  return {
    async submit() {
      await act(async () => {
        await submitRef.current?.();
      });
      return onData.mock.lastCall?.[0];
    },
  };
}

function resourceProviders(
  dataProvider: ReturnType<typeof fakeDataProvider>,
  children: ReactNode,
  initialEntry: string,
  routePath: string,
) {
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
      i18n={makeI18n()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <ResourceContextProvider value="posts">
              <Routes>
                <Route path={routePath} element={children} />
              </Routes>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

/** The labelled control inside a locale panel, checked as an input. */
function inputInPanel(panelId: string, label: string): HTMLInputElement {
  return elementOf(
    within(panel(panelId)).getByLabelText(label),
    HTMLInputElement,
  );
}

function panel(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no element with id ${id}`);
  return el;
}

/** Radix tabs activate on mouse down, not click. */
function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe("TranslatableInputs", () => {
  it("renders one tab per locale and selects the default locale", () => {
    setup(
      <TranslatableInputs locales={["en", "fr"]}>
        <TextInput source="name" label="Name" />
      </TranslatableInputs>,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["En", "Fr"]);
    expect(
      screen.getByRole("tab", { name: "En" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: "Fr" }).getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("starts on defaultLocale when it is one of the locales", () => {
    setup(
      <TranslatableInputs locales={["en", "fr"]} defaultLocale="fr">
        <TextInput source="name" label="Name" />
      </TranslatableInputs>,
    );
    expect(
      screen.getByRole("tab", { name: "Fr" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("binds a child source to source.locale and loads each locale's value from Edit", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, name: { en: "Hello", fr: "Bonjour" } }],
    });
    render(
      resourceProviders(
        dataProvider,
        <Edit>
          <TranslatableInputs locales={["en", "fr"]}>
            <TextInput source="name" label="Name" />
          </TranslatableInputs>
        </Edit>,
        "/1",
        ":id",
      ),
    );
    await waitFor(() =>
      expect(inputInPanel("translatable-content-en", "Name").value).toBe(
        "Hello",
      ),
    );
    expect(inputInPanel("translatable-content-fr", "Name").value).toBe(
      "Bonjour",
    );
  });

  it("saves typed values for every locale under one field", async () => {
    const { submit } = setup<{ name: { en: string; fr: string } }>(
      <TranslatableInputs locales={["en", "fr"]}>
        <TextInput source="name" label="Name" />
      </TranslatableInputs>,
      { defaultValues: { name: { en: "", fr: "" } } },
    );
    fireEvent.change(
      within(panel("translatable-content-en")).getByLabelText("Name"),
      { target: { value: "Hello" } },
    );
    fireEvent.change(
      within(panel("translatable-content-fr")).getByLabelText("Name"),
      { target: { value: "Bonjour" } },
    );
    expect(await submit()).toEqual({ name: { en: "Hello", fr: "Bonjour" } });
  });

  it("shows only the selected locale's panel and keeps the others mounted", () => {
    setup(
      <TranslatableInputs locales={["en", "fr"]}>
        <TextInput source="name" label="Name" />
      </TranslatableInputs>,
    );
    expect(panel("translatable-content-en").hidden).toBe(false);
    expect(panel("translatable-content-fr").hidden).toBe(true);
    expect(screen.getAllByLabelText("Name")).toHaveLength(2);

    selectTab("Fr");

    expect(panel("translatable-content-en").hidden).toBe(true);
    expect(panel("translatable-content-fr").hidden).toBe(false);
    expect(screen.getAllByLabelText("Name")).toHaveLength(2);
  });

  it("links each panel to its tab and each tab to its panel", () => {
    setup(
      <TranslatableInputs locales={["en", "fr"]}>
        <TextInput source="name" label="Name" />
      </TranslatableInputs>,
    );
    expect(
      panel("translatable-content-fr").getAttribute("aria-labelledby"),
    ).toBe("translatable-header-fr");
    expect(screen.getByRole("tab", { name: "Fr" }).id).toBe(
      "translatable-header-fr",
    );
    const controls = screen
      .getByRole("tab", { name: "Fr" })
      .getAttribute("aria-controls");
    expect(controls).toBe("translatable-content-fr");
    expect(document.getElementById(controls ?? "")).toBe(
      panel("translatable-content-fr"),
    );
  });

  it("marks a locale tab invalid when a hidden input fails validation", async () => {
    const { submit } = setup<{ name: { en: string; fr: string } }>(
      <TranslatableInputs locales={["en", "fr"]}>
        <TextInput source="name" label="Name" validate={required()} />
      </TranslatableInputs>,
      { defaultValues: { name: { en: "Hello", fr: "" } } },
    );
    expect(screen.getByRole("tab", { name: "Fr" }).className).not.toContain(
      "text-destructive",
    );

    expect(await submit()).toBeUndefined();

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Fr" }).className).toContain(
        "text-destructive",
      ),
    );
    expect(screen.getByRole("tab", { name: "En" }).className).not.toContain(
      "text-destructive",
    );
    expect(panel("translatable-content-fr").hidden).toBe(true);
  });

  it("inside a WizardForm step, an empty required translation keeps the wizard on that step", async () => {
    const wizard: { current: ReturnType<typeof useWizardFormContext> | null } =
      { current: null };
    function Capture() {
      wizard.current = useWizardFormContext();
      return null;
    }
    render(
      <CheloneProvider
        dataProvider={fakeDataProvider({})}
        queryClient={new QueryClient()}
        i18n={makeI18n()}
      >
        <WizardForm save={async () => undefined}>
          <Capture />
          <WizardForm.Step name="names">
            <TranslatableInputs locales={["en", "fr"]}>
              <TextInput source="name" label="Name" validate={required()} />
            </TranslatableInputs>
          </WizardForm.Step>
          <WizardForm.Step name="done">
            <div>Done</div>
          </WizardForm.Step>
        </WizardForm>
      </CheloneProvider>,
    );

    await act(async () => {
      await wizard.current?.next();
    });

    expect(wizard.current?.currentStep).toBe(0);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "En" }).className).toContain(
        "text-destructive",
      ),
    );
  });

  it("inside a TabbedForm tab, an invalid translation marks the tab invalid while each locale tab shows only its own validity", async () => {
    const tabbed: { current: ReturnType<typeof useTabbedFormContext> | null } =
      { current: null };
    function Capture() {
      tabbed.current = useTabbedFormContext();
      return null;
    }
    render(
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <CheloneProvider
          dataProvider={fakeDataProvider({})}
          queryClient={new QueryClient()}
          i18n={makeI18n()}
        >
          <TabbedForm
            save={async () => undefined}
            syncWithLocation={false}
            defaultValues={{ name: { en: "Hello", fr: "" } }}
          >
            <Capture />
            <TabbedForm.Tab name="content" label="Content">
              <TranslatableInputs locales={["en", "fr"]}>
                <TextInput source="name" label="Name" validate={required()} />
              </TranslatableInputs>
            </TabbedForm.Tab>
            <TabbedForm.Tab name="other" label="Other">
              <div>Other</div>
            </TabbedForm.Tab>
          </TabbedForm>
        </CheloneProvider>
      </RouterAdapterProvider>,
    );
    expect(document.querySelector("[data-chelone-tab-error]")).toBeNull();

    await act(async () => {
      await tabbed.current?.submit();
    });

    await waitFor(() =>
      expect(
        document.querySelector('[data-chelone-tab-error="content"]'),
      ).not.toBeNull(),
    );
    expect(
      document.querySelector('[data-chelone-tab-error="other"]'),
    ).toBeNull();
    expect(screen.getByRole("tab", { name: "Fr" }).className).toContain(
      "text-destructive",
    );
    expect(screen.getByRole("tab", { name: "En" }).className).not.toContain(
      "text-destructive",
    );
  });

  it("works in Create with no record", async () => {
    const dataProvider = fakeDataProvider({ posts: [] });
    const create = vi.spyOn(dataProvider, "create");
    function Submit() {
      const { save } = useSaveContext();
      return (
        <button type="button" onClick={() => save?.({})}>
          save
        </button>
      );
    }
    render(
      resourceProviders(
        dataProvider,
        <Create>
          <TranslatableInputs locales={["en", "fr"]}>
            <TextInput source="name" label="Name" />
          </TranslatableInputs>
          <Submit />
        </Create>,
        "/",
        "/",
      ),
    );
    fireEvent.change(
      within(panel("translatable-content-en")).getByLabelText("Name"),
      { target: { value: "Hello" } },
    );
    fireEvent.change(
      within(panel("translatable-content-fr")).getByLabelText("Name"),
      { target: { value: "Bonjour" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0]?.[1].data).toMatchObject({
      name: { en: "Hello", fr: "Bonjour" },
    });
  });

  it("labels a tab from chelone.locales when translated and capitalizes the code otherwise", () => {
    setup(
      <TranslatableInputs locales={["en", "fr"]}>
        <TextInput source="name" label="Name" />
      </TranslatableInputs>,
      { messages: { "chelone.locales.en": "English" } },
    );
    expect(screen.getByRole("tab", { name: "English" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Fr" })).toBeTruthy();
  });

  it("selector prop replaces the default tabs", () => {
    setup(
      <TranslatableInputs
        locales={["en", "fr"]}
        selector={<div data-testid="custom-selector" />}
      >
        <TextInput source="name" label="Name" />
      </TranslatableInputs>,
    );
    expect(screen.getByTestId("custom-selector")).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getAllByLabelText("Name")).toHaveLength(2);
  });

  it("groupKey keeps two groups' tab ids apart", () => {
    setup(
      <>
        <TranslatableInputs locales={["en", "fr"]} groupKey="title">
          <TextInput source="title" label="Title" />
        </TranslatableInputs>
        <TranslatableInputs locales={["en", "fr"]} groupKey="body">
          <TextInput source="body" label="Body" />
        </TranslatableInputs>
      </>,
    );
    const ids = screen.getAllByRole("tab").map((tab) => tab.id);
    expect(ids).toEqual([
      "translatable-header-titleen",
      "translatable-header-titlefr",
      "translatable-header-bodyen",
      "translatable-header-bodyfr",
    ]);
    expect(new Set(ids).size).toBe(4);
    expect(
      panel("translatable-content-bodyfr").getAttribute("aria-labelledby"),
    ).toBe("translatable-header-bodyfr");
  });

  it("nested in an ArrayInput row binds items[index].name.locale", async () => {
    const { submit } = setup<{
      items: { name: { en: string; fr: string } }[];
    }>(
      <ArrayInput source="items" label="Items">
        <SimpleFormIterator>
          <TranslatableInputs locales={["en", "fr"]}>
            <TextInput source="name" label="Name" />
          </TranslatableInputs>
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { items: [{ name: { en: "a", fr: "b" } }] } },
    );
    const fr = inputInPanel("translatable-content-fr", "Name");
    expect(fr.value).toBe("b");
    fireEvent.change(fr, { target: { value: "c" } });
    expect(await submit()).toEqual({
      items: [{ name: { en: "a", fr: "c" } }],
    });
  });

  it("an ArrayInput inside it binds its rows under items.locale", async () => {
    const { submit } = setup<{
      items: { en: { name: string }[]; fr: { name: string }[] };
    }>(
      <TranslatableInputs locales={["en", "fr"]}>
        <ArrayInput source="items" label="Items">
          <SimpleFormIterator>
            <TextInput source="name" label="Name" />
          </SimpleFormIterator>
        </ArrayInput>
      </TranslatableInputs>,
      {
        defaultValues: {
          items: { en: [{ name: "a" }], fr: [{ name: "b" }] },
        },
      },
    );
    const fr = inputInPanel("translatable-content-fr", "Name");
    expect(fr.value).toBe("b");
    fireEvent.change(fr, { target: { value: "c" } });
    expect(await submit()).toEqual({
      items: { en: [{ name: "a" }], fr: [{ name: "c" }] },
    });
  });
});
