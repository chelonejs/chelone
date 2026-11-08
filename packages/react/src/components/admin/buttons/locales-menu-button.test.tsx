/**
 * `<LocalesMenuButton>` — the app-bar menu that switches the interface
 * language. Mounted under `<CheloneProvider>` with a real i18n instance.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { LocalesMenuButton } from "./locales-menu-button";

afterEach(cleanup);

// Radix DropdownMenu opens on `pointerdown`; jsdom has no `PointerEvent`.
if (typeof globalThis.PointerEvent === "undefined") {
  vi.stubGlobal("PointerEvent", MouseEvent);
}

/** Open a Radix menu trigger the way a mouse would (pointerdown + click). */
function openMenu() {
  const trigger = screen.getByRole("button", { name: "Change locale" });
  fireEvent.pointerDown(
    trigger,
    new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
  );
  fireEvent.pointerUp(
    trigger,
    new MouseEvent("pointerup", { bubbles: true, button: 0 }),
  );
  fireEvent.click(trigger);
}

function makeI18n(locales: string[], changeLocale?: string) {
  const messages = Object.fromEntries(
    locales.map((code) => [
      code,
      defineMessages(
        changeLocale && code === "en"
          ? { "chelone.action.change_locale": changeLocale }
          : {},
      ),
    ]),
  );
  return createI18n({ locale: locales[0] ?? "en", messages });
}

function Wrap({
  children,
  i18n,
}: {
  children: ReactNode;
  i18n?: ReturnType<typeof makeI18n>;
}) {
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

describe("<LocalesMenuButton>", () => {
  it("renders nothing with one locale", () => {
    const { container } = render(
      <Wrap i18n={makeI18n(["en"])}>
        <LocalesMenuButton />
      </Wrap>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing without an i18n instance", () => {
    const { container } = render(
      <Wrap>
        <LocalesMenuButton />
      </Wrap>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("opens a menu of each language", async () => {
    render(
      <Wrap i18n={makeI18n(["en", "fr", "de"])}>
        <LocalesMenuButton />
      </Wrap>,
    );
    openMenu();
    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "English",
      "français",
      "Deutsch",
    ]);
  });

  it("choosing a language switches the locale", async () => {
    const i18n = makeI18n(["en", "fr"]);
    render(
      <Wrap i18n={i18n}>
        <LocalesMenuButton />
      </Wrap>,
    );
    expect(
      screen.getByRole("button", { name: "Change locale" }).textContent,
    ).toBe("EN");
    openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "français" }));
    expect(i18n.getLocale()).toBe("fr");
    expect(
      screen.getByRole("button", { name: "Change locale" }).textContent,
    ).toBe("FR");
  });

  it("shows the icon prop instead of the locale code", () => {
    render(
      <Wrap i18n={makeI18n(["en", "fr"])}>
        <LocalesMenuButton icon={<svg data-testid="globe" />} />
      </Wrap>,
    );
    expect(screen.getByTestId("globe")).toBeTruthy();
    expect(screen.queryByText("EN")).toBeNull();
  });

  it("lists the languages prop instead of the i18n locales", async () => {
    render(
      <Wrap i18n={makeI18n(["en", "fr"])}>
        <LocalesMenuButton
          languages={[
            { locale: "en", name: "English (UK)" },
            { locale: "fr", name: "Français (CA)" },
          ]}
        />
      </Wrap>,
    );
    openMenu();
    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "English (UK)",
      "Français (CA)",
    ]);
  });

  it("labels the trigger with the translated change locale text", () => {
    render(
      <Wrap i18n={makeI18n(["en", "fr"], "Switch language")}>
        <LocalesMenuButton />
      </Wrap>,
    );
    expect(
      screen.getByRole("button", { name: "Switch language" }),
    ).toBeTruthy();
  });

  it("renders nothing without an i18n instance even with the languages prop", () => {
    const { container } = render(
      <Wrap>
        <LocalesMenuButton
          languages={[
            { locale: "en", name: "English" },
            { locale: "fr", name: "Français" },
          ]}
        />
      </Wrap>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("leaves out a language the i18n has no catalog for", () => {
    const { container } = render(
      <Wrap i18n={makeI18n(["en", "fr"])}>
        <LocalesMenuButton
          languages={[
            { locale: "en", name: "English" },
            { locale: "en-GB", name: "English (UK)" },
          ]}
        />
      </Wrap>,
    );
    expect(container.innerHTML).toBe("");
  });
});
