/**
 * `<ArrayInputRow>` — one iterator row inside an `<ArrayInput>`: scopes its
 * children under `${source}[${index}]` and renders remove + reorder controls
 * wired to the ambient array input. `<ArrayInput>` renders the add button.
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
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeArrayRow } from "../../../__fixtures__/array-row";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { ArrayInput } from "./array-input";
import { useArrayInputResult } from "./array-input-context";
import { ArrayInputRow } from "./array-input-row";
import { TextInput } from "./text-input";

const messages = {
  en: defineMessages({
    "chelone.action.add": "Add",
    "orders.add_item": "Add an item",
    "chelone.action.remove": "Remove",
    "chelone.action.move_up": "Move up",
    "chelone.action.move_down": "Move down",
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

/** Maps the ambient array's rows to `<ArrayInputRow>`s around `children`. */
function Rows({ children }: { children: ReactNode }) {
  const array = useArrayInputResult();
  return array.rows.map((row) => (
    <ArrayInputRow key={row.id} row={row}>
      {children}
    </ArrayInputRow>
  ));
}

function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    onData,
  }: {
    defaultValues?: TFormData;
    onData?: (data: TFormData) => void;
  } = {},
) {
  const Wrapper = makeWrapper();
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data): Promise<FieldErrors | undefined> => {
        onData?.(data);
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
  return { submitRef };
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

describe("<ArrayInputRow>", () => {
  it("a nested input binds items[0].sku", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ items: { sku: string }[] }>(
      <ArrayInput source="items" label="Items">
        <Rows>
          <TextInput source="sku" label="SKU" />
        </Rows>
      </ArrayInput>,
      { defaultValues: { items: [{ sku: "a-1" }, { sku: "b-2" }] }, onData },
    );
    const skus = inputsByLabel("SKU");
    expect(skus.map((el) => el.value)).toEqual(["a-1", "b-2"]);

    fireEvent.change(nth(skus, 0), { target: { value: "z-9" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({
      items: [{ sku: "z-9" }, { sku: "b-2" }],
    });
  });

  it("add, remove and reorder change the form value", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <ArrayInput source="tags" label="Tags">
        <Rows>
          <TextInput source="" label="Tag" />
        </Rows>
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b", "c"] }, onData },
    );
    const submit = async () => {
      await act(async () => {
        await submitRef.current?.();
      });
      return onData.mock.lastCall?.[0];
    };

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await submit()).toEqual({ tags: ["a", "b", "c", ""] });

    // Move "b" (row 1) down, then the new last row has no move-down.
    fireEvent.click(
      nth(screen.getAllByRole("button", { name: "Move down" }), 1),
    );
    expect(await submit()).toEqual({ tags: ["a", "c", "b", ""] });
    const down = buttonsNamed("Move down");
    expect(nth(down, 3).disabled).toBe(true);

    // Move "b" (row 2) up.
    fireEvent.click(nth(screen.getAllByRole("button", { name: "Move up" }), 2));
    expect(await submit()).toEqual({ tags: ["a", "b", "c", ""] });
    const up = buttonsNamed("Move up");
    expect(nth(up, 0).disabled).toBe(true);

    fireEvent.click(nth(screen.getAllByRole("button", { name: "Remove" }), 0));
    expect(await submit()).toEqual({ tags: ["b", "c", ""] });
  });

  it("translates a string addLabel", () => {
    setup(
      <ArrayInput source="tags" addLabel="orders.add_item">
        <Rows>
          <TextInput source="" label="Tag" />
        </Rows>
      </ArrayInput>,
      { defaultValues: { tags: [] } },
    );
    expect(screen.getByRole("button", { name: "Add an item" })).toBeTruthy();
  });

  it("throws outside an <ArrayInput>", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      setup(
        <ArrayInputRow row={fakeArrayRow({ id: "r", index: 0 })}>
          x
        </ArrayInputRow>,
      ),
    ).toThrow();
    spy.mockRestore();
  });
});
