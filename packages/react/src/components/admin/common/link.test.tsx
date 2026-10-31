/**
 * `<Link>` — the admin navigation link, styled once over the router adapter's
 * `Link`.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { Link } from "./link";

afterEach(cleanup);

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function renderLink(ui: React.ReactNode) {
  return render(
    <RouterAdapterProvider adapter={reactRouterAdapter}>
      <MemoryRouter initialEntries={["/"]}>
        {ui}
        <Where />
      </MemoryRouter>
    </RouterAdapterProvider>,
  );
}

describe("<Link>", () => {
  it("renders an anchor to the given path under the router adapter", () => {
    renderLink(<Link to="/posts">Posts</Link>);
    const anchor = screen.getByRole("link", { name: "Posts" });
    expect(anchor.tagName).toBe("A");
    expect(anchor.getAttribute("href")).toBe("/posts");
  });

  it("appends className after the default link classes", () => {
    renderLink(
      <Link to="/posts" className="custom-class">
        Posts
      </Link>,
    );
    const classes = screen.getByRole("link").className.split(" ");
    expect(classes).toContain("text-primary");
    expect(classes).toContain("underline-offset-4");
    expect(classes).toContain("hover:underline");
    expect(classes.at(-1)).toBe("custom-class");
  });

  it("forwards its ref to the anchor", () => {
    const ref = createRef<HTMLAnchorElement>();
    renderLink(
      <Link to="/posts" ref={ref}>
        Posts
      </Link>,
    );
    expect(ref.current).toBe(screen.getByRole("link"));
  });

  it("navigates on click", () => {
    renderLink(<Link to="/posts">Posts</Link>);
    fireEvent.click(screen.getByRole("link"));
    expect(screen.getByTestId("where").textContent).toBe("/posts");
  });
});
