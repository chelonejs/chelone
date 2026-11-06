/**
 * P7d-T2 tests: `<DurationField>` — ISO-8601 duration → human-readable text.
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
import { DurationField } from "./duration-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
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
      <RecordContextProvider value={record}>{children}</RecordContextProvider>
    </CheloneProvider>
  );
}

describe("<DurationField />", () => {
  it("renders '2h 30m' for PT2H30M in compact format", () => {
    const { getByText } = render(<DurationField source="d" />, {
      wrapper: wrap({ id: 1, d: "PT2H30M" }),
    });
    expect(getByText("2h 30m")).toBeTruthy();
  });

  it("renders '1d 4h' for P1DT4H", () => {
    const { getByText } = render(<DurationField source="d" />, {
      wrapper: wrap({ id: 1, d: "P1DT4H" }),
    });
    expect(getByText("1d 4h")).toBeTruthy();
  });

  it("renders a relative phrase when displayFormat='relative'", () => {
    const { getByText } = render(
      <DurationField source="d" displayFormat="relative" />,
      { wrapper: wrap({ id: 1, d: "PT45M" }) },
    );
    expect(getByText(/45 minutes/i)).toBeTruthy();
  });

  it("renders the empty placeholder for an empty string value", () => {
    const { getByText } = render(
      <DurationField source="d" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1, d: "" }) },
    );
    expect(getByText("—")).toBeTruthy();
  });

  it("renders nothing when missing without an empty prop", () => {
    const { container } = render(<DurationField source="d" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
