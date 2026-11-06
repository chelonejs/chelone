/**
 * P7d-T2 tests: `<CurrencyField>` — monetary display via `Intl.NumberFormat`.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { CurrencyField } from "./currency-field";

afterEach(cleanup);

function wrap(record: LooseRecord, locale = "en") {
  const i18n = createI18n({
    locale,
    messages: { [locale]: defineMessages({ "myapp.empty": "N/A" }) },
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

describe("<CurrencyField />", () => {
  it("formats a plain number with the given currency", () => {
    const { getByText } = render(
      <CurrencyField source="price" currency="USD" displayLocale="en-US" />,
      { wrapper: wrap({ id: 1, price: 1234.5 }) },
    );
    expect(getByText("$1,234.50")).toBeTruthy();
  });

  it("divides by 100 when storeAsMinorUnits is true", () => {
    const { getByText } = render(
      <CurrencyField
        source="price"
        currency="USD"
        displayLocale="en-US"
        storeAsMinorUnits
      />,
      { wrapper: wrap({ id: 1, price: 12345 }) },
    );
    expect(getByText("$123.45")).toBeTruthy();
  });

  it("reads amount + currency from a composite object value", () => {
    const { getByText } = render(
      <CurrencyField source="cost" displayLocale="ja-JP" />,
      { wrapper: wrap({ id: 1, cost: { amount: 500, currency: "JPY" } }) },
    );
    // ja-JP renders the fullwidth yen sign (U+FFE5) — match either yen glyph
    // and the amount to prove the composite `{ amount, currency }` was read.
    expect(getByText(/[¥￥]\s*500/)).toBeTruthy();
  });

  it("formats a composite object whose amount is a numeric string", () => {
    const { getByText } = render(
      <CurrencyField source="cost" displayLocale="en-US" />,
      { wrapper: wrap({ id: 1, cost: { amount: "12.50", currency: "USD" } }) },
    );
    expect(getByText("$12.50")).toBeTruthy();
  });

  it("renders the empty placeholder when the value is missing", () => {
    const { getByText } = render(
      <CurrencyField source="price" currency="USD" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("N/A")).toBeTruthy();
  });

  it("renders nothing when missing without an empty prop", () => {
    const { container } = render(
      <CurrencyField source="price" currency="USD" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(container.textContent).toBe("");
  });
});
