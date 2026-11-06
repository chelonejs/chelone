/**
 * P7d-T2 tests: `<WebhookEndpointField>` — URL + last-delivery status badge.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { WebhookEndpointField } from "./webhook-endpoint-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
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
      <RecordContextProvider value={record}>{children}</RecordContextProvider>
    </CheloneProvider>
  );
}

const okEndpoint = {
  url: "https://example.com/webhook",
  secret: "whsec_abc",
  eventTypes: ["invoice.paid"],
  lastDelivery: { status: "ok" as const, at: "2026-01-01T00:00:00Z" },
};

describe("<WebhookEndpointField />", () => {
  it("renders the URL and an OK status badge for a successful last delivery", () => {
    const { container, getByText } = render(
      <WebhookEndpointField source="endpoint" />,
      { wrapper: wrap({ id: 1, endpoint: okEndpoint }) },
    );
    expect(getByText("https://example.com/webhook")).toBeTruthy();
    const badge = elementOf(
      container.querySelector("[data-webhook-status]"),
      HTMLElement,
    );
    expect(badge.getAttribute("data-status")).toBe("ok");
  });

  it("flags failed status when lastDelivery.status is 'failed'", () => {
    const { container } = render(<WebhookEndpointField source="endpoint" />, {
      wrapper: wrap({
        id: 1,
        endpoint: {
          ...okEndpoint,
          lastDelivery: { status: "failed", at: "2026-01-01T00:00:00Z" },
        },
      }),
    });
    const badge = elementOf(
      container.querySelector("[data-webhook-status]"),
      HTMLElement,
    );
    expect(badge.getAttribute("data-status")).toBe("failed");
  });

  it("falls back to pending when lastDelivery is undefined", () => {
    const { container } = render(<WebhookEndpointField source="endpoint" />, {
      wrapper: wrap({
        id: 1,
        endpoint: { url: "https://x.test/hook", secret: "s", eventTypes: [] },
      }),
    });
    const badge = elementOf(
      container.querySelector("[data-webhook-status]"),
      HTMLElement,
    );
    expect(badge.getAttribute("data-status")).toBe("pending");
  });

  it("never renders the signing secret", () => {
    const { container } = render(<WebhookEndpointField source="endpoint" />, {
      wrapper: wrap({ id: 1, endpoint: okEndpoint }),
    });
    expect(container.textContent ?? "").not.toContain("whsec_abc");
  });

  it("renders nothing when the value is missing", () => {
    const { container } = render(<WebhookEndpointField source="endpoint" />, {
      wrapper: wrap({ id: 1 }),
    });
    expect(container.textContent).toBe("");
  });
});
