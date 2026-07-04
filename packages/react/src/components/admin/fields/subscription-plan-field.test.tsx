/**
 * P7d-T2 tests: `<SubscriptionPlanField>` — plan lookup → name + price badge.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import {
  type SubscriptionPlan,
  SubscriptionPlanField,
} from "./subscription-plan-field";

afterEach(cleanup);

const PLANS: SubscriptionPlan[] = [
  { id: "free", name: "Free", price: 0, currency: "USD", interval: "month" },
  { id: "pro", name: "Pro", price: 29, currency: "USD", interval: "month" },
];

function wrap(record: unknown) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "—" }) },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <RecordContextProvider value={record as Record<string, unknown>}>
        {children}
      </RecordContextProvider>
    </CheloneProvider>
  );
}

describe("<SubscriptionPlanField />", () => {
  it("renders the matched plan's name and price", () => {
    const { getByText } = render(
      <SubscriptionPlanField source="planId" plans={PLANS} />,
      { wrapper: wrap({ id: 1, planId: "pro" }) },
    );
    expect(getByText("Pro")).toBeTruthy();
    expect(getByText(/\$29/)).toBeTruthy();
  });

  it("renders the Free plan label when matched", () => {
    const { getByText } = render(
      <SubscriptionPlanField source="planId" plans={PLANS} />,
      { wrapper: wrap({ id: 1, planId: "free" }) },
    );
    expect(getByText("Free")).toBeTruthy();
  });

  it("renders the empty placeholder when planId matches no plan", () => {
    const { getByText } = render(
      <SubscriptionPlanField
        source="planId"
        plans={PLANS}
        empty="myapp.empty"
      />,
      { wrapper: wrap({ id: 1, planId: "enterprise" }) },
    );
    expect(getByText("—")).toBeTruthy();
  });

  it("renders nothing when unmatched without an empty prop", () => {
    const { container } = render(
      <SubscriptionPlanField source="planId" plans={PLANS} />,
      { wrapper: wrap({ id: 1, planId: "enterprise" }) },
    );
    expect(container.textContent).toBe("");
  });
});
