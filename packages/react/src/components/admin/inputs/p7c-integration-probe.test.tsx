/**
 * P7c CHOICE/REFERENCE-INPUT INTEGRATION PROBE — proves the ported choice,
 * reference, and array inputs work END-TO-END together, exercising the seams
 * the per-input specs test in isolation.
 *
 * What this probe pins that the per-input specs do not:
 *  - (a) A `<SelectInput>` with INLINE choices, mounted alongside a reference
 *    input and an array input in ONE real form, renders + selects a value that
 *    lands on `form.store.state.values` at its own `source` (the actual stored
 *    shape read back off the store — not an `onData` submit snapshot).
 *  - (b) A `<ReferenceInput>` against `fakeDataProvider` (1) fetches its choices
 *    from the referenced resource, (2) resolves the SELECTED record for the
 *    current FK value via the controller, and (3) drives a SERVER-SIDE filtered
 *    `getList` when the user types into the autocomplete (isFromReference →
 *    `setFilters`). AND a NON-ID `lookupKey` reference resolves the selected
 *    record via a `getList({ filter: { [lookupKey]: value } })` (the P6
 *    `useReferenceInput` non-id path), NOT `getMany`.
 *  - (c) An `<ArrayInput>` add / remove / REORDER mutates the form array with
 *    STABLE row identity: the moved row keeps its exact DOM node across a
 *    reorder (React reuses the fiber by `row.id`, not index). Reorder is NOT
 *    covered by the per-input array spec (which pins remove only); it is the
 *    harder identity case and the one an iterator's drag-reorder relies on.
 *  - (d) A choice input's failing validator surfaces its message THROUGH
 *    `<ValidationError>` as a TRANSLATED string — not `[object Object]`, not a
 *    raw `@@react-admin@@`-prefixed key, not the untranslated catalog key.
 *
 * The (b) reference-resolution and (c) row-identity assertions are
 * mutation-verified for non-vacuity (see p7c-probe.md): breaking the impl turns
 * them RED; reverting turns them green.
 *
 * jsdom applies no CSS: assert DOM structure/roles/values/stored-shape and
 * behavior only, never visual styling.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
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
import { afterEach, describe, expect, it, vi } from "vitest";
import { IteratorRowProvider, useIteratorItem } from "../../../array-hooks";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm, useInput } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { ArrayInput } from "./array-input";
import { useArrayInputResult } from "./array-input-context";
import { ReferenceInput } from "./reference-input";
import { SelectInput } from "./select-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "This field is required",
    // chelone's `translate` echoes the key on a miss (no polyglot `_` default),
    // so the autocomplete's search-box placeholder needs a real catalog entry to
    // render "Search..." rather than the raw `chelone.action.search` key.
    "chelone.action.search": "Search...",
    "chelone.navigation.no_results": "No matching item found.",
  }),
};

const authorRecords = [
  { id: 1, name: "Alice", code: "AL" },
  { id: 2, name: "Bob", code: "BO" },
  { id: 3, name: "Carol", code: "CA" },
];

function makeProviders() {
  const i18n = createI18n({ locale: "en", messages });
  const dataProvider = fakeDataProvider({
    authors: structuredClone(authorRecords),
    posts: [],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "authors",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  const Providers = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        {children}
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
  return { Providers, dataProvider };
}

/** The live FormApi, typed as `useForm` returns it. */
interface FormRef<TFormData> {
  current: ReturnType<typeof useForm<TFormData>>["form"] | null;
}

/**
 * Mount arbitrary inputs inside one real form + provider stack. Exposes the
 * submit pipeline and the live FormApi so a test can read `form.store` directly.
 */
