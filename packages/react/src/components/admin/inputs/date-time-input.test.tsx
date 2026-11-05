/**
 * P7b-T3 — `<DateTimeInput>` ported onto chelone `useInput` + `ui/input` +
 * `<ValidationError>`. Same RHF→useInput rewrite as `<DateInput>` (local
 * `useRef` replaces `field.ref`/`useForkRef`). Verifies the datetime-local
 * type, format of ISO/Date defaults to the local `yyyy-MM-ddThh:mm`, typing
 * writes an ISO string, required marker, and error surfacing.
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
import { DateTimeInput } from "./date-time-input";

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

describe("<DateTimeInput>", () => {
  it("renders a labelled input of type datetime-local", () => {
    setup(<DateTimeInput source="starts_at" />, {
      defaultValues: { starts_at: "2021-09-11T10:30" },
    });
    const input = screen.getByLabelText("Starts at") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("datetime-local");
    expect(input.value).toBe("2021-09-11T10:30");
  });

  it("formats a Date object to a local yyyy-MM-ddThh:mm string", () => {
    const d = new Date(2021, 8, 11, 10, 30);
    setup(<DateTimeInput source="starts_at" />, {
      defaultValues: { starts_at: d },
    });
    const input = screen.getByLabelText("Starts at") as HTMLInputElement;
    expect(input.value).toBe("2021-09-11T10:30");
  });

  it("writes an ISO string back to the form when typed", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ starts_at: string | null }>(
      <DateTimeInput source="starts_at" />,
      { defaultValues: { starts_at: null }, onData },
    );
    const input = screen.getByLabelText("Starts at") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2021-10-20T08:15" } });
    await act(async () => {
      await submitRef.current?.();
    });
    const written = onData.mock.calls.at(-1)?.[0]?.starts_at;
    // Default parse converts the local datetime-local value to an ISO string.
    expect(typeof written).toBe("string");
    expect(new Date(written as string).getTime()).not.toBeNaN();
  });

  it("renders empty for a stored object", () => {
    setup(<DateTimeInput source="starts_at" />, {
      defaultValues: { starts_at: { year: 2021 } },
    });
    const input = screen.getByLabelText<HTMLInputElement>("Starts at");
    expect(input.value).toBe("");
  });

  it("does not render a label when label is false", () => {
    setup(<DateTimeInput source="starts_at" label={false} />, {
      defaultValues: { starts_at: "2021-09-11T10:30" },
    });
    expect(screen.queryByText("Starts at")).toBeNull();
  });

  it("renders the required marker for a required validator", () => {
    setup(<DateTimeInput source="starts_at" validate={required()} />, {
      defaultValues: { starts_at: null },
    });
    expect(screen.getByText("Starts at").textContent).toContain("*");
  });

  it("respects the disabled prop", () => {
    setup(<DateTimeInput source="starts_at" disabled />, {
      defaultValues: { starts_at: "2021-09-11T10:30" },
    });
    expect(
      (screen.getByLabelText("Starts at") as HTMLInputElement).disabled,
    ).toBe(true);
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ starts_at: string | null }>(
      <DateTimeInput source="starts_at" validate={required()} />,
      { defaultValues: { starts_at: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
