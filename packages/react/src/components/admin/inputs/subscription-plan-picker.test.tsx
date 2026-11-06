/**
 * P7c-T4 — `<SubscriptionPlanPicker>` ported onto chelone `useInput` +
 * `ui/field` + `<ValidationError>`. Card-grid plan picker: clicking a card
 * writes its `id` to the form field.
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
import {
  type SubscriptionPlan,
  SubscriptionPlanPicker,
} from "./subscription-plan-picker";

const PLANS: readonly SubscriptionPlan[] = [
  { id: "free", name: "Free", price: 0, currency: "USD", interval: "month" },
  {
    id: "pro",
    name: "Pro",
    price: 20,
    currency: "USD",
    interval: "month",
    features: ["Unlimited"],
  },
  { id: "team", name: "Team", price: 50, currency: "USD", interval: "month" },
];

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

describe("<SubscriptionPlanPicker>", () => {
  it("renders one card per plan", () => {
    setup(<SubscriptionPlanPicker source="planId" plans={PLANS} />, {
      defaultValues: { planId: "free" },
    });
    expect(document.querySelectorAll("[data-plan-card]").length).toBe(3);
  });

  it("marks the current plan card as selected", () => {
    setup(<SubscriptionPlanPicker source="planId" plans={PLANS} />, {
      defaultValues: { planId: "pro" },
    });
    const pro = document.querySelector('[data-plan-card="pro"]');
    expect(pro?.getAttribute("data-selected")).toBe("true");
    expect(pro?.getAttribute("aria-checked")).toBe("true");
  });

  it("flags the recommended plan", () => {
    setup(
      <SubscriptionPlanPicker
        source="planId"
        plans={PLANS}
        recommendedPlanId="team"
      />,
      { defaultValues: { planId: "free" } },
    );
    expect(
      document
        .querySelector('[data-plan-card="team"]')
        ?.getAttribute("data-recommended"),
    ).toBe("true");
  });

  it("writes the clicked plan id to the form", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ planId: string }>(
      <SubscriptionPlanPicker source="planId" plans={PLANS} />,
      { defaultValues: { planId: "free" }, onData },
    );
    const proButton = elementOf(
      document.querySelector('[data-plan-card="pro"]')?.querySelector("button"),
      HTMLButtonElement,
    );
    fireEvent.click(proButton);
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ planId: "pro" });
  });

  it("does not change selection when disabled", async () => {
    const onData = vi.fn();
    const { submitRef } = setup<{ planId: string }>(
      <SubscriptionPlanPicker source="planId" plans={PLANS} disabled />,
      { defaultValues: { planId: "free" }, onData },
    );
    const proButton = elementOf(
      document.querySelector('[data-plan-card="pro"]')?.querySelector("button"),
      HTMLButtonElement,
    );
    expect(proButton.disabled).toBe(true);
    fireEvent.click(proButton);
    await act(async () => {
      await submitRef.current?.();
    });
    expect(onData).toHaveBeenCalledWith({ planId: "free" });
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ planId: string | null }>(
      <SubscriptionPlanPicker
        source="planId"
        plans={PLANS}
        validate={required()}
      />,
      { defaultValues: { planId: null } },
    );
    await act(async () => {
      await submitRef.current?.();
    });
    expect(screen.getByRole("alert").textContent).toContain("Required");
  });
});
