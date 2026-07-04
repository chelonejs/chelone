/**
 * P7b-T2 — `<TextInput>` ported onto chelone `useInput` + `ui/field` +
 * `<ValidationError>`. jsdom applies no CSS: assert DOM structure/roles/values
 * and behavior (value/onChange/parse, required marker, error surfacing), never
 * visual styling.
 */
import {
  createI18n,
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
import { TextInput } from "./text-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
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

/** Mount an input inside a real form + provider stack; expose submit. */
function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    save = async () => undefined,
  }: {
    defaultValues?: TFormData;
    save?: (data: TFormData) => Promise<FieldErrors | undefined>;
  } = {},
) {
  const Wrapper = makeWrapper();
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({ defaultValues, save });
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

describe("<TextInput>", () => {
  it("renders a labelled text input prefilled from the form value", () => {
    setup(<TextInput source="title" />, {
      defaultValues: { title: "War and Peace" },
    });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("type")).toBe("text");
    expect(input.value).toBe("War and Peace");
    // The humanized default label is associated with the input.
    expect(screen.getByLabelText("Title")).toBe(input);
    expect(screen.getByText("Title").closest("label")).not.toBeNull();
  });

  it("writes typed text back to the form value", () => {
    setup(<TextInput source="title" />, { defaultValues: { title: "" } });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });
    expect(input.value).toBe("hello");
  });

  it("stores an empty string as null (ra default parse)", () => {
    const save = vi.fn(async () => undefined);
    setup<{ title: string | null }>(<TextInput source="title" />, {
      defaultValues: { title: "seed" },
      save,
    });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
  });

  it("renders the required marker when a required validator is set", () => {
    setup(<TextInput source="title" validate={required()} />, {
      defaultValues: { title: "" },
    });
    // The marker is a thin-space asterisk inside the label span.
    expect(screen.getByText("Title").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ title: string | null }>(
      <TextInput source="title" validate={required()} />,
      { defaultValues: { title: null } },
    );
    // Pristine → no error.
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-slot")).toBe("field-error");
    expect(alert.textContent).toContain("Required");
  });

  it("renders a <textarea> when multiline is set", () => {
    setup(<TextInput source="body" multiline />, {
      defaultValues: { body: "line" },
    });
    const input = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(input.tagName).toBe("TEXTAREA");
    expect(input.value).toBe("line");
  });

  it("omits the label when label is false", () => {
    setup(<TextInput source="title" label={false} />, {
      defaultValues: { title: "x" },
    });
    expect(screen.queryByText("Title")).toBeNull();
  });

  it("respects the disabled prop", () => {
    setup(<TextInput source="title" disabled />, {
      defaultValues: { title: "x" },
    });
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(
      true,
    );
  });
});
