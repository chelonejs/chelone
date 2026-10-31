/**
 * `<HideOnScroll>` — hides its children on a downward scroll past `threshold`
 * and shows them on any upward scroll. State is read from `data-state`.
 */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HideOnScroll } from "./hide-on-scroll";

function scrollTo(y: number) {
  act(() => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
  });
}

function state() {
  return screen.getByTestId("wrapper").getAttribute("data-state");
}

beforeEach(() => {
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("<HideOnScroll>", () => {
  it("starts visible", () => {
    render(
      <HideOnScroll data-testid="wrapper">
        <header>Bar</header>
      </HideOnScroll>,
    );
    expect(state()).toBe("visible");
    expect(screen.getByText("Bar")).toBeTruthy();
  });

  it("hides when scrolling down past the threshold", () => {
    render(
      <HideOnScroll data-testid="wrapper">
        <header>Bar</header>
      </HideOnScroll>,
    );
    scrollTo(101);
    expect(state()).toBe("hidden");
  });

  it("stays visible when scrolling down within the threshold", () => {
    render(
      <HideOnScroll data-testid="wrapper">
        <header>Bar</header>
      </HideOnScroll>,
    );
    scrollTo(100);
    expect(state()).toBe("visible");
  });

  it("shows again when scrolling up", () => {
    render(
      <HideOnScroll data-testid="wrapper">
        <header>Bar</header>
      </HideOnScroll>,
    );
    scrollTo(300);
    expect(state()).toBe("hidden");
    scrollTo(299);
    expect(state()).toBe("visible");
  });

  it("removes its scroll listener on unmount", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <HideOnScroll data-testid="wrapper">
        <header>Bar</header>
      </HideOnScroll>,
    );
    const added = add.mock.calls.find(([type]) => type === "scroll");
    expect(added?.[2]).toEqual({ passive: true });

    unmount();
    const removed = remove.mock.calls.find(([type]) => type === "scroll");
    expect(removed?.[1]).toBe(added?.[1]);
  });

  it("follows a changed threshold", () => {
    const { rerender } = render(
      <HideOnScroll data-testid="wrapper" threshold={100}>
        <header>Bar</header>
      </HideOnScroll>,
    );
    rerender(
      <HideOnScroll data-testid="wrapper" threshold={200}>
        <header>Bar</header>
      </HideOnScroll>,
    );
    scrollTo(150);
    expect(state()).toBe("visible");
    scrollTo(250);
    expect(state()).toBe("hidden");
  });
});
