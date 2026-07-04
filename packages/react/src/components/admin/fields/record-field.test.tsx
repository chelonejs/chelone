/**
 * P7d-T1 tests: `<RecordField>` — labeled field/value pair.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { NumberField } from "./number-field";
import { RecordField } from "./record-field";

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

describe("<RecordField />", () => {
  it("renders a TextField by default for its source", () => {
    const { getByText } = render(<RecordField source="reference" />, {
      wrapper: wrap({ id: 1, reference: "REF-001" }),
    });
    expect(getByText("REF-001")).toBeTruthy();
  });

  it("renders a child field, which reads the ambient record", () => {
    const { getByText } = render(
      <RecordField source="price">
        <NumberField source="price" locales="en-US" />
      </RecordField>,
      { wrapper: wrap({ id: 1, price: 1999 }) },
    );
    expect(getByText("1,999")).toBeTruthy();
  });

  it("renders the output of a render function", () => {
    const { getByText } = render(
      <RecordField<{ id: number; width: number; height: number }>
        label="dimensions"
        render={(r) => `${r.width}x${r.height}`}
      />,
      { wrapper: wrap({ id: 1, width: 4, height: 3 }) },
    );
    expect(getByText("4x3")).toBeTruthy();
  });

  it("renders an explicit string label", () => {
    const { getByText } = render(
      <RecordField source="reference" label="Ref." />,
      { wrapper: wrap({ id: 1, reference: "REF-001" }) },
    );
    expect(getByText("Ref.")).toBeTruthy();
  });

  it("renders nothing without a source, label, or render", () => {
    const { container } = render(<RecordField />, {
      wrapper: wrap({ id: 1, reference: "REF-001" }),
    });
    expect(container.textContent).toBe("");
  });
});
