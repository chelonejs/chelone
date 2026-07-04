/**
 * P7g tests: `<Title>` — teleports a page title into the `<TitlePortal>` slot.
 *
 * Asserts: renders nothing without a portal target, and (with a target present)
 * teleports the translated title into it; renders a React-element title as-is.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { Title } from "./title";
import { TitlePortal } from "./title-portal";

afterEach(cleanup);

function Providers({ children }: { children: ReactNode }) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "page.dashboard": "Dashboard" }) },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

describe("<Title>", () => {
  it("renders nothing when there is no portal target", () => {
    const { container } = render(
      <Providers>
        <Title title="page.dashboard" />
      </Providers>,
    );
    expect(container.textContent).toBe("");
  });

  it("teleports the translated title into the portal", () => {
    render(
      <Providers>
        <TitlePortal />
        <Title title="page.dashboard" />
      </Providers>,
    );
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });

  it("renders a React-element title verbatim", () => {
    render(
      <Providers>
        <TitlePortal />
        <Title title={<span>Custom</span>} />
      </Providers>,
    );
    expect(screen.getByText("Custom")).toBeTruthy();
  });
});
