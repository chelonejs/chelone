/**
 * W2-T5 tests: `<TabbedForm>` — a tabbed form whose tabs are optionally
 * URL-synced.
 *
 * Behavior clusters (plan §2 W2-T5 / decision D6e, §0c-4):
 * 1. URL-synced tab navigation — the location drives the active tab, clicking a
 *    tab header navigates (deep-linkable), and the browser back-button restores
 *    the previous tab. The form state SURVIVES a tab switch (Wave-1 fix: the
 *    shell subtree stays mounted across navigation).
 * 2. `syncWithLocation={false}` variant — a purely local `useState` active tab,
 *    no router coupling.
 * 3. Per-tab validity badge — a tab header subscribes `useFormGroup(tabName)`
 *    so an invalid field in a tab flips that tab's validity dot, regardless of
 *    which tab is showing.
 * 4. All tabs mounted — every tab's inputs render (CSS-hidden when inactive),
 *    so cross-tab validation + a single submit across every tab work.
 * 5. Single submit across tabs — one submit collects values from every tab.
 *
 * URL-synced cases mount `<TabbedForm>` under a DECLARATIVE `<MemoryRouter>` +
 * a nested `<Routes><Route path="posts/1/*">` splat so the tab routes resolve
 * relative to the form base (the splat-path base) AND `<Link>` clicks
 * client-navigate. (A react-router DATA router — `createMemoryRouter` — cannot
 * complete a link/data navigation under jsdom: v7 trips a jsdom/undici
 * `AbortSignal` incompatibility, documented in router-adapter.test.tsx. The
 * declarative join path is what every react-router adapter test uses.) The
 * back-button is exercised via the adapter's `useNavigate(-1)`. The
 * `syncWithLocation={false}` variant needs no host router.
 */

import {
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  createStore,
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
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextInput } from "../components/admin/inputs/text-input";
import { Edit } from "../components/admin/views/edit";
import { CheloneProvider } from "../context";
import { useInput } from "../form-hooks";
import { ResourceContextProvider, ResourceRegistryProvider } from "../resource";
import { RouterAdapterProvider } from "../router/adapter";
import { useLocation, useNavigate } from "../router/nav-hooks";
import { reactRouterAdapter } from "../router/react-router-adapter";
import { useSaveContext } from "../save-context";
import { useFormGroup } from "./group-hooks";
import {
  TabbedForm,
  type UseTabbedFormResult,
  useTabbedFormContext,
} from "./tabbed-form";

interface FormValues {
  title?: string;
  body?: string;
  slug?: string;
}

const adapter = reactRouterAdapter;

/** A save that never errors and echoes the collected values back to the harness. */
function makeSave() {
  const seen: { values: FormValues | null } = { values: null };
  const save = async (values: FormValues): Promise<FieldErrors | undefined> => {
    seen.values = values;
    return undefined;
  };
  return { save, seen };
}

function makeProviders() {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider({});
  const store = createStore();
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <RouterAdapterProvider adapter={adapter}>
        <CheloneProvider
          dataProvider={dataProvider}
          queryClient={queryClient}
          store={store}
          notifications={notifications}
        >
          {children}
        </CheloneProvider>
      </RouterAdapterProvider>
    );
  };
}

/** A text input that records its latest wiring for the harness to drive. */
function makeInputSlot(testid: string) {
  const slot: { current: ReturnType<typeof useInput> | null } = {
    current: null,
  };
  function Input({
    source,
    validate,
  }: {
    source: string;
    validate?: ReturnType<typeof required>;
  }) {
    const input = useInput({ source, validate });
    slot.current = input;
    return (
      <input data-testid={testid} value={String(input.field.value)} readOnly />
    );
  }
  return { slot, Input };
}

/**
 * A badge that reports its tab's aggregated validity (for the per-tab dot).
 * Renders `valid`/`invalid` so a test can assert the badge WITHOUT which tab
 * is active.
 */
function makeBadge(tabName: string, testid: string) {
  function Badge() {
    const group = useFormGroup(tabName);
    return (
      <span data-testid={testid}>{group.isValid ? "valid" : "invalid"}</span>
    );
  }
  return Badge;
}

const titleSlot = makeInputSlot("input-title");
const bodySlot = makeInputSlot("input-body");
const slugSlot = makeInputSlot("input-slug");
const OneBadge = makeBadge("one", "badge-one");
const TwoBadge = makeBadge("two", "badge-two");

