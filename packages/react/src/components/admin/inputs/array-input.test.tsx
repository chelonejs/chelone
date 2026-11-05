/**
 * P7c-T2 — `<ArrayInput>` ported onto chelone `useArrayInput` +
 * `ArrayInputProvider` (the 4R array binding). Renders the label + error chrome
 * around an embedded-array field and provides the iterator result + row-scoping
 * context to its children (a P7e `<SimpleFormIterator>` consumes them). Verifies
 * the binding wires rows, add/remove/reorder mutate the form array with STABLE
 * row identity (React reuses the moved row's DOM node), and the array-level
 * validation error surfaces via `<ValidationError>`.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
} from "@chelone/core";
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
import { IteratorRowProvider, useIteratorItem } from "../../../array-hooks";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm, useInput } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { ArrayInput } from "./array-input";
import { useArrayInputResult } from "./array-input-context";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    "items.too_short": "Need at least one item",
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

/** Minimal iterator standing in for the P7e `<SimpleFormIterator>`. */
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
  return (
    <div>
      <input
        data-testid={`row-${String(input.field.value)}`}
        data-index={item.index}
        value={String(input.field.value ?? "")}
        onChange={input.field.onChange}
      />
      <button
        type="button"
        data-testid={`remove-${String(input.field.value)}`}
        onClick={() => item.remove()}
      >
        remove
      </button>
    </div>
  );
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
  const view = render(
    <Wrapper>
      <FormHost>{ui}</FormHost>
    </Wrapper>,
  );
  return { view, submitRef };
}

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe("<ArrayInput>", () => {
  it("renders a label and the existing rows", () => {
    setup(
      <ArrayInput source="tags" label="Tags">
        <TestIterator />
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b"] } },
    );
    expect(screen.getByText("Tags")).toBeTruthy();
    expect(screen.getByTestId("row-a")).toBeTruthy();
    expect(screen.getByTestId("row-b")).toBeTruthy();
  });

  it("adds a scalar row and writes it to the form array", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <ArrayInput source="tags">
        <TestIterator />
      </ArrayInput>,
      { defaultValues: { tags: ["a"] }, onData },
    );
    fireEvent.click(screen.getByTestId("add"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["a", ""] });
  });

  it("removes a row and writes the shortened array", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <ArrayInput source="tags">
        <TestIterator />
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b", "c"] }, onData },
    );
    fireEvent.click(screen.getByTestId("remove-b"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["a", "c"] });
  });

  it("preserves the DOM node of a row across a remove (stable row identity)", async () => {
    setup<{ tags: string[] }>(
      <ArrayInput source="tags">
        <TestIterator />
      </ArrayInput>,
      { defaultValues: { tags: ["a", "b", "c"] } },
    );
    const nodeC = screen.getByTestId("row-c");
    fireEvent.click(screen.getByTestId("remove-a"));
    await act(async () => {});
    // Row "c" keeps its DOM node (keyed by row.id, not index) but its index
    // shifts from 2 to 1.
    expect(screen.getByTestId("row-c")).toBe(nodeC);
    expect(nodeC.getAttribute("data-index")).toBe("1");
  });

  it("surfaces an array-level validation error via <ValidationError>", async () => {
    const { submitRef } = setup<{ tags: string[] }>(
      <ArrayInput
        source="tags"
        label="Tags"
        validate={(value) =>
          Array.isArray(value) && value.length > 0
            ? undefined
            : "items.too_short"
        }
      >
        <TestIterator />
      </ArrayInput>,
      { defaultValues: { tags: [] } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Need at least one item",
    );
  });
});
