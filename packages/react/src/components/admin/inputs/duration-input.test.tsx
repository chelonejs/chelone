/**
 * P7c-T4 — `<DurationInput>` ported onto chelone `useInput` + `ui/field` +
 * `<ValidationError>`. Edits an ISO-8601 duration string via per-unit numeric
 * inputs (days/hours/minutes/seconds).
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
import { DurationInput } from "./duration-input";

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

describe("<DurationInput>", () => {
  it("renders per-unit inputs seeded from an ISO duration", () => {
    setup(<DurationInput source="dur" />, {
      defaultValues: { dur: "P1DT2H30M" },
    });
    expect((screen.getByLabelText("days") as HTMLInputElement).value).toBe("1");
    expect((screen.getByLabelText("hours") as HTMLInputElement).value).toBe(
      "2",
    );
    expect((screen.getByLabelText("minutes") as HTMLInputElement).value).toBe(
      "30",
    );
    expect((screen.getByLabelText("seconds") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("writes back an ISO duration when a unit changes", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ dur: string | null }>(
      <DurationInput source="dur" />,
      { defaultValues: { dur: "" }, onData },
    );
    fireEvent.change(screen.getByLabelText("hours"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("minutes"), {
      target: { value: "30" },
    });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ dur: "PT2H30M" });
  });

  it("writes a day part with the T separator", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ dur: string | null }>(
      <DurationInput source="dur" />,
      { defaultValues: { dur: "" }, onData },
    );
    fireEvent.change(screen.getByLabelText("days"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("hours"), {
      target: { value: "4" },
    });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ dur: "P1DT4H" });
  });

  it("writes null when all units are cleared", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ dur: string | null }>(
      <DurationInput source="dur" />,
      { defaultValues: { dur: "PT2H" }, onData },
    );
    fireEvent.change(screen.getByLabelText("hours"), {
      target: { value: "" },
    });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ dur: null });
  });

  it("only renders the requested units", () => {
    setup(<DurationInput source="dur" units={["h", "m"]} />, {
      defaultValues: { dur: "PT2H" },
    });
    expect(screen.queryByLabelText("days")).toBeNull();
    expect(screen.queryByLabelText("seconds")).toBeNull();
    expect(screen.getByLabelText("hours")).toBeTruthy();
  });

  it("respects the disabled prop", () => {
    setup(<DurationInput source="dur" disabled />, {
      defaultValues: { dur: "PT2H" },
    });
    expect((screen.getByLabelText("hours") as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ dur: string | null }>(
      <DurationInput source="dur" validate={required()} />,
      { defaultValues: { dur: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
