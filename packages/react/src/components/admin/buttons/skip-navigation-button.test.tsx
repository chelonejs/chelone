/**
 * `<SkipNavigationButton>` — the off-screen "skip to content" button. Mounted
 * under `<CheloneProvider>` with a real i18n instance; asserts the label, the
 * focus hand-off to `#main-content`, and the missing-target warning.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { SkipNavigationButton } from "./skip-navigation-button";

afterEach(cleanup);

function Wrap({
  children,
  messages = {},
}: {
  children: ReactNode;
  messages?: Record<string, string>;
}) {
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages(messages) },
      })}
    >
      {children}
    </CheloneProvider>
  );
}

describe("<SkipNavigationButton>", () => {
  it("shows the translated default label", () => {
    render(
      <Wrap messages={{ "chelone.navigation.skip_nav": "Jump to the page" }}>
        <SkipNavigationButton />
      </Wrap>,
    );
    expect(
      screen.getByRole("button", { name: "Jump to the page" }),
    ).toBeTruthy();
  });

  it("falls back to 'Skip to content' when the key has no message", () => {
    render(
      <Wrap>
        <SkipNavigationButton />
      </Wrap>,
    );
    expect(
      screen.getByRole("button", { name: "Skip to content" }),
    ).toBeTruthy();
  });

  it("shows a label without a dot as written", () => {
    render(
      <Wrap>
        <SkipNavigationButton label="Straight to the data" />
      </Wrap>,
    );
    expect(
      screen.getByRole("button", { name: "Straight to the data" }),
    ).toBeTruthy();
  });

  it("focuses the main-content element and leaves no tabindex on it", () => {
    render(
      <Wrap>
        <SkipNavigationButton />
        <main id="main-content">
          <button type="button">First control</button>
        </main>
      </Wrap>,
    );
    const main = elementOf(
      document.getElementById("main-content"),
      HTMLElement,
    );
    const focus = vi.spyOn(main, "focus");
    const blur = vi.spyOn(main, "blur");
    const tabIndexWhileFocused: Array<string | null> = [];
    focus.mockImplementation(() => {
      tabIndexWhileFocused.push(main.getAttribute("tabindex"));
    });

    fireEvent.click(screen.getByRole("button", { name: "Skip to content" }));

    expect(tabIndexWhileFocused).toEqual(["-1"]);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(blur).toHaveBeenCalledTimes(1);
    expect(main.hasAttribute("tabindex")).toBe(false);
  });

  it("warns and does nothing when main-content is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Wrap>
        <SkipNavigationButton />
      </Wrap>,
    );
    const button = screen.getByRole("button", { name: "Skip to content" });
    fireEvent.click(button);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("main-content");
    expect(document.body.querySelector("[tabindex]")).toBeNull();
    warn.mockRestore();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Wrap>
        <SkipNavigationButton ref={ref} className="custom-skip" />
      </Wrap>,
    );
    const button = screen.getByRole("button", { name: "Skip to content" });
    expect(ref.current).toBe(button);
    expect(button.getAttribute("type")).toBe("button");
    expect(button.classList.contains("custom-skip")).toBe(true);
    expect(button.classList.contains("fixed")).toBe(true);
  });
});
