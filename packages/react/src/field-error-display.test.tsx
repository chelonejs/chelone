/**
 * P7a-T3 error-shape fixup: the `<ValidationError>` react COMPONENT + the
 * shared `useFieldError` / `normalizeFieldError` normalizer.
 *
 * Contract parity with ra-core `ValidationError` (clean-room):
 * - a plain string error → `translate(string, {})` (key echoed on a miss);
 * - a `{ message, args }` payload → `translate(message, args)` (interpolated);
 * - `undefined` → renders nothing (null).
 *
 * `normalizeFieldError` collapses the chelone `fieldState.error`
 * (`string | TranslatableMessage | undefined`) to the same union — the ONE
 * path replacing shadmin's RHF `error?.root?.message ?? error?.message` idiom.
 */

import {
  createI18n,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  type MessageCatalog,
  type TranslatableMessage,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "./context";
import {
  normalizeFieldError,
  useFieldError,
  ValidationError,
} from "./field-error-display";
import { CheloneFormProvider } from "./form-context";
import { useForm, useInput } from "./form-hooks";

function makeWrapper(messages?: Record<string, MessageCatalog>) {
  const i18n = createI18n({
    locale: "en",
    messages: messages ?? { en: defineMessages({}) },
  });
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

afterEach(() => {
  cleanup();
});

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    "chelone.validation.minValue": "Min Value {value}",
    "myapp.validation.match": "Must match {match}",
  }),
};

describe("ValidationError (component)", () => {
  it("renders a plain string error, translated", () => {
    const { getByText } = render(
      <ValidationError error="chelone.validation.required" />,
      { wrapper: makeWrapper(messages) },
    );
    expect(getByText("Required")).toBeTruthy();
  });

  it("renders a plain string error verbatim when its key is missing", () => {
    const { getByText } = render(<ValidationError error="message_missing" />, {
      wrapper: makeWrapper(messages),
    });
    expect(getByText("message_missing")).toBeTruthy();
  });

  it("renders a { message, args } payload, interpolating the args", () => {
    const { getByText } = render(
      <ValidationError
        error={{ message: "chelone.validation.minValue", args: { value: 10 } }}
      />,
      { wrapper: makeWrapper(messages) },
    );
    expect(getByText("Min Value 10")).toBeTruthy();
  });

  it("interpolates string args in a payload", () => {
    const { getByText } = render(
      <ValidationError
        error={{ message: "myapp.validation.match", args: { match: "abc" } }}
      />,
      { wrapper: makeWrapper(messages) },
    );
    expect(getByText("Must match abc")).toBeTruthy();
  });

  it("renders a payload message verbatim when its key is missing", () => {
    const { getByText } = render(
      <ValidationError
        error={{ message: "message_missing", args: { foo: 1 } }}
      />,
      { wrapper: makeWrapper(messages) },
    );
    expect(getByText("message_missing")).toBeTruthy();
  });

  it("renders nothing when error is undefined", () => {
    const { container } = render(<ValidationError error={undefined} />, {
      wrapper: makeWrapper(messages),
    });
    expect(container.textContent).toBe("");
  });
});

describe("normalizeFieldError", () => {
  it("passes a plain string through", () => {
    expect(normalizeFieldError("chelone.validation.required")).toBe(
      "chelone.validation.required",
    );
  });

  it("passes a { message, args } payload through", () => {
    const payload: TranslatableMessage = {
      message: "chelone.validation.minValue",
      args: { value: 5 },
    };
    expect(normalizeFieldError(payload)).toEqual(payload);
  });

  it("returns undefined for undefined", () => {
    expect(normalizeFieldError(undefined)).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(normalizeFieldError("")).toBeUndefined();
  });
});

describe("useFieldError", () => {
  it("returns a normalized field error for a string input", () => {
    const { result } = renderHook(
      () => useFieldError("chelone.validation.required"),
      { wrapper: makeWrapper(messages) },
    );
    expect(result.current).toBe("chelone.validation.required");
  });

  it("returns a normalized field error for a payload input", () => {
    const payload: TranslatableMessage = {
      message: "chelone.validation.minValue",
      args: { value: 3 },
    };
    const { result } = renderHook(() => useFieldError(payload), {
      wrapper: makeWrapper(messages),
    });
    expect(result.current).toEqual(payload);
  });

  it("returns undefined for undefined", () => {
    const { result } = renderHook(() => useFieldError(undefined), {
      wrapper: makeWrapper(messages),
    });
    expect(result.current).toBeUndefined();
  });

  it("consumes exactly useInput(...).fieldState.error and renders it via <ValidationError>", async () => {
    const Wrapper = makeWrapper(messages);
    // A field-level required validator surfaces a translatable error on submit;
    // the probe routes fieldState.error through useFieldError → <ValidationError>.
    const validate = (value: unknown) =>
      value == null || value === "" ? "chelone.validation.required" : undefined;
    const save = async (): Promise<FieldErrors | undefined> => undefined;

    let submit: (() => Promise<void>) | null = null;
    function FormHost({ children }: { children: ReactNode }) {
      const form = useForm<{ title: string }>({
        defaultValues: { title: "" },
        save,
      });
      submit = form.submit;
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          {children}
        </CheloneFormProvider>
      );
    }
    function Probe() {
      const { fieldState } = useInput({ source: "title", validate });
      const error = useFieldError(fieldState.error);
      return error !== undefined ? <ValidationError error={error} /> : null;
    }

    const { container } = render(
      <Wrapper>
        <FormHost>
          <Probe />
        </FormHost>
      </Wrapper>,
    );
    await act(async () => {});
    // Pristine, no submit → the validator hasn't run → nothing rendered.
    expect(container.textContent).toBe("");

    await act(async () => {
      await submit?.();
    });
    // After submit the required validator fires; the SAME fieldState.error
    // string flows through useFieldError and renders translated.
    expect(container.textContent).toBe("Required");
  });
});
