/**
 * P7d-T1 tests: `<ColorField>` — a color chip plus its string label.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ColorField } from "./color-field";

afterEach(cleanup);

function wrap(record: unknown) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "no color" }) },
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

describe("<ColorField />", () => {
  it("renders the color label and a chip with the color background", () => {
    const { getByText, container } = render(<ColorField source="brand" />, {
      wrapper: wrap({ id: 1, brand: "#ff0000" }),
    });
    expect(getByText("#ff0000")).toBeTruthy();
    const chip = container.querySelector(
      "[data-color-chip]",
    ) as HTMLSpanElement;
    expect(chip).toBeTruthy();
    expect(chip.style.backgroundColor).toBeTruthy();
  });

  it("hides the label when showLabel is false but keeps the chip", () => {
    const { queryByText, container } = render(
      <ColorField source="brand" showLabel={false} />,
      { wrapper: wrap({ id: 1, brand: "#00ff00" }) },
    );
    expect(queryByText("#00ff00")).toBeNull();
    expect(container.querySelector("[data-color-chip]")).toBeTruthy();
  });

  it("renders the empty placeholder when the value is missing", () => {
    const { getByText } = render(
      <ColorField source="brand" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("no color")).toBeTruthy();
  });

  it("renders nothing when missing without an empty prop", () => {
    const { container } = render(<ColorField source="brand" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
