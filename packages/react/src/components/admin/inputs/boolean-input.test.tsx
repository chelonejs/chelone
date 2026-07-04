/**
 * P7b-T3 — `<BooleanInput>` ported onto chelone `useInput` + `ui/switch` +
 * `ui/field` + `<ValidationError>`. Verifies the switch renders labelled,
 * toggling writes the boolean back to the form, the default value, the required
 * marker, disabled/readOnly, and error surfacing.
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
import { BooleanInput } from "./boolean-input";

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
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
    save = async () => undefined,
    onData,
  }: {
    defaultValues?: TFormData;
    save?: (data: TFormData) => Promise<FieldErrors | undefined>;
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
      save: async (data) => {
        onData?.(data);
        return save(data);
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

describe("<BooleanInput>", () => {
  it("renders a labelled switch", () => {
    setup(<BooleanInput source="is_published" />, {
      defaultValues: { is_published: false },
    });
    const sw = screen.getByLabelText("Is published") as HTMLButtonElement;
    expect(sw.getAttribute("role")).toBe("switch");
    expect(sw.getAttribute("aria-checked")).toBe("false");
  });

  it("reflects a truthy default value as checked", () => {
    setup(<BooleanInput source="is_published" />, {
      defaultValues: { is_published: true },
    });
    const sw = screen.getByLabelText("Is published");
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("writes a boolean true to the form when toggled on", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ is_published: boolean }>(
      <BooleanInput source="is_published" />,
      { defaultValues: { is_published: false }, onData },
    );
    const sw = screen.getByLabelText("Is published");
    fireEvent.click(sw);
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ is_published: true });
  });

  it("writes a boolean false to the form when toggled off", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ is_published: boolean }>(
      <BooleanInput source="is_published" />,
      { defaultValues: { is_published: true }, onData },
    );
    const sw = screen.getByLabelText("Is published");
    fireEvent.click(sw);
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ is_published: false });
  });

  it("chains the user onChange with the new checked value", () => {
    const onChange = vi.fn();
    setup(<BooleanInput source="is_published" onChange={onChange} />, {
      defaultValues: { is_published: false },
    });
    fireEvent.click(screen.getByLabelText("Is published"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders the required marker for a required validator", () => {
    setup(<BooleanInput source="is_published" validate={required()} />, {
      defaultValues: { is_published: false },
    });
    expect(screen.getByText("Is published").textContent).toContain("*");
  });

  it("respects the disabled prop", () => {
    setup(<BooleanInput source="is_published" disabled />, {
      defaultValues: { is_published: false },
    });
    expect(
      (screen.getByLabelText("Is published") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("disables the switch in readOnly mode", () => {
    setup(<BooleanInput source="is_published" readOnly />, {
      defaultValues: { is_published: false },
    });
    expect(
      (screen.getByLabelText("Is published") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("renders an explicit label when provided", () => {
    setup(<BooleanInput source="is_published" label="Published?" />, {
      defaultValues: { is_published: false },
    });
    expect(screen.getByLabelText("Published?")).toBeTruthy();
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ is_published: boolean | null }>(
      <BooleanInput
        source="is_published"
        defaultValue={null}
        validate={required()}
      />,
      { defaultValues: { is_published: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
