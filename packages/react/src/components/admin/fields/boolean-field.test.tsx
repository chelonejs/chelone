/**
 * P7d-T1 tests: `<BooleanField>` — boolean shown as a check/close icon.
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
import { BooleanField } from "./boolean-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.boolean.true": "yes",
        "chelone.boolean.false": "no",
      }),
    },
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

describe("<BooleanField />", () => {
  it("renders an icon (check trigger) for a true value", () => {
    const { container } = render(<BooleanField source="published" />, {
      wrapper: wrap({ id: 1, published: true }),
    });
    // The tooltip trigger wraps a lucide svg icon.
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders an icon for a false value", () => {
    const { container } = render(<BooleanField source="published" />, {
      wrapper: wrap({ id: 1, published: false }),
    });
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders the empty node for a non-boolean value", () => {
    const { container } = render(
      <BooleanField source="published" empty={<span>unknown</span>} />,
      { wrapper: wrap({ id: 1, published: "maybe" }) },
    );
    expect(container.textContent).toBe("unknown");
    expect(container.querySelector("svg")).toBeFalsy();
  });

  it("treats a truthy non-boolean as true under looseValue", () => {
    const { container } = render(
      <BooleanField source="published" looseValue />,
      { wrapper: wrap({ id: 1, published: 1 }) },
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
