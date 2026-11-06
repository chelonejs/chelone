/**
 * P7c-T1 — `<CheckboxGroupInput>` ported onto chelone `useChoicesContext` +
 * `useChoices` + `useInput` + `ui/checkbox` + `ui/field` + `<ValidationError>`.
 * The form value is an array of choice ids. Verifies checkboxes render, toggling
 * adds/removes from the array, the required marker, and error surfacing.
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
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { CheckboxGroupInput } from "./checkbox-group-input";

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
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

const choices = [
  { id: "tech", name: "Tech" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "people", name: "People" },
];

afterEach(() => cleanup());

describe("<CheckboxGroupInput>", () => {
  it("renders a checkbox per choice", () => {
    setup(<CheckboxGroupInput source="tags" choices={choices} label="Tags" />, {
      defaultValues: { tags: [] },
    });
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByLabelText("Tech")).toBeTruthy();
  });

  it("reflects an array default value as checked boxes", () => {
    setup(<CheckboxGroupInput source="tags" choices={choices} />, {
      defaultValues: { tags: ["tech", "people"] },
    });
    expect(
      elementOf(screen.getByLabelText("Tech"), HTMLButtonElement).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
    expect(
      elementOf(
        screen.getByLabelText("Lifestyle"),
        HTMLButtonElement,
      ).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("adds a value to the array when a box is checked", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <CheckboxGroupInput source="tags" choices={choices} />,
      { defaultValues: { tags: [] }, onData },
    );
    fireEvent.click(screen.getByLabelText("Tech"));
    fireEvent.click(screen.getByLabelText("People"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["tech", "people"] });
  });

  it("removes a value from the array when a box is unchecked", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <CheckboxGroupInput source="tags" choices={choices} />,
      { defaultValues: { tags: ["tech", "lifestyle"] }, onData },
    );
    fireEvent.click(screen.getByLabelText("Tech"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["lifestyle"] });
  });

  it("calls onBlur and onChange once per toggle, and not for focus moving inside the group", () => {
    const onBlur = vi.fn();
    const onChange = vi.fn();
    setup(
      <CheckboxGroupInput
        source="tags"
        choices={choices}
        onBlur={onBlur}
        onChange={onChange}
      />,
      { defaultValues: { tags: [] } },
    );
    const tech = screen.getByLabelText("Tech");
    act(() => tech.focus());
    act(() => tech.blur());
    expect(onBlur).not.toHaveBeenCalled();
    fireEvent.click(tech);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(["tech"]);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("renders the required marker for a required validator", () => {
    setup(
      <CheckboxGroupInput
        source="tags"
        choices={choices}
        validate={required()}
        label="Tags"
      />,
      { defaultValues: { tags: [] } },
    );
    expect(screen.getByText("Tags").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ tags: string[] }>(
      <CheckboxGroupInput
        source="tags"
        choices={choices}
        validate={required()}
        label="Tags"
      />,
      { defaultValues: { tags: [] } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
