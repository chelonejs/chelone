/**
 * P7d-T2 tests: `<UsageMeterField>` — used/limit → progress bar with thresholds.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { UsageMeterField } from "./usage-meter-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <RecordContextProvider value={record}>{children}</RecordContextProvider>
    </CheloneProvider>
  );
}

describe("<UsageMeterField />", () => {
  it("renders a progress bar with used/limit text in the ok state", () => {
    const { container, getByText } = render(
      <UsageMeterField source="used" limitSource="limit" unit="GB" />,
      { wrapper: wrap({ id: 1, used: 45, limit: 100 }) },
    );
    expect(getByText("45 / 100 GB")).toBeTruthy();
    const bar = elementOf(
      container.querySelector("[data-usage-meter]"),
      HTMLElement,
    );
    expect(bar.getAttribute("data-state")).toBe("ok");
  });

  it("flags the warning state at >=80% by default", () => {
    const { container } = render(
      <UsageMeterField source="used" limitSource="limit" />,
      { wrapper: wrap({ id: 1, used: 85, limit: 100 }) },
    );
    const bar = elementOf(
      container.querySelector("[data-usage-meter]"),
      HTMLElement,
    );
    expect(bar.getAttribute("data-state")).toBe("warning");
  });

  it("flags the critical state at >=100% by default", () => {
    const { container } = render(
      <UsageMeterField source="used" limitSource="limit" />,
      { wrapper: wrap({ id: 1, used: 100, limit: 100 }) },
    );
    const bar = elementOf(
      container.querySelector("[data-usage-meter]"),
      HTMLElement,
    );
    expect(bar.getAttribute("data-state")).toBe("critical");
  });

  it("respects custom thresholds", () => {
    const { container } = render(
      <UsageMeterField
        source="used"
        limitSource="limit"
        thresholds={{ warning: 0.5, critical: 0.75 }}
      />,
      { wrapper: wrap({ id: 1, used: 60, limit: 100 }) },
    );
    const bar = elementOf(
      container.querySelector("[data-usage-meter]"),
      HTMLElement,
    );
    expect(bar.getAttribute("data-state")).toBe("warning");
  });

  it("renders the bare value when limitSource is omitted", () => {
    const { container, getByText } = render(
      <UsageMeterField source="used" unit="requests" />,
      { wrapper: wrap({ id: 1, used: 45 }) },
    );
    expect(getByText("45 requests")).toBeTruthy();
    expect(container.querySelector("[data-usage-meter]")).toBeNull();
  });

  it("renders nothing when the used value is missing", () => {
    const { container } = render(
      <UsageMeterField source="used" limitSource="limit" />,
      { wrapper: wrap({ id: 1, limit: 100 }) },
    );
    expect(container.textContent).toBe("");
  });
});
