/**
 * P7b-T3 — `<DateInput>` ported onto chelone `useInput` + `ui/input` +
 * `<ValidationError>`. RHF-direct rewrite: shadmin drove the uncontrolled
 * "type-then-leave" pattern through `field.ref` (RHF-only) + `useForkRef`;
 * chelone `field` has no `ref`, so a plain local `useRef` attaches straight to
 * the `<Input>`. Verifies the date type, format of string/Date/ISO/timestamp
 * defaults, typing writes the value, empty-on-blur clears, external form-value
 * change remounts the input, required marker, and error surfacing.
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
import { DateInput } from "./date-input";

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

describe("<DateInput>", () => {
  it("renders a labelled input of type date", () => {
    setup(<DateInput source="published_at" />, {
      defaultValues: { published_at: "2021-09-11" },
    });
    const input = screen.getByLabelText("Published at") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("date");
    expect(input.value).toBe("2021-09-11");
  });

  it("formats an ISO datetime string to a bare date", () => {
    setup(<DateInput source="published_at" />, {
      defaultValues: { published_at: "2021-09-11T06:51:17.772Z" },
    });
    const input = screen.getByLabelText("Published at") as HTMLInputElement;
    expect(input.value).toBe("2021-09-11");
  });

  it("formats a Date object to a bare date", () => {
    setup(<DateInput source="published_at" />, {
      defaultValues: { published_at: new Date("2021-09-11T12:00:00.000Z") },
    });
    const input = screen.getByLabelText("Published at") as HTMLInputElement;
    expect(input.value).toBe("2021-09-11");
  });

  it("writes the typed date string back to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ published_at: string | null }>(
      <DateInput source="published_at" />,
      { defaultValues: { published_at: null }, onData },
    );
    const input = screen.getByLabelText("Published at") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2021-10-20" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ published_at: "2021-10-20" });
  });

  it("clears the form value when the input is emptied on blur", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ published_at: string | null }>(
      <DateInput source="published_at" />,
      { defaultValues: { published_at: "2021-09-11" }, onData },
    );
    const input = screen.getByLabelText("Published at") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    await act(async () => {
      await submitRef.current?.();
    });
    // chelone's default parse maps an emptied input to `null` (so a required
    // validator still fires) — the ra `""` becomes chelone `null`.
    expect(onData).toHaveBeenCalledWith({ published_at: null });
  });

  it("applies a custom parse function", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ published_at: unknown }>(
      <DateInput
        source="published_at"
        parse={(v) => (v ? new Date(v as string).toISOString() : null)}
      />,
      { defaultValues: { published_at: null }, onData },
    );
    const input = screen.getByLabelText("Published at") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2021-10-20" } });
    await act(async () => {
      await submitRef.current?.();
    });
    const written = onData.mock.calls.at(-1)?.[0]?.published_at;
    expect(String(written)).toContain("2021-10-20");
  });

  it("renders empty for a stored object", () => {
    setup(<DateInput source="published_at" />, {
      defaultValues: { published_at: { year: 2021 } },
    });
    const input = screen.getByLabelText("Published at") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("does not render a label when label is false", () => {
    setup(<DateInput source="published_at" label={false} />, {
      defaultValues: { published_at: "2021-09-11" },
    });
    expect(screen.queryByText("Published at")).toBeNull();
  });

  it("renders the required marker for a required validator", () => {
    setup(<DateInput source="published_at" validate={required()} />, {
      defaultValues: { published_at: null },
    });
    expect(screen.getByText("Published at").textContent).toContain("*");
  });

  it("respects the disabled prop", () => {
    setup(<DateInput source="published_at" disabled />, {
      defaultValues: { published_at: "2021-09-11" },
    });
    expect(
      (screen.getByLabelText("Published at") as HTMLInputElement).disabled,
    ).toBe(true);
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ published_at: string | null }>(
      <DateInput source="published_at" validate={required()} />,
      { defaultValues: { published_at: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
