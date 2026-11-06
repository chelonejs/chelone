/**
 * P7d-T1 tests: `<TextField>` — display a record value in a span.
 * ra-core / shadmin parity: renders the source value, coerces non-strings via
 * `String()`, renders the (translated) `empty` placeholder on nullish, renders
 * nothing when nullish without an `empty` prop, and reads a deep dotted source.
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
import { TextField } from "./text-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "Nothing here" }) },
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

describe("<TextField />", () => {
  it("renders the source value from the record", () => {
    const { getByText } = render(<TextField source="name" />, {
      wrapper: wrap({ id: 1, name: "Lao Tzu" }),
    });
    expect(getByText("Lao Tzu")).toBeTruthy();
  });

  it("reads a deep dotted source", () => {
    const { getByText } = render(<TextField source="author.name" />, {
      wrapper: wrap({ id: 1, author: { name: "Ada" } }),
    });
    expect(getByText("Ada")).toBeTruthy();
  });

  it("coerces a non-string value via String()", () => {
    const { getByText } = render(<TextField source="count" />, {
      wrapper: wrap({ id: 1, count: 42 }),
    });
    expect(getByText("42")).toBeTruthy();
  });

  it("renders the translated empty placeholder when the value is missing", () => {
    const { getByText } = render(
      <TextField source="name" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("Nothing here")).toBeTruthy();
  });

  it("renders nothing when the value is missing and no empty prop is set", () => {
    const { container } = render(<TextField source="name" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
