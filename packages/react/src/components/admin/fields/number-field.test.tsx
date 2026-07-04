/**
 * P7d-T1 tests: `<NumberField>` — locale-formatted numeric display.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { NumberField } from "./number-field";

afterEach(cleanup);

function wrap(record: unknown) {
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
      <RecordContextProvider value={record as Record<string, unknown>}>
        {children}
      </RecordContextProvider>
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
