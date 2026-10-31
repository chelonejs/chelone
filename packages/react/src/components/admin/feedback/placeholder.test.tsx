import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Placeholder } from "./placeholder";

describe("<Placeholder>", () => {
  afterEach(cleanup);

  it("renders a non-breaking space by default", () => {
    const { container } = render(<Placeholder />);
    expect(container.textContent).toBe(" ");
  });

  it("renders its children instead", () => {
    const { container } = render(<Placeholder>Loading name</Placeholder>);
    expect(container.textContent).toBe("Loading name");
  });

  it("merges className", () => {
    const { container } = render(<Placeholder className="w-24" />);
    const span = container.querySelector("span");
    expect(span?.classList.contains("w-24")).toBe(true);
    expect(span?.classList.contains("bg-muted")).toBe(true);
  });
});
