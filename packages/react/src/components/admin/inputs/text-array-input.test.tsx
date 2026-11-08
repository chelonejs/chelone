/**
 * P7b-T2 — `<TextArrayInput>` edits a `string[]` field: type + Enter adds a
 * tag, Backspace on an empty input removes the last, each tag has a remove (×)
 * button. A single `useInput`-bound field (no array-binding machinery), so it
 * ports as a simple text-like input. Verifies add/remove/backspace + the
 * parsed array written to the form + error surfacing.
 */
import {
  createI18n,
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
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { TextArrayInput } from "./text-array-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    "chelone.action.remove": "Remove",
  }),
};

function makeWrapper() {
  const i18n = createI18n({ locale: "en", messages });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
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

afterEach(() => cleanup());

describe("<TextArrayInput>", () => {
  it("renders a labelled input and the existing tags", () => {
    setup(<TextArrayInput source="tags" />, {
      defaultValues: { tags: ["a", "b"] },
    });
    expect(screen.getByText("Tags").closest("label")).not.toBeNull();
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("b")).toBeTruthy();
  });

  it("adds a tag on Enter and writes the array to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <TextArrayInput source="tags" />,
      { defaultValues: { tags: ["a"] }, onData },
    );
    const input = elementOf(screen.getByLabelText("Tags"), HTMLInputElement);
    fireEvent.change(input, { target: { value: "b" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("b")).toBeTruthy();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["a", "b"] });
  });

  it("removes the last tag on Backspace when the input is empty", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <TextArrayInput source="tags" />,
      { defaultValues: { tags: ["a", "b"] }, onData },
    );
    const input = elementOf(screen.getByLabelText("Tags"), HTMLInputElement);
    fireEvent.keyDown(input, { key: "Backspace" });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["a"] });
  });

  it("removes a tag via its remove button", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <TextArrayInput source="tags" />,
      { defaultValues: { tags: ["a", "b"] }, onData },
    );
    // The first remove button removes "a".
    const [firstRemove] = screen.getAllByRole("button", { name: /remove/i });
    if (!firstRemove) throw new Error("expected a remove button");
    fireEvent.click(firstRemove);
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["b"] });
  });

  it("renders the required marker for a required validator", () => {
    setup(<TextArrayInput source="tags" validate={required()} />, {
      defaultValues: { tags: null },
    });
    expect(screen.getByText("Tags").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ tags: string[] | null }>(
      <TextArrayInput source="tags" validate={required()} />,
      { defaultValues: { tags: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
