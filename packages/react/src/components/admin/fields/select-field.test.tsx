/**
 * P7d-T1 tests: `<SelectField>` — map a value to a choice label.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { SelectField } from "./select-field";

afterEach(cleanup);

function wrap(record: unknown) {
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "myroot.gender.male": "He/Him",
        "myapp.empty": "unknown",
      }),
    },
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

const choices = [
  { id: "M", name: "Male" },
  { id: "F", name: "Female" },
];

describe("<SelectField />", () => {
  it("renders the label of the matching choice", () => {
    const { getByText } = render(
      <SelectField source="gender" choices={choices} />,
      { wrapper: wrap({ id: 1, gender: "M" }) },
    );
    expect(getByText("Male")).toBeTruthy();
  });

  it("translates a translation-key choice label by default", () => {
    const { getByText } = render(
      <SelectField
        source="gender"
        choices={[{ id: "M", name: "myroot.gender.male" }]}
      />,
      { wrapper: wrap({ id: 1, gender: "M" }) },
    );
    expect(getByText("He/Him")).toBeTruthy();
  });

  it("renders the empty placeholder when no choice matches", () => {
    const { getByText } = render(
      <SelectField source="gender" choices={choices} empty="myapp.empty" />,
      { wrapper: wrap({ id: 1, gender: "X" }) },
    );
    expect(getByText("unknown")).toBeTruthy();
  });

  it("renders nothing when no choice matches and no empty prop is set", () => {
    const { container } = render(
      <SelectField source="gender" choices={choices} />,
      { wrapper: wrap({ id: 1, gender: "X" }) },
    );
    expect(container.textContent).toBe("");
  });
});
