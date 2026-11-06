/**
 * P7d-T1 tests: `<NumberField>` — locale-formatted numeric display.
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
import { NumberField } from "./number-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "N/A" }) },
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

describe("<NumberField />", () => {
  it("formats a number with en-US thousands separators", () => {
    const { getByText } = render(
      <NumberField source="views" locales="en-US" />,
      { wrapper: wrap({ id: 1, views: 1234567 }) },
    );
    expect(getByText("1,234,567")).toBeTruthy();
  });

  it("coerces a numeric string via the default transform then formats", () => {
    const { getByText } = render(
      <NumberField source="price" locales="en-US" />,
      { wrapper: wrap({ id: 1, price: "2500" }) },
    );
    expect(getByText("2,500")).toBeTruthy();
  });

  it("formats a numeric string with Intl currency options", () => {
    const { getByText } = render(
      <NumberField
        source="price"
        locales="en-US"
        options={{ style: "currency", currency: "USD" }}
      />,
      { wrapper: wrap({ id: 1, price: "9.90" }) },
    );
    expect(getByText("$9.90")).toBeTruthy();
  });

  it("renders a non-numeric string unchanged", () => {
    const { getByText } = render(<NumberField source="price" />, {
      wrapper: wrap({ id: 1, price: "call us" }),
    });
    expect(getByText("call us")).toBeTruthy();
  });

  it("formats the number a custom transform returns", () => {
    const { getByText } = render(
      <NumberField source="views" locales="en-US" transform={() => 4321} />,
      { wrapper: wrap({ id: 1, views: 1 }) },
    );
    expect(getByText("4,321")).toBeTruthy();
  });

  it("renders nothing when the transform returns null", () => {
    const { container } = render(
      <NumberField source="views" transform={() => null} />,
      { wrapper: wrap({ id: 1, views: 7 }) },
    );
    expect(container.textContent).toBe("");
  });

  it("renders the empty placeholder when the value is missing", () => {
    const { getByText } = render(
      <NumberField source="views" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("N/A")).toBeTruthy();
  });

  it("renders nothing when missing without an empty prop", () => {
    const { container } = render(<NumberField source="views" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
