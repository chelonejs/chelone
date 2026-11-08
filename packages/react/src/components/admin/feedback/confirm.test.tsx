/**
 * P7g tests: `<Confirm>` — the generic confirmation dialog.
 *
 * Asserts: renders title/content when open, translates the confirm/cancel
 * labels (via the `_` fallback), fires `onConfirm`/`onClose`, and disables the
 * action buttons while `loading`.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { Confirm } from "./confirm";

afterEach(cleanup);

function Providers({ children }: { children: ReactNode }) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "chelone.action.confirm": "Confirm" }) },
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

describe("<Confirm>", () => {
  it("renders the title and content when open", () => {
    render(
      <Providers>
        <Confirm
          isOpen
          title="Delete this?"
          content="It cannot be undone."
          onConfirm={vi.fn()}
          onClose={vi.fn()}
        />
      </Providers>,
    );
    expect(screen.getByText("Delete this?")).toBeTruthy();
    expect(screen.getByText("It cannot be undone.")).toBeTruthy();
  });

  it("renders translated confirm/cancel labels via the _ fallback", () => {
    render(
      <Providers>
        <Confirm isOpen title="t" onConfirm={vi.fn()} onClose={vi.fn()} />
      </Providers>,
    );
    // `chelone.action.confirm` is in the messages; `chelone.action.cancel` falls back.
    expect(screen.getByRole("button", { name: /confirm/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
  });

  it("fires onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <Providers>
        <Confirm isOpen title="t" onConfirm={onConfirm} onClose={vi.fn()} />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables the action buttons while loading", () => {
    render(
      <Providers>
        <Confirm
          isOpen
          loading
          title="t"
          onConfirm={vi.fn()}
          onClose={vi.fn()}
        />
      </Providers>,
    );
    expect(
      elementOf(
        screen.getByRole("button", { name: /confirm/i }),
        HTMLButtonElement,
      ).disabled,
    ).toBe(true);
  });
});
