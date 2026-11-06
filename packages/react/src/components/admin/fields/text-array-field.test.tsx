/**
 * P7d-T1 tests: `<TextArrayField>` — an array of scalars as badges.
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
import { TextArrayField } from "./text-array-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "no tags" }) },
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

describe("<TextArrayField />", () => {
  it("renders one badge per array item", () => {
    const { getByText } = render(<TextArrayField source="genres" />, {
      wrapper: wrap({ id: 1, genres: ["Fiction", "History"] }),
    });
    expect(getByText("Fiction")).toBeTruthy();
    expect(getByText("History")).toBeTruthy();
  });

  it("coerces non-string items via String()", () => {
    const { getByText } = render(<TextArrayField source="ranks" />, {
      wrapper: wrap({ id: 1, ranks: [1, 2] }),
    });
    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
  });

  it("renders the empty placeholder for an empty array", () => {
    const { getByText } = render(
      <TextArrayField source="genres" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1, genres: [] }) },
    );
    expect(getByText("no tags")).toBeTruthy();
  });

  it("renders nothing for a missing value without an empty prop", () => {
    const { container } = render(<TextArrayField source="genres" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
