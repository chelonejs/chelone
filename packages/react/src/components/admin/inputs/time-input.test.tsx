/**
 * P7b-T3 — `<TimeInput>` ported onto chelone `useInput` + `ui/input` +
 * `<ValidationError>`. Same RHF→useInput rewrite (local `useRef` replaces
 * `field.ref`/`useForkRef`). Verifies the time type, format of a "HH:mm"
 * string / Date default, typing writes a parsed Date back to the form, the
 * required marker, and error surfacing.
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
import { TimeInput } from "./time-input";

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

describe("<TimeInput>", () => {
  it("renders a labelled input of type time", () => {
    setup(<TimeInput source="opens_at" />, {
      defaultValues: { opens_at: "08:30" },
    });
    const input = screen.getByLabelText("Opens at") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("time");
    expect(input.value).toBe("08:30");
  });

  it("formats a Date object to a local HH:mm string", () => {
    const d = new Date(2021, 8, 11, 8, 30);
    setup(<TimeInput source="opens_at" />, {
      defaultValues: { opens_at: d },
    });
    const input = screen.getByLabelText("Opens at") as HTMLInputElement;
    expect(input.value).toBe("08:30");
  });

  it("writes a parsed Date back to the form when typed", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ opens_at: unknown }>(
      <TimeInput source="opens_at" />,
      { defaultValues: { opens_at: null }, onData },
    );
    const input = screen.getByLabelText("Opens at") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "09:45" } });
    await act(async () => {
      await submitRef.current?.();
    });
    const written = onData.mock.calls.at(-1)?.[0]?.opens_at;
    // Default parse returns a Date at today's date with the entered time.
    expect(written).toBeInstanceOf(Date);
    expect((written as Date).getHours()).toBe(9);
    expect((written as Date).getMinutes()).toBe(45);
  });

  it("accepts a custom parse returning the raw string", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ opens_at: unknown }>(
      <TimeInput source="opens_at" parse={(v) => v} />,
      { defaultValues: { opens_at: null }, onData },
    );
    const input = screen.getByLabelText("Opens at") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "09:45" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData.mock.calls.at(-1)?.[0]?.opens_at).toBe("09:45");
  });

  it("renders empty for a stored object", () => {
    setup(<TimeInput source="opens_at" />, {
      defaultValues: { opens_at: { year: 2021 } },
    });
    const input = screen.getByLabelText("Opens at") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("does not render a label when label is false", () => {
    setup(<TimeInput source="opens_at" label={false} />, {
      defaultValues: { opens_at: "08:30" },
    });
    expect(screen.queryByText("Opens at")).toBeNull();
  });

  it("renders the required marker for a required validator", () => {
    setup(<TimeInput source="opens_at" validate={required()} />, {
      defaultValues: { opens_at: null },
    });
    expect(screen.getByText("Opens at").textContent).toContain("*");
  });

  it("respects the disabled prop", () => {
    setup(<TimeInput source="opens_at" disabled />, {
      defaultValues: { opens_at: "08:30" },
    });
    expect(
      (screen.getByLabelText("Opens at") as HTMLInputElement).disabled,
    ).toBe(true);
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ opens_at: unknown }>(
      <TimeInput source="opens_at" validate={required()} />,
      { defaultValues: { opens_at: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