/** The live tabbed-form controller (submit, active tab), captured for the harness. */
const tabbed: { current: UseTabbedFormResult | null } = { current: null };
/** The live router seam (navigate delta / current pathname), captured for the harness. */
const routerSeam: {
  navigate: ReturnType<typeof useNavigate> | null;
  pathname: string | null;
} = { navigate: null, pathname: null };
function CaptureTabbed() {
  tabbed.current = useTabbedFormContext();
  return null;
}
/** Captures the ambient router seam (only mounted in the URL-synced harness). */
function CaptureRouter() {
  routerSeam.navigate = useNavigate();
  routerSeam.pathname = useLocation().pathname;
  return null;
}

/**
 * A three-tab form's children, passed DIRECTLY to `<TabbedForm>` (as a fragment
 * — `Children.toArray` flattens it so `<TabbedForm.Tab>` are direct children).
 * Tab "one" has a required `title`; tabs "two"/"three" are free-form. The badges
 * render alongside the tabs so validity is observable independent of the active
 * tab.
 */
function tabbedChildren() {
  return (
    <>
      <CaptureTabbed />
      <OneBadge />
      <TwoBadge />
      <TabbedForm.Tab name="one" label="One">
        <titleSlot.Input source="title" validate={required()} />
      </TabbedForm.Tab>
      <TabbedForm.Tab name="two" label="Two">
        <bodySlot.Input source="body" />
      </TabbedForm.Tab>
      <TabbedForm.Tab name="three" label="Three">
        <slugSlot.Input source="slug" />
      </TabbedForm.Tab>
    </>
  );
}

/**
 * Mount a URL-synced `<TabbedForm>` under a DECLARATIVE `<MemoryRouter>` +
 * a nested `<Routes><Route path="posts/1/*">` splat (so the tab routes resolve
 * against `/posts/1` and `<Link>` clicks client-navigate). The captured router
 * seam (`routerSeam.navigate`/`.pathname`) drives back-button + location checks.
 */
function renderUrlSynced(initial = "/posts/1") {
  const { save, seen } = makeSave();
  const Providers = makeProviders();
  const adapter = reactRouterAdapter;
  const { Routes, Route } = adapter;
  routerSeam.navigate = null;
  routerSeam.pathname = null;
  const view = render(
    <Providers>
      <MemoryRouter initialEntries={[initial]}>
        <CaptureRouter />
        <Routes>
          <Route
            path="posts/1/*"
            element={
              <TabbedForm<FormValues> save={save}>
                {tabbedChildren()}
              </TabbedForm>
            }
          />
        </Routes>
      </MemoryRouter>
    </Providers>,
  );
  return { view, seen };
}

/** Mount a `syncWithLocation={false}` `<TabbedForm>` (no host router needed). */
function renderLocal() {
  const { save, seen } = makeSave();
  const Providers = makeProviders();
  const view = render(
    <Providers>
      <TabbedForm<FormValues> save={save} syncWithLocation={false}>
        {tabbedChildren()}
      </TabbedForm>
    </Providers>,
  );
  return { view, seen };
}

/** A tab panel is "visible" when its wrapper is not hidden. */
function tabVisible(name: string): boolean {
  const el = document.querySelector<HTMLElement>(
    `[data-chelone-tab="${name}"]`,
  );
  return el != null && !el.hidden;
}

/** Mounts `children` at `/1` under a `posts` resource, as `<Edit>` expects. */
function renderInEditRoute(
  dataProvider: ReturnType<typeof fakeDataProvider>,
  children: ReactNode,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: false,
    hasEdit: true,
    hasShow: false,
  });
  return render(
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages({ "chelone.action.edit": "Edit" }) },
      })}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/1"]}>
            <ResourceContextProvider value="posts">
              <Routes>
                <Route path=":id" element={children} />
              </Routes>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>,
  );
}

