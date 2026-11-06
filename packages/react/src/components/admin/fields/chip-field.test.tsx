/**
 * P7d-T1 tests: `<ChipField>` — value inside a badge.
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
import { ChipField } from "./chip-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "none" }) },
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

describe("<ChipField />", () => {
  it("renders the value inside a badge", () => {
    const { getByText } = render(<ChipField source="category" />, {
      wrapper: wrap({ id: 1, category: "News" }),
    });
    expect(getByText("News")).toBeTruthy();
  });

  it("coerces a non-string value via String()", () => {
    const { getByText } = render(<ChipField source="rank" />, {
      wrapper: wrap({ id: 1, rank: 3 }),
    });
    expect(getByText("3")).toBeTruthy();
  });

  it("renders the empty placeholder for an empty string", () => {
    const { getByText } = render(
      <ChipField source="category" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1, category: "" }) },
    );
    expect(getByText("none")).toBeTruthy();
  });

  it("renders nothing when missing without an empty prop", () => {
    const { container } = render(<ChipField source="category" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
