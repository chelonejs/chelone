import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HeadingLink } from "./heading-link";

function Hash() {
  return <span data-testid="hash">{useLocation().hash}</span>;
}

function renderHeading(level: 2 | 3 = 2, id: string | null = "options") {
  return render(
    <MemoryRouter initialEntries={["/docs/app-config/supabase"]}>
      <article>
        <HeadingLink level={level} id={id ?? undefined}>
          Options
        </HeadingLink>
      </article>
      <Hash />
    </MemoryRouter>,
  );
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

function stubReducedMotion(reduced: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: reduced && query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  scrollIntoView.mockReset();
});

it("renders an h2 or h3 with an id as a link to its own anchor", () => {
  renderHeading(3);

  const heading = screen.getByRole("heading", { level: 3, name: "Options" });
  expect(heading.id).toBe("options");
  expect(
    screen.getByRole("link", { name: "Options" }).getAttribute("href"),
  ).toBe("#options");
});

it("copies its URL with the hash", async () => {
  const writeText = vi.fn(() => Promise.resolve());
  stubClipboard(writeText);
  renderHeading();

  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "Options" }));
  });

  expect(writeText).toHaveBeenCalledWith("http://localhost:3000/#options");
});

it("shows the copied feedback, announces it, and clears it by itself", async () => {
  stubClipboard(() => Promise.resolve());
  renderHeading();
  expect(screen.getByRole("status").textContent).toBe("");

  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "Options" }));
  });
  expect(screen.getByRole("status").textContent).toBe("Copied");

  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(screen.getByRole("status").textContent).toBe("");
});

it("moves the address bar hash and scrolls the heading in smoothly", async () => {
  stubClipboard(() => Promise.resolve());
  stubReducedMotion(false);
  renderHeading();

  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "Options" }));
  });

  expect(screen.getByTestId("hash").textContent).toBe("#options");
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  expect(scrollIntoView.mock.contexts[0]).toBe(
    screen.getByRole("heading", { name: /Options/ }),
  );
});

it("scrolls without smooth motion when the reader prefers reduced motion", async () => {
  stubClipboard(() => Promise.resolve());
  stubReducedMotion(true);
  renderHeading();

  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "Options" }));
  });

  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto" });
});

it("still navigates and shows no feedback when the clipboard write fails", async () => {
  stubClipboard(() => Promise.reject(new Error("denied")));
  stubReducedMotion(false);
  renderHeading();

  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "Options" }));
  });

  expect(screen.getByTestId("hash").textContent).toBe("#options");
  expect(scrollIntoView).toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe("");
});

it("renders a heading without an id as plain text", () => {
  renderHeading(2, null);

  expect(
    screen.getByRole("heading", { level: 2, name: "Options" }),
  ).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
});
