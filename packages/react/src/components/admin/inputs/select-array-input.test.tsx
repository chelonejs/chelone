/**
 * P7c-T1 — `<SelectArrayInput>` ported onto chelone `useChoicesContext` +
 * `useChoices` + `useInput` + `ui/popover` + `ui/checkbox` + `ui/badge` +
 * `ui/field` + `<ValidationError>`. A button shows selected items as badges and
 * opens a popover with checkboxes (not searchable). Form value is an array.
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
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";
import { SelectArrayInput } from "./select-array-input";

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

describe("<SelectArrayInput>", () => {
  it("renders a labelled combobox trigger", () => {
    setup(<SelectArrayInput source="tags" choices={choices} label="Tags" />, {
      defaultValues: { tags: [] },
    });
    expect(screen.getByText("Tags")).toBeTruthy();
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("shows selected values as badges", () => {
    setup(<SelectArrayInput source="tags" choices={choices} />, {
      defaultValues: { tags: ["tech", "people"] },
    });
    const trigger = screen.getByRole("combobox");
    expect(trigger.textContent).toContain("Tech");
    expect(trigger.textContent).toContain("People");
    expect(trigger.textContent).not.toContain("Lifestyle");
  });

  it("opens a popover listing every choice as a checkbox", () => {
    setup(<SelectArrayInput source="tags" choices={choices} />, {
      defaultValues: { tags: [] },
    });
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("adds a value to the array when a choice is toggled on", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <SelectArrayInput source="tags" choices={choices} />,
      { defaultValues: { tags: [] }, onData },
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByLabelText("Tech"));
    fireEvent.click(screen.getByLabelText("Lifestyle"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["tech", "lifestyle"] });
  });

  it("removes a value when a selected choice is toggled off", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ tags: string[] }>(
      <SelectArrayInput source="tags" choices={choices} />,
      { defaultValues: { tags: ["tech", "people"] }, onData },
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByLabelText("Tech"));
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ tags: ["people"] });
  });

  it("renders the required marker for a required validator", () => {
    setup(
      <SelectArrayInput
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
      <SelectArrayInput
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
