/**
 * P7d-T1 tests: `<BadgeField>` — value inside a styled badge.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { BadgeField } from "./badge-field";

afterEach(cleanup);

function wrap(record: unknown) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "unset" }) },
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

describe("<BadgeField />", () => {
  it("renders the value inside a badge", () => {
    const { getByText } = render(<BadgeField source="status" />, {
      wrapper: wrap({ id: 1, status: "active" }),
    });
    expect(getByText("active")).toBeTruthy();
  });

  it("coerces a non-string value via String()", () => {
    const { getByText } = render(<BadgeField source="count" />, {
      wrapper: wrap({ id: 1, count: 7 }),
    });
    expect(getByText("7")).toBeTruthy();
  });

  it("renders the translated empty string when the value is missing", () => {
    const { getByText } = render(
      <BadgeField source="status" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("unset")).toBeTruthy();
  });

  it("renders nothing when missing without an empty prop", () => {
    const { container } = render(<BadgeField source="status" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
