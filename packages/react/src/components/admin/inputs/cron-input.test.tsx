/**
 * P7c-T4 — `<CronInput>` ported onto chelone `useInput` + `ui/field` +
 * `<ValidationError>`. Edits a 5-field cron expression and previews its human
 * meaning live via `cronstrue`.
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
import { CronInput } from "./cron-input";

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

describe("<CronInput>", () => {
  it("renders a text input seeded with the cron value", () => {
    setup(<CronInput source="schedule" />, {
      defaultValues: { schedule: "0 9 * * *" },
    });
    const input = elementOf(
      screen.getByLabelText("Schedule"),
      HTMLInputElement,
    );
    expect(input.value).toBe("0 9 * * *");
  });

  it("previews the human meaning of a valid expression", () => {
    setup(<CronInput source="schedule" />, {
      defaultValues: { schedule: "0 9 * * *" },
    });
    const preview = document.querySelector("[data-cron-preview]");
    expect(preview?.textContent).toMatch(/09:00|9:00/);
  });

  it("shows 'Invalid cron' for an unparseable expression", () => {
    setup(<CronInput source="schedule" />, {
      defaultValues: { schedule: "not a cron" },
    });
    const preview = document.querySelector("[data-cron-preview]");
    expect(preview?.textContent).toBe("Invalid cron");
  });

  it("writes typed input back to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ schedule: string }>(
      <CronInput source="schedule" />,
      { defaultValues: { schedule: "" }, onData },
    );
    const input = elementOf(
      screen.getByLabelText("Schedule"),
      HTMLInputElement,
    );
    fireEvent.change(input, { target: { value: "*/5 * * * *" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ schedule: "*/5 * * * *" });
  });

  it("respects the disabled prop", () => {
    setup(<CronInput source="schedule" disabled />, {
      defaultValues: { schedule: "0 9 * * *" },
    });
    expect(
      elementOf(screen.getByLabelText("Schedule"), HTMLInputElement).disabled,
    ).toBe(true);
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ schedule: string | null }>(
      <CronInput source="schedule" validate={required()} />,
      { defaultValues: { schedule: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
