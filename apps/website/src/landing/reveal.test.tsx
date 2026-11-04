import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./reveal";

describe("Reveal", () => {
  // Reveal observes scroll-into-view; jsdom has no IntersectionObserver.
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("an immediate Reveal is shown at mount", () => {
    const { container } = render(<Reveal immediate>content</Reveal>);

    expect(
      container.querySelector("[data-reveal]")?.hasAttribute("data-shown"),
    ).toBe(true);
  });

  it("a Reveal waits to intersect before it is shown", () => {
    const { container } = render(<Reveal>content</Reveal>);

    expect(
      container.querySelector("[data-reveal]")?.hasAttribute("data-shown"),
    ).toBe(false);
  });

  it("a Reveal is shown once it intersects", () => {
    let onIntersect: (entries: { isIntersecting: boolean }[]) => void =
      () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof onIntersect) {
          onIntersect = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const { container } = render(<Reveal>content</Reveal>);

    act(() => onIntersect([{ isIntersecting: true }]));

    expect(
      container.querySelector("[data-reveal]")?.hasAttribute("data-shown"),
    ).toBe(true);
  });

  it("a Reveal with a delay sets --reveal-delay on its element", () => {
    const { container } = render(<Reveal delay={0.4}>content</Reveal>);

    const el = container.querySelector<HTMLElement>("[data-reveal]");
    expect(el?.style.getPropertyValue("--reveal-delay")).toBe("0.4s");
  });

  it("a Reveal renders the tag from its as prop", () => {
    const { container } = render(<Reveal as="section">content</Reveal>);

    expect(container.querySelector("[data-reveal]")?.tagName).toBe("SECTION");
  });
});
