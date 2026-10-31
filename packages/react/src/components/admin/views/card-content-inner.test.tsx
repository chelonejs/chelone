import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardContentInner } from "./card-content-inner";

afterEach(cleanup);

describe("CardContentInner", () => {
  it("CardContentInner renders its children and passes className through", () => {
    render(
      <CardContentInner className="custom-class" data-testid="section">
        <p>First section</p>
      </CardContentInner>,
    );

    const section = screen.getByTestId("section");
    expect(section.textContent).toBe("First section");
    expect(section.classList.contains("custom-class")).toBe(true);
  });
});
