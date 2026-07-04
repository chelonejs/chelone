/**
 * P7d-T1 tests: `<WrapperField>` — renders its children in a RecordContext.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { TextField } from "./text-field";
import { WrapperField } from "./wrapper-field";

afterEach(cleanup);

function wrap(record: unknown) {
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
      <RecordContextProvider value={record as Record<string, unknown>}>
        {children}
      </RecordContextProvider>
    </CheloneProvider>
  );
}

describe("<WrapperField />", () => {
  it("renders its children, which read the ambient record", () => {
    const { getByText } = render(
      <WrapperField label="Author" source="last_name">
        <TextField source="first_name" /> <TextField source="last_name" />
      </WrapperField>,
      { wrapper: wrap({ id: 1, first_name: "Ada", last_name: "Lovelace" }) },
    );
    expect(getByText("Ada")).toBeTruthy();
    expect(getByText("Lovelace")).toBeTruthy();
  });
});
