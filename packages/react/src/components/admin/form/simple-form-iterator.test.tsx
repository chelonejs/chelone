/**
 * `<SimpleFormIterator>` — the ready-made `<ArrayInput>` iterator: one `<li>`
 * per row scoped under `${source}[${index}]`, with add, remove, reorder and a
 * confirmed clear. Mounted inside a real form host, asserted through DOM, roles
 * and the saved form value.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { ArrayInput } from "../inputs/array-input";
import { useArrayInputResult } from "../inputs/array-input-context";
import { TextInput } from "../inputs/text-input";
import {
  AddItemButton,
  RemoveItemButton,
  SimpleFormIterator,
} from "./simple-form-iterator";

const messages = {
  en: defineMessages({
    "chelone.action.add": "Add",
    "chelone.action.remove": "Remove",
    "chelone.action.move_up": "Move up",
    "chelone.action.move_down": "Move down",
    "chelone.action.clear_array_input": "Clear the array",
    "chelone.message.clear_array_input":
      "Are you sure you want to clear the whole array?",
    "chelone.action.confirm": "Confirm",
    "chelone.action.cancel": "Cancel",
  }),
};

function makeWrapper() {
  const i18n = createI18n({ locale: "en", messages });
  const registry = createResourceRegistry();
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        {children}
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  { defaultValues }: { defaultValues?: TFormData } = {},
) {
  const onData = vi.fn<(data: TFormData) => void>();
  const Wrapper = makeWrapper();
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
    <Wrapper>
      <FormHost>{ui}</FormHost>
    </Wrapper>,
  );
  return {
    /** Submits the form and returns the value it saved. */
    async submit() {
      await act(async () => {
        await submitRef.current?.();
      });
      return onData.mock.lastCall?.[0];
    },
  };
}

/** Every control labelled `label`, checked as an input. */
function inputsByLabel(label: string): HTMLInputElement[] {
  return screen
    .getAllByLabelText(label)
    .map((el) => elementOf(el, HTMLInputElement));
}

/** Every button named `name`, checked as a button. */
function buttonsNamed(name: string): HTMLButtonElement[] {
  return screen
    .getAllByRole("button", { name })
    .map((el) => elementOf(el, HTMLButtonElement));
}

