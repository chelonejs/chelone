/**
 * P7d-T1 tests: `<UrlField>` — URL as a clickable link, with a scheme guard.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { UrlField } from "./url-field";

afterEach(cleanup);

function wrap(record: unknown) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "no url" }) },
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

describe("<UrlField />", () => {
  it("renders an anchor for a safe https URL", () => {
    const { getByText } = render(<UrlField source="website" />, {
      wrapper: wrap({ id: 1, website: "https://example.com" }),
    });
    const link = getByText("https://example.com") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("https://example.com");
  });

  it("renders custom content as the link text", () => {
    const { getByText } = render(
      <UrlField source="website" content="Visit" />,
      { wrapper: wrap({ id: 1, website: "https://example.com" }) },
    );
    const link = getByText("Visit") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
  });

  it("refuses to render an anchor for an unsafe javascript: scheme", () => {
    const { getByText } = render(<UrlField source="website" />, {
      // biome-ignore lint/suspicious/noExplicitAny: intentional unsafe value under test
      wrapper: wrap({ id: 1, website: "javascript:alert(1)" as any }),
    });
    const el = getByText("javascript:alert(1)");
    expect(el.tagName).toBe("SPAN");
  });

  it("renders the empty placeholder when the value is missing", () => {
    const { getByText } = render(
      <UrlField source="website" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("no url")).toBeTruthy();
  });
});
