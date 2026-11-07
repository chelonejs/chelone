/**
 * P7d-T2 tests: `<CronField>` — cron expression → human-readable phrase.
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
import { CronField } from "./cron-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "No schedule" }) },
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

describe("<CronField />", () => {
  it("renders a human phrase for a valid expression", () => {
    const { getByText } = render(<CronField source="schedule" />, {
      wrapper: wrap({ id: 1, schedule: "0 9 * * 1-5" }),
    });
    expect(getByText(/09:00/i)).toBeTruthy();
  });

  it("marks every rendering with data-slot so a page can find the field", () => {
    for (const schedule of ["0 9 * * 1-5", "not-a-cron", ""]) {
      const { container, unmount } = render(
        <CronField source="schedule" empty="No schedule" />,
        { wrapper: wrap({ id: 1, schedule }) },
      );
      expect(
        container.querySelector('[data-slot="cron-field"]'),
      ).not.toBeNull();
      unmount();
    }
  });

  it("shows the raw expression in monospace when showExpression", () => {
    const { getByText } = render(
      <CronField source="schedule" showExpression />,
      { wrapper: wrap({ id: 1, schedule: "*/15 * * * *" }) },
    );
    expect(getByText("*/15 * * * *")).toBeTruthy();
  });

  it("renders the raw value when the cron is unparseable", () => {
    const { getByText } = render(<CronField source="schedule" />, {
      wrapper: wrap({ id: 1, schedule: "not-a-cron" }),
    });
    expect(getByText("not-a-cron")).toBeTruthy();
  });

  it("renders the empty placeholder when the value is missing", () => {
    const { getByText } = render(
      <CronField source="schedule" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("No schedule")).toBeTruthy();
  });

  it("renders nothing when missing without an empty prop", () => {
    const { container } = render(<CronField source="schedule" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
