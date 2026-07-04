/**
 * P7d-T2 tests: `<RatingField>` — numeric rating → row of star icons.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { RatingField } from "./rating-field";

afterEach(cleanup);

function wrap(record: unknown) {
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
      <RecordContextProvider value={record as Record<string, unknown>}>
        {children}
      </RecordContextProvider>
    </CheloneProvider>
  );
}

describe("<RatingField />", () => {
  it("renders 5 stars with 3 filled by default", () => {
    const { container } = render(<RatingField source="rating" />, {
      wrapper: wrap({ id: 1, rating: 3 }),
    });
    expect(container.querySelectorAll("[data-rating-star]").length).toBe(5);
    expect(
      container.querySelectorAll("[data-rating-star='filled']").length,
    ).toBe(3);
  });

  it("renders 7 filled out of 10 when max=10", () => {
    const { container } = render(<RatingField source="rating" max={10} />, {
      wrapper: wrap({ id: 1, rating: 7 }),
    });
    expect(container.querySelectorAll("[data-rating-star]").length).toBe(10);
    expect(
      container.querySelectorAll("[data-rating-star='filled']").length,
    ).toBe(7);
  });

  it("renders one half star when allowHalf and value=2.5", () => {
    const { container } = render(<RatingField source="rating" allowHalf />, {
      wrapper: wrap({ id: 1, rating: 2.5 }),
    });
    expect(container.querySelectorAll("[data-rating-star='half']").length).toBe(
      1,
    );
    expect(
      container.querySelectorAll("[data-rating-star='filled']").length,
    ).toBe(2);
  });

  it("renders the count in parentheses when countSource is set", () => {
    const { getByText } = render(
      <RatingField source="rating" countSource="reviews" />,
      { wrapper: wrap({ id: 1, rating: 4, reviews: 128 }) },
    );
    expect(getByText("(128)")).toBeTruthy();
  });

  it("renders the empty placeholder when the value is missing", () => {
    const { getByText } = render(
      <RatingField source="rating" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("—")).toBeTruthy();
  });
});