function nth<T>(list: readonly T[], index: number): T {
  const item = list[index];
  if (item === undefined) throw new Error(`no item at ${index}`);
  return item;
}

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe("SimpleFormIterator", () => {
  it("renders one row per item and binds each row's inputs under items[index]", async () => {
    const { submit } = setup<{ items: { sku: string }[] }>(
      <ArrayInput source="items" label="Items">
        <SimpleFormIterator>
          <TextInput source="sku" label="SKU" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { items: [{ sku: "a-1" }, { sku: "b-2" }] } },
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const skus = inputsByLabel("SKU");
    expect(skus.map((el) => el.value)).toEqual(["a-1", "b-2"]);
    expect(within(nth(rows, 1)).getByLabelText("SKU")).toBe(nth(skus, 1));

    fireEvent.change(nth(skus, 1), { target: { value: "z-9" } });
    expect(await submit()).toEqual({
      items: [{ sku: "a-1" }, { sku: "z-9" }],
    });
  });

  it("shows a single Add button that appends a row", async () => {
    const { submit } = setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <SimpleFormIterator>
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { tags: ["a"] } },
    );
    expect(screen.getAllByRole("button", { name: "Add" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(await submit()).toEqual({ tags: ["a", ""] });
  });

  it("remove drops the row and keeps the others in order", async () => {
    const { submit } = setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <SimpleFormIterator>
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b", "c"] } },
    );
    fireEvent.click(nth(screen.getAllByRole("button", { name: "Remove" }), 1));
    expect(inputsByLabel("Tag").map((el) => el.value)).toEqual(["a", "c"]);
    expect(await submit()).toEqual({ tags: ["a", "c"] });
  });

  it("reorder buttons move a row and disable at the ends", async () => {
    const { submit } = setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <SimpleFormIterator>
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b", "c"] } },
    );
    expect(nth(buttonsNamed("Move up"), 0).disabled).toBe(true);
    expect(nth(buttonsNamed("Move up"), 1).disabled).toBe(false);
    expect(nth(buttonsNamed("Move down"), 2).disabled).toBe(true);
    expect(nth(buttonsNamed("Move down"), 1).disabled).toBe(false);

    fireEvent.click(nth(buttonsNamed("Move down"), 0));
    expect(await submit()).toEqual({ tags: ["b", "a", "c"] });
    fireEvent.click(nth(buttonsNamed("Move up"), 2));
    expect(await submit()).toEqual({ tags: ["b", "c", "a"] });
    expect(nth(buttonsNamed("Move down"), 2).disabled).toBe(true);
  });

  it("clear asks for confirmation and empties the array only on confirm", async () => {
    const { submit } = setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <SimpleFormIterator>
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b"] } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear the array" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(
        "Are you sure you want to clear the whole array?",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(2);

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(2);
    expect(await submit()).toEqual({ tags: ["a", "b"] });

    fireEvent.click(screen.getByRole("button", { name: "Clear the array" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Confirm",
      }),
    );
    await act(async () => {});
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "Clear the array" }),
    ).toBeNull();
    expect(await submit()).toEqual({ tags: [] });
  });

  it("disableAdd, disableRemove, disableReordering and disabled hide their controls", () => {
    const cases = [
      { props: { disableAdd: true }, hidden: ["Add"], shown: ["Remove"] },
      {
        props: { disableRemove: true },
        hidden: ["Remove", "Clear the array"],
        shown: ["Add", "Move up"],
      },
      {
        props: { disableClear: true },
        hidden: ["Clear the array"],
        shown: ["Add", "Remove"],
      },
      {
        props: { disableReordering: true },
        hidden: ["Move up", "Move down"],
        shown: ["Add", "Remove", "Clear the array"],
      },
      {
        props: { disabled: true },
        hidden: ["Add", "Remove", "Move up", "Move down", "Clear the array"],
        shown: [],
      },
    ];
    for (const { props, hidden, shown } of cases) {
      setup<{ tags: string[] }>(
        <ArrayInput source="tags" label="Tags">
          <SimpleFormIterator {...props}>
            <TextInput source="" label="Tag" />
          </SimpleFormIterator>
        </ArrayInput>,
        { defaultValues: { tags: ["a", "b"] } },
      );
      for (const name of hidden) {
        expect(screen.queryByRole("button", { name })).toBeNull();
      }
      for (const name of shown) {
        expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(
          0,
        );
      }
      cleanup();
    }
  });

  it("disableRemove as a function hides remove for matching rows only", () => {
    setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <SimpleFormIterator disableRemove={(index) => index === 0}>
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b", "c"] } },
    );
    const rows = screen.getAllByRole("listitem");
    expect(
      within(nth(rows, 0)).queryByRole("button", { name: "Remove" }),
    ).toBeNull();
    expect(
      within(nth(rows, 1)).getByRole("button", { name: "Remove" }),
    ).toBeTruthy();
    expect(
      within(nth(rows, 2)).getByRole("button", { name: "Remove" }),
    ).toBeTruthy();
  });

  it("getItemLabel renders a label per row", () => {
    setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <SimpleFormIterator getItemLabel={(index) => `Tag #${index + 10}`}>
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b"] } },
    );
    const rows = screen.getAllByRole("listitem");
    expect(within(nth(rows, 0)).getByText("Tag #10")).toBeTruthy();
    expect(within(nth(rows, 1)).getByText("Tag #11")).toBeTruthy();
    cleanup();

    setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <SimpleFormIterator getItemLabel>
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b"] } },
    );
    const numbered = screen.getAllByRole("listitem");
    expect(within(nth(numbered, 0)).getByText("1")).toBeTruthy();
    expect(within(nth(numbered, 1)).getByText("2")).toBeTruthy();
  });

  it("custom addButton and removeButton replace the defaults", async () => {
    const { submit } = setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <SimpleFormIterator
          addButton={<AddItemButton label="Add a tag" />}
          removeButton={<RemoveItemButton className="custom-remove" />}
        >
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b"] } },
    );
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add a tag" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);

    const removes = screen.getAllByRole("button", { name: "Remove" });
    expect(removes.every((el) => el.classList.contains("custom-remove"))).toBe(
      true,
    );
    fireEvent.click(nth(removes, 0));
    expect(await submit()).toEqual({ tags: ["b", ""] });
  });

  it("uses the ArrayInput addLabel for its Add button, translated when it is a key", () => {
    setup<{ tags: string[]; more: string[] }>(
      <>
        <ArrayInput source="tags" label="Tags" addLabel="Add a tag">
          <SimpleFormIterator>
            <TextInput source="" label="Tag" />
          </SimpleFormIterator>
        </ArrayInput>
        <ArrayInput source="more" label="More" addLabel="chelone.action.remove">
          <SimpleFormIterator>
            <TextInput source="" label="Tag" />
          </SimpleFormIterator>
        </ArrayInput>
      </>,
      { defaultValues: { tags: [], more: [] } },
    );
    expect(screen.getAllByRole("button", { name: "Add a tag" })).toHaveLength(
      1,
    );
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
    // A string label is translated, as the built-in button does.
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
  });

  it("keeps focus on the same input after a reorder", () => {
    setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <SimpleFormIterator>
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b", "c"] } },
    );
    const first = nth(inputsByLabel("Tag"), 0);
    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.click(
      nth(screen.getAllByRole("button", { name: "Move down" }), 0),
    );
    const inputs = inputsByLabel("Tag");
    expect(inputs.map((el) => el.value)).toEqual(["b", "a", "c"]);
    expect(nth(inputs, 1)).toBe(first);
    expect(document.activeElement).toBe(first);
  });
});

describe("ArrayInput without SimpleFormIterator", () => {
  it("still renders its own Add button", () => {
    function Rows() {
      const { rows } = useArrayInputResult();
      return <p>{rows.length} rows</p>;
    }
    function Wrapped() {
      return (
        <SimpleFormIterator>
          <TextInput source="" label="Tag" />
        </SimpleFormIterator>
      );
    }
    setup(
      <>
        <ArrayInput source="tags" label="Plain">
          <Rows />
        </ArrayInput>
        <ArrayInput source="more" label="Wrapped">
          <Wrapped />
        </ArrayInput>
      </>,
      { defaultValues: { tags: [], more: [] } },
    );
    // Plain iterator: the built-in button. Wrapped iterator: the built-in one
    // plus the iterator's own, because the marker is not on a direct child.
    expect(screen.getAllByRole("button", { name: "Add" })).toHaveLength(3);
  });
});
