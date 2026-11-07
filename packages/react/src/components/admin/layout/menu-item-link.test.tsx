/**
 * #1757 — `<MenuItemLink>` in the sidebar: an entry whose label wraps onto a
 * second line must not be pinned to a fixed height, or its hover/active
 * background stops short of the label. jsdom applies no CSS, so these assert
 * the classes the button carries, never a computed height.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Admin, Layout, Resource } from "../../../index";
import { MenuItemLink } from "./menu-item-link";

afterEach(cleanup);

/** A label long enough to wrap at the sidebar's shipped width. */
function LongLabelMenu() {
  return (
    <MenuItemLink
      to="/delivery-calendar"
      label="Delivery calendar"
      keyboardShortcut="mod+6"
    />
  );
}

function mountInAdmin() {
  return render(
    <MemoryRouter initialEntries={["/delivery-calendar"]}>
      <Admin
        dataProvider={fakeDataProvider({ posts: [] })}
        queryClient={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
        i18n={createI18n({
          locale: "en",
          messages: { en: defineMessages({}) },
        })}
        layout={<Layout menu={LongLabelMenu} />}
      >
        <Resource name="posts" list={() => <div>Posts</div>} />
      </Admin>
    </MemoryRouter>,
  );
}

/** The sidebar entry `<MenuItemLink>` renders as. */
function menuButton() {
  return elementOf(
    screen.getByRole("link", { name: /delivery calendar/i }),
    HTMLAnchorElement,
  );
}

describe("<MenuItemLink>", () => {
  it("menu item with a long label has no fixed height class", () => {
    mountInAdmin();
    const button = menuButton();

    expect(button.getAttribute("data-slot")).toBe("sidebar-menu-button");
    expect(button.getAttribute("data-size")).toBe("default");
    expect(button.classList.contains("h-8")).toBe(false);
    expect(button.classList.contains("min-h-8")).toBe(true);
    expect(button.classList.contains("py-1.5")).toBe(true);
  });

  it("keeps the keyboard shortcut in a trailing span when the label wraps", () => {
    mountInAdmin();
    const button = menuButton();
    const shortcut = defined(button.querySelector("span"));

    expect(shortcut.classList.contains("ml-auto")).toBe(true);
    expect(shortcut.textContent).toBe("⌘6");
    expect(shortcut.querySelectorAll("kbd")).toHaveLength(2);
  });
});