function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    onData,
    providers = makeProviders(),
  }: {
    defaultValues?: TFormData;
    onData?: (data: TFormData) => void;
    providers?: ReturnType<typeof makeProviders>;
  } = {},
) {
  const { Providers } = providers;
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  const formRef: FormRef<TFormData> = { current: null };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data): Promise<FieldErrors | undefined> => {
        onData?.(data);
        return undefined;
      },
    });
    submitRef.current = form.submit;
    formRef.current = form.form;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  const view = render(
    <Providers>
      <FormHost>{ui}</FormHost>
    </Providers>,
  );
  return { view, submitRef, formRef, dataProvider: providers.dataProvider };
}

/** Read the live stored value at `source` off the form store. */
function storeValue<TFormData extends Record<string, unknown>>(
  formRef: FormRef<TFormData>,
  source: string,
): unknown {
  return formRef.current?.store.state.values[source];
}

// --- Array iterator + scalar row (minimal P7e `<SimpleFormIterator>` stand-in) ---

function TestIterator() {
  const array = useArrayInputResult();
  return (
    <div>
      {array.rows.map((row) => (
        <IteratorRowProvider key={row.id} row={row}>
          <ScalarRow />
        </IteratorRowProvider>
      ))}
      <button type="button" data-testid="add" onClick={() => array.add()}>
        add
      </button>
    </div>
  );
}

function ScalarRow() {
  const item = useIteratorItem();
  const input = useInput({ source: "" });
  const value = String(input.field.value ?? "");
  return (
    <div>
      <input
        data-testid={`row-${value}`}
        data-index={item.index}
        value={value}
        onChange={input.field.onChange}
      />
      <button
        type="button"
        data-testid={`remove-${value}`}
        onClick={() => item.remove()}
      >
        remove
      </button>
      <button
        type="button"
        data-testid={`up-${value}`}
        onClick={() => item.reOrder(item.index - 1)}
      >
        up
      </button>
    </div>
  );
}

