/**
 * `<SiteNav>` — the marketing site's top bar. Mounted in a router with a
 * basename, because the demos are separate SPAs served under `/demo/`: a router
 * `<Link>` would prefix that path with the basename and 404, so the Demo entry
 * must carry the URL as given (decision B, as in `landing/landing-footer.tsx`).
 */
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, test } from "vitest";
import { SiteNav } from "./site-nav";

// `at` is the path inside the app; a router with a basename matches its entries
// against the full URL, so the basename is part of what is pushed.
function renderNav(at: string, basename = "/site") {
  return render(
    <MemoryRouter basename={basename} initialEntries={[`${basename}${at}`]}>
      <SiteNav />
    </MemoryRouter>,
  );
}

test("the bar links to the demo at /demo/, unprefixed by the router basename", () => {
  renderNav("/");

  const demo = screen.getByRole("link", { name: "Demo" });
  expect(demo.getAttribute("href")).toBe("/demo/");
});

test("Home and Docs stay router links, which the basename does prefix", () => {
  renderNav("/");

  // react-router drops the trailing slash it joins onto the basename.

  expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe(
    "/site",
  );
  expect(screen.getByRole("link", { name: "Docs" }).getAttribute("href")).toBe(
    "/site/docs",
  );
});

test("the bar shows Home, Docs and Demo in that order", () => {
  renderNav("/");

  expect(
    within(screen.getByRole("list"))
      .getAllByRole("link")
      .map((link) => link.textContent),
  ).toEqual(["Home", "Docs", "Demo"]);
});

test("the docs page renders no top bar of its own", () => {
  renderNav("/docs/ui-layout/app-sidebar");

  expect(screen.queryByRole("banner")).toBeNull();
});
