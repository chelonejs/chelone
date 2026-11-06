/**
 * P7d-T2 tests: `<ApiKeyField>` — masked API-key display with reveal + copy.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ApiKeyField } from "./api-key-field";

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

describe("<ApiKeyField />", () => {
  it("masks the key by default, showing only the last 4 characters", () => {
    const { container } = render(<ApiKeyField source="apiKey" />, {
      wrapper: wrap({ id: 1, apiKey: "sk_live_abcd1234" }),
    });
    const masked = container.querySelector("[data-api-key]") as HTMLElement;
    expect(masked.textContent ?? "").toMatch(/^•+1234$/);
  });

  it("reveals the full key when the reveal button is clicked", () => {
    const { container, getByText } = render(<ApiKeyField source="apiKey" />, {
      wrapper: wrap({ id: 1, apiKey: "sk_live_secret" }),
    });
    const reveal = container.querySelector(
      "[data-api-key-reveal]",
    ) as HTMLButtonElement;
    fireEvent.click(reveal);
    expect(getByText("sk_live_secret")).toBeTruthy();
  });

  it("renders scope badges when scopesSource is set", () => {
    const { container } = render(
      <ApiKeyField source="apiKey" scopesSource="scopes" />,
      {
        wrapper: wrap({
          id: 1,
          apiKey: "sk_live_x",
          scopes: ["read", "write"],
        }),
      },
    );
    expect(container.querySelectorAll("[data-scope-badge]").length).toBe(2);
  });

  it("does not show a scope that is not a string", () => {
    const { container } = render(
      <ApiKeyField source="apiKey" scopesSource="scopes" />,
      {
        wrapper: wrap({
          id: 1,
          apiKey: "sk_live_x",
          scopes: ["read", 7, null, { name: "admin" }],
        }),
      },
    );
    const badges = container.querySelectorAll("[data-scope-badge]");
    expect(badges.length).toBe(1);
    expect(badges[0]?.textContent).toBe("read");
  });

  it("renders a relative 'last used' label when the timestamp is present", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const { getByText } = render(
      <ApiKeyField source="apiKey" lastUsedSource="lastUsedAt" />,
      {
        wrapper: wrap({ id: 1, apiKey: "sk_live_x", lastUsedAt: twoHoursAgo }),
      },
    );
    expect(getByText(/hours? ago/i)).toBeTruthy();
  });

  it("renders 'Never' for last used when the timestamp is null", () => {
    const { getByText } = render(
      <ApiKeyField source="apiKey" lastUsedSource="lastUsedAt" />,
      { wrapper: wrap({ id: 1, apiKey: "sk_live_x", lastUsedAt: null }) },
    );
    expect(getByText(/never/i)).toBeTruthy();
  });

  it("renders nothing when the value is missing", () => {
    const { container } = render(<ApiKeyField source="apiKey" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