const categoryChoices = [
  { id: "tech", name: "Tech" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "people", name: "People" },
];

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe("P7c choice/reference/array integration probe", () => {
  it("(a) an inline-choices SelectInput selects a value into form.store, alongside a reference + array input", () => {
    const { formRef } = setup(
      <>
        <SelectInput source="category" choices={categoryChoices} />
        <ReferenceInput source="author_id" reference="authors" />
        <ArrayInput source="tags">
          <TestIterator />
        </ArrayInput>
      </>,
      { defaultValues: { category: "", author_id: null, tags: ["a"] } },
    );

    // The inline-choices select renders its own labelled trigger.
    expect(screen.getByText("Category")).toBeTruthy();

    // Open it (there are two comboboxes on the page — the select and the
    // reference autocomplete; scope to the field labelled "Category" so we grab
    // the SELECT trigger, not the reference autocomplete's).
    const categoryField = screen
      .getByText("Category")
      .closest("[data-slot='field']");
    if (!(categoryField instanceof HTMLElement)) {
      throw new Error("no field wrapper for the Category select");
    }
    fireEvent.click(within(categoryField).getByRole("combobox"));

    // Pick "People" → the ORIGINAL-typed id lands on the store at `category`.
    fireEvent.click(screen.getByRole("option", { name: "People" }));
    expect(storeValue(formRef, "category")).toBe("people");

    // The sibling inputs are untouched by the select write.
    expect(storeValue(formRef, "author_id")).toBeNull();
    expect(storeValue(formRef, "tags")).toEqual(["a"]);
  });

  it("(b) a ReferenceInput fetches choices, resolves the selected record, and filters server-side on type", async () => {
    const providers = makeProviders();
    const getListSpy = vi.spyOn(providers.dataProvider, "getList");
    setup(<ReferenceInput source="author_id" reference="authors" />, {
      defaultValues: { author_id: 2 },
      providers,
    });

    // The selected record (author 2 = Bob) is resolved onto the trigger.
    await waitFor(() => {
      expect(screen.getByRole("combobox").textContent).toContain("Bob");
    });

    // Open the autocomplete → all reference records list as choices. The cmdk
    // search box mounts inside the Radix popover; wait for it to appear (its
    // placeholder is the `chelone.action.search` catalog entry defined above).
    fireEvent.click(screen.getByRole("combobox"));
    const searchBox = await screen.findByPlaceholderText("Search...");
    await waitFor(() => {
      const listbox = screen.getByRole("listbox");
      expect(listbox.textContent).toContain("Alice");
      expect(listbox.textContent).toContain("Carol");
    });

    // Typing into the search box drives a SERVER-SIDE filtered getList
    // (isFromReference → debounced setFilters → controller refetch with the `q`
    // filter).
    getListSpy.mockClear();
    fireEvent.change(searchBox, { target: { value: "Ali" } });
    await waitFor(
      () => {
        expect(
          getListSpy.mock.calls.some(
            ([, params]) => params?.filter?.q === "Ali",
          ),
        ).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  it("(b') a non-id lookupKey ReferenceInput resolves the selected record via a getList filter, not getMany", async () => {
    const providers = makeProviders();
    const getListSpy = vi.spyOn(providers.dataProvider, "getList");
    const getManySpy = vi.spyOn(providers.dataProvider, "getMany");
    setup(
      <ReferenceInput
        source="author_code"
        reference="authors"
        lookupKey="code"
      />,
      { defaultValues: { author_code: "BO" }, providers },
    );

    // The non-id lookupKey resolves the selected record through a getList
    // filtered on the lookupKey (`code`), NOT a getMany([id]) call.
    await waitFor(() => {
      expect(
        getListSpy.mock.calls.some(
          ([, params]) => params?.filter?.code === "BO",
        ),
      ).toBe(true);
    });
    // The selected-record resolution never used getMany (the id path).
    expect(
      getManySpy.mock.calls.some(([, params]) => params?.ids?.includes("BO")),
    ).toBe(false);
  });

  it("(c) an ArrayInput adds/removes/reorders rows with STABLE identity (the reordered row keeps its DOM node)", async () => {
    const { formRef } = setup<{ tags: string[] }>(
      <ArrayInput source="tags">
        <TestIterator />
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b", "c"] } },
    );

    // Add: a new empty scalar row lands on the array.
    fireEvent.click(screen.getByTestId("add"));
    await act(async () => {});
    expect(storeValue(formRef, "tags")).toEqual(["a", "b", "c", ""]);

    // Remove the empty row we just added → back to the three seeded rows.
    fireEvent.click(screen.getByTestId("remove-"));
    await act(async () => {});
    expect(storeValue(formRef, "tags")).toEqual(["a", "b", "c"]);

    // Capture row "c"'s exact DOM node, then move it UP one position.
    const nodeC = screen.getByTestId("row-c");
    expect(nodeC.getAttribute("data-index")).toBe("2");
    fireEvent.click(screen.getByTestId("up-c"));
    await act(async () => {});

    // The array order changed in the store...
    expect(storeValue(formRef, "tags")).toEqual(["a", "c", "b"]);
    // ...and row "c" kept its EXACT DOM node (keyed by row.id, not index) while
    // its index shifted 2 → 1. This is the stable-identity guarantee a
    // drag-reorder relies on to preserve focus/DOM state.
    expect(screen.getByTestId("row-c")).toBe(nodeC);
    expect(nodeC.getAttribute("data-index")).toBe("1");
  });

  it("(d) a choice input's validation error surfaces THROUGH <ValidationError> as a translated string", async () => {
    const { submitRef } = setup<{ category: string }>(
      <SelectInput
        source="category"
        choices={categoryChoices}
        validate={required()}
      />,
      { defaultValues: { category: "" } },
    );

    // Pristine → no error shown.
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => {
      await submitRef.current?.();
    });

    const alert = screen.getByRole("alert");
    const text = alert.textContent ?? "";
    // Load-bearing: the TRANSLATED message, NOT the object/raw key/untranslated key.
    expect(text).toBe("This field is required");
    expect(text).not.toContain("[object Object]");
    expect(text).not.toContain("@@react-admin@@");
    expect(text).not.toContain("chelone.validation.required");
  });
});
