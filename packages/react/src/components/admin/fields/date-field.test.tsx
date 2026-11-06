/**
 * P7d-T1 tests: `<DateField>` — locale-formatted date display.
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
import { DateField } from "./date-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "no date" }) },
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

describe("<DateField />", () => {
  it("formats a date-only ISO string in UTC to a stable label", () => {
    const { getByText } = render(
      <DateField source="published_at" locales="en-US" />,
      { wrapper: wrap({ id: 1, published_at: "2022-02-15" }) },
    );
    // UTC forced for date-only strings → 2/15/2022 regardless of runner TZ.
    expect(getByText("2/15/2022")).toBeTruthy();
  });

  it("renders the empty placeholder when the value is missing", () => {
    const { getByText } = render(
      <DateField source="published_at" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("no date")).toBeTruthy();
  });

  it("renders nothing when missing without an empty prop", () => {
    const { container } = render(<DateField source="published_at" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });

  it("throws when both showDate and showTime are false", () => {
    expect(() =>
      render(
        <DateField source="published_at" showDate={false} showTime={false} />,
        { wrapper: wrap({ id: 1, published_at: "2022-02-15" }) },
      ),
    ).toThrow();
  });
});
