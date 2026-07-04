/**
 * P7b-T2 — `<ColorInput>` ported onto chelone `useInput` + `ui/field` +
 * `<ValidationError>`, wrapping the `ColorPicker` ui primitive. jsdom can't
 * drive the popover picker's pointer math, so value/onChange is exercised via
 * `native` mode (`<input type="color">`) + swatch buttons; the popover variant
 * gets a mount smoke.
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
import { ColorInput } from "./color-input";

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

describe("<ColorInput>", () => {
  it("renders a labelled native color input seeded from the value", () => {
    setup(<ColorInput source="color" native />, {
      defaultValues: { color: "#3b82f6" },
    });
    const input = screen.getByLabelText("Pick a color") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("color");
    expect(screen.getByText("Color").closest("label")).not.toBeNull();
  });

  it("writes the picked color back to the form (native)", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ color: string }>(
      <ColorInput source="color" native />,
      { defaultValues: { color: "#000000" }, onData },
    );
    const input = screen.getByLabelText("Pick a color") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "#ff0000" } });
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ color: "#ff0000" });
  });

  it("sets the value from a swatch click", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ color: string }>(
      <ColorInput source="color" native swatches={["#22c55e"]} />,
      { defaultValues: { color: "#000000" }, onData },
    );
    fireEvent.click(
      screen.getByRole("button", { name: /select color #22c55e/i }),
    );
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ color: "#22c55e" });
  });

  it("mounts the popover picker variant (non-native)", () => {
    setup(<ColorInput source="color" />, {
      defaultValues: { color: "#3b82f6" },
    });
    // The popover trigger carries the picker's aria-label.
    expect(screen.getByLabelText("Pick a color")).toBeTruthy();
  });

  it("renders the required marker for a required validator", () => {
    setup(<ColorInput source="color" native validate={required()} />, {
      defaultValues: { color: null },
    });
    expect(screen.getByText("Color").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ color: string | null }>(
      <ColorInput source="color" native validate={required()} />,
      { defaultValues: { color: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });

  it("disables all inner controls via the fieldset", () => {
    setup(<ColorInput source="color" native disabled />, {
      defaultValues: { color: "#000000" },
    });
    // The native `<input>` renders inside the `<fieldset disabled>`; jsdom does
    // not compute the inherited disabled on the child, so assert the mechanism
    // (the fieldset carries the disabled attribute) — the real disabling wiring.
    const input = screen.getByLabelText("Pick a color") as HTMLInputElement;
    const fieldset = input.closest("fieldset") as HTMLFieldSetElement;
    expect(fieldset).not.toBeNull();
    expect(fieldset.disabled).toBe(true);
  });
});
