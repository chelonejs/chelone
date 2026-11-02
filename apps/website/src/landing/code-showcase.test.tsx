import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodeShowcase } from "./code-showcase";

describe("CodeShowcase", () => {
  // <Reveal> observes scroll-into-view; jsdom has no IntersectionObserver.
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

  it("keeps its grid to one shrinkable column below lg", () => {
    render(<CodeShowcase />);

    // jsdom applies no CSS, so the guard is the utility classes: without
    // `grid-cols-1` (minmax(0, 1fr)) the implicit column grows to the widest
    // code line and the page scrolls sideways on a phone.
    const grid = screen
      .getByRole("heading", { name: /built by developers/i })
      .closest(".grid");
    expect(grid?.classList.contains("grid-cols-1")).toBe(true);
    expect(grid?.classList.contains("lg:grid-cols-2")).toBe(true);
  });
});
