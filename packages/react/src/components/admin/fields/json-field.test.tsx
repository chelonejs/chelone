import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { JsonField } from "./json-field";

afterEach(cleanup);

function wrap(record: unknown) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "no data" }) },
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

describe("<JsonField />", () => {
  it("renders an object value as pretty-printed JSON", () => {
    const { container } = render(<JsonField source="meta" />, {
      wrapper: wrap({ id: 1, meta: { a: 1, b: [true] } }),
    });
    expect(container.querySelector("pre")?.textContent).toBe(
      '{\n  "a": 1,\n  "b": [\n    true\n  ]\n}',
    );
  });

  it("re-indents a JSON string value", () => {
    const { container } = render(<JsonField source="meta" />, {
      wrapper: wrap({ id: 1, meta: '{"a":1}' }),
    });
    expect(container.querySelector("pre")?.textContent).toBe('{\n  "a": 1\n}');
  });

  it("renders an unparseable string verbatim", () => {
    const { container } = render(<JsonField source="meta" />, {
      wrapper: wrap({ id: 1, meta: "not json" }),
    });
    expect(container.querySelector("pre")?.textContent).toBe("not json");
  });

  it("honors a custom indent", () => {
    const { container } = render(<JsonField source="meta" indent={4} />, {
      wrapper: wrap({ id: 1, meta: { a: 1 } }),
    });
    expect(container.querySelector("pre")?.textContent).toBe(
      '{\n    "a": 1\n}',
    );
  });

  it("renders nothing for a null value without an empty prop", () => {
    const { container } = render(<JsonField source="meta" />, {
      wrapper: wrap({ id: 1, meta: null }),
    });
    expect(container.innerHTML).toBe("");
  });

  it("renders a translated empty string when the value is null", () => {
    const { getByText, container } = render(
      <JsonField source="meta" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1, meta: null }) },
    );
    expect(getByText("no data")).toBeTruthy();
    expect(container.querySelector("pre")).toBeNull();
  });

  it("merges className onto the pre element", () => {
    const { container } = render(
      <JsonField source="meta" className="extra" />,
      { wrapper: wrap({ id: 1, meta: { a: 1 } }) },
    );
    const pre = container.querySelector("pre");
    expect(pre?.classList.contains("extra")).toBe(true);
    expect(pre?.classList.contains("font-mono")).toBe(true);
  });

  it("puts className on the empty span", () => {
    const { getByText } = render(
      <JsonField source="meta" empty="myapp.empty" className="extra" />,
      { wrapper: wrap({ id: 1, meta: null }) },
    );
    expect(getByText("no data").classList.contains("extra")).toBe(true);
  });
});