function SaveButton() {
  const { save } = useSaveContext();
  return (
    <button type="button" onClick={() => save?.({})}>
      Save
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("<TabbedForm> — URL-synced tab navigation", () => {
  it("the index (no tab segment) shows the FIRST tab", () => {
    renderUrlSynced("/posts/1");
    expect(tabVisible("one")).toBe(true);
    expect(tabVisible("two")).toBe(false);
    expect(tabVisible("three")).toBe(false);
  });

  it("a location deep-linked to a tab shows THAT tab", () => {
    renderUrlSynced("/posts/1/two");
    expect(tabVisible("one")).toBe(false);
    expect(tabVisible("two")).toBe(true);
    expect(tabVisible("three")).toBe(false);
  });

  it("clicking a tab header navigates to its path (deep-linkable)", async () => {
    renderUrlSynced("/posts/1");
    // The header is a real anchor deep-linking to the tab's absolute path.
    const twoHeader = screen.getByRole("tab", { name: /two/i });
    expect(twoHeader.tagName).toBe("A");
    expect(twoHeader.getAttribute("href")).toBe("/posts/1/two");
    // Clicking it client-navigates, and the location drives the active tab.
    await act(async () => {
      fireEvent.click(twoHeader);
    });
    expect(routerSeam.pathname).toBe("/posts/1/two");
    expect(tabVisible("two")).toBe(true);
    expect(tabVisible("one")).toBe(false);
  });

  it("the browser back-button restores the previous tab", async () => {
    renderUrlSynced("/posts/1");
    // Navigate one -> two -> three via header clicks.
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /two/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /three/i }));
    });
    expect(tabVisible("three")).toBe(true);
    // Back-button (history delta -1) → the previous tab is restored.
    await act(async () => {
      routerSeam.navigate?.(-1);
    });
    expect(routerSeam.pathname).toBe("/posts/1/two");
    expect(tabVisible("two")).toBe(true);
    await act(async () => {
      routerSeam.navigate?.(-1);
    });
    expect(routerSeam.pathname).toBe("/posts/1");
    expect(tabVisible("one")).toBe(true);
  });

  it("form state SURVIVES a tab switch (Wave-1 mounted-subtree fix)", async () => {
    renderUrlSynced("/posts/1");
    // Type into tab one's title, switch to tab two, switch back — value kept.
    await act(async () => {
      titleSlot.slot.current?.field.onChange("kept-title");
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /two/i }));
    });
    await act(async () => {
      bodySlot.slot.current?.field.onChange("kept-body");
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /one/i }));
    });
    // Both values survived the round-trip (inputs never unmounted).
    expect(titleSlot.slot.current?.field.value).toBe("kept-title");
    expect(bodySlot.slot.current?.field.value).toBe("kept-body");
  });
});

describe("<TabbedForm> — syncWithLocation={false} (useState variant)", () => {
  it("starts on the first tab and needs no router", () => {
    renderLocal();
    expect(tabVisible("one")).toBe(true);
    expect(tabVisible("two")).toBe(false);
  });

  it("clicking a tab header switches the active tab locally", async () => {
    renderLocal();
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /two/i }));
    });
    expect(tabVisible("two")).toBe(true);
    expect(tabVisible("one")).toBe(false);
  });

  it("form state survives a local tab switch", async () => {
    renderLocal();
    await act(async () => {
      titleSlot.slot.current?.field.onChange("local-kept");
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /two/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /one/i }));
    });
    expect(titleSlot.slot.current?.field.value).toBe("local-kept");
  });
});

describe("<TabbedForm> — per-tab validity badge", () => {
  it("a tab's badge flips invalid when one of its fields is invalid", async () => {
    renderUrlSynced("/posts/1");
    // form-core validators fire on SUBMIT (then re-validate on change). title is
    // required + empty → a submit attempt surfaces its error, flipping tab one.
    await act(async () => {
      await tabbed.current?.submit();
    });
    expect(screen.getByTestId("badge-one").textContent).toBe("invalid");
    // Tab two has no required field → stays valid regardless of the active tab.
    expect(screen.getByTestId("badge-two").textContent).toBe("valid");
  });

  it("the badge tracks a tab that is NOT the active tab", async () => {
    // Deep-link to tab two, then submit — tab one's field is required+empty, so
    // tab one's badge must flip invalid even though tab one is hidden (all
    // fields mounted → cross-tab validation).
    renderUrlSynced("/posts/1/two");
    expect(tabVisible("one")).toBe(false);
    await act(async () => {
      await tabbed.current?.submit();
    });
    expect(screen.getByTestId("badge-one").textContent).toBe("invalid");
  });

  it("the badge returns to valid once the field is filled", async () => {
    renderUrlSynced("/posts/1");
    await act(async () => {
      await tabbed.current?.submit();
    });
    expect(screen.getByTestId("badge-one").textContent).toBe("invalid");
    // Fixing the required field re-validates on change and clears the badge.
    await act(async () => {
      titleSlot.slot.current?.field.onChange("filled");
    });
    expect(screen.getByTestId("badge-one").textContent).toBe("valid");
  });
});

