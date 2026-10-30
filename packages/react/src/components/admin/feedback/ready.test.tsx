/**
 * P7g tests: `<Ready>` — the splash shown when no `<Resource>` is configured.
 *
 * Asserts: renders the welcome heading + the Documentation/Demo/GitHub links.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Ready } from "./ready";

afterEach(cleanup);

describe("<Ready>", () => {
  it("renders the welcome heading", () => {
    render(<Ready />);
    expect(screen.getByText(/Welcome to Chelone/i)).toBeTruthy();
  });

  it("renders the Documentation, Demo and GitHub links", () => {
    render(<Ready />);
    expect(screen.getByRole("link", { name: /Documentation/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Demo/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /GitHub/i })).toBeTruthy();
  });

  it("the GitHub link points at chelonejs/chelone", () => {
    render(<Ready />);
    expect(
      screen.getByRole("link", { name: /GitHub/i }).getAttribute("href"),
    ).toBe("https://github.com/chelonejs/chelone");
  });
});