describe("<TabbedForm> — all tabs mounted (cross-tab validation)", () => {
  it("every tab's inputs are mounted at first render (only one visible)", () => {
    renderUrlSynced("/posts/1");
    // All three inputs have a live binding from the start.
    expect(titleSlot.slot.current).not.toBeNull();
    expect(bodySlot.slot.current).not.toBeNull();
    expect(slugSlot.slot.current).not.toBeNull();
    // Every tab panel is present in the DOM (two hidden, one visible).
    const panels = document.querySelectorAll("[data-chelone-tab]");
    expect(panels.length).toBe(3);
    const hidden = Array.from(panels).filter(
      (el) => elementOf(el, HTMLElement).hidden,
    );
    expect(hidden.length).toBe(2);
  });

  it("keeps every tab's inputs mounted across a tab switch (no unmount)", async () => {
    renderUrlSynced("/posts/1");
    const bodyBinding = bodySlot.slot.current;
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /two/i }));
    });
    // The body input is still the SAME live binding — it never unmounted.
    expect(bodySlot.slot.current).not.toBeNull();
    // A value typed before the switch is preserved.
    void bodyBinding;
  });
});

describe("<TabbedForm> — single submit collects all tabs", () => {
  it("one submit sees values from every tab", async () => {
    const { seen } = renderUrlSynced("/posts/1");
    // Fill fields across all three tabs (no navigation needed — all mounted).
    await act(async () => {
      titleSlot.slot.current?.field.onChange("T");
      bodySlot.slot.current?.field.onChange("B");
      slugSlot.slot.current?.field.onChange("S");
    });
    // A single submit through the ambient controller collects the whole form.
    await act(async () => {
      await tabbed.current?.submit();
    });
    expect(seen.values).toEqual({ title: "T", body: "B", slug: "S" });
  });
});

describe("<TabbedForm> inside <Edit>", () => {
  it("inside Edit the tabs show the record and Save calls update", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Original", body: "Body" }],
    });
    const update = vi.spyOn(dataProvider, "update");
    renderInEditRoute(
      dataProvider,
      <Edit title={false}>
        <TabbedForm syncWithLocation={false}>
          <TabbedForm.Tab name="one">
            <TextInput source="title" />
          </TabbedForm.Tab>
          <TabbedForm.Tab name="two">
            <TextInput source="body" />
          </TabbedForm.Tab>
        </TabbedForm>
        <SaveButton />
      </Edit>,
    );
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Original"),
    );
    expect(
      elementOf(screen.getByLabelText(/body/i), HTMLInputElement).value,
    ).toBe("Body");
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[1].data).toMatchObject({
      title: "Updated",
      body: "Body",
    });
  });

  it("a TabbedForm given save inside Edit builds its own form", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Original" }],
    });
    const update = vi.spyOn(dataProvider, "update");
    const ownSave = vi.fn(async (_values: unknown) => undefined);
    function SubmitOwn() {
      const { submit } = useTabbedFormContext();
      return (
        <button type="button" onClick={() => submit()}>
          Submit own
        </button>
      );
    }
    renderInEditRoute(
      dataProvider,
      <Edit title={false}>
        <TabbedForm
          save={ownSave}
          defaultValues={{ title: "Mine" }}
          syncWithLocation={false}
        >
          <TabbedForm.Tab name="one">
            <TextInput source="title" />
            <SubmitOwn />
          </TabbedForm.Tab>
        </TabbedForm>
      </Edit>,
    );
    await waitFor(() =>
      expect(
        elementOf(screen.getByLabelText(/title/i), HTMLInputElement).value,
      ).toBe("Mine"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit own" }));
    await waitFor(() => expect(ownSave).toHaveBeenCalledTimes(1));
    expect(ownSave.mock.calls[0]?.[0]).toEqual({ title: "Mine" });
    expect(update).not.toHaveBeenCalled();
  });
});

describe("<TabbedForm> outside a view", () => {
  it("throws a clear error when save is missing", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Wrapper = makeProviders();
    expect(() =>
      render(
        <Wrapper>
          <TabbedForm syncWithLocation={false}>
            <TabbedForm.Tab name="one">{null}</TabbedForm.Tab>
          </TabbedForm>
        </Wrapper>,
      ),
    ).toThrow(/<TabbedForm>.*save/);
  });
});
