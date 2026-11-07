import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComponentPreview } from "./component-preview";

// Shiki highlights asynchronously and renders nothing in jsdom; the test reads the source it is given.
vi.mock("react-shiki", () => ({
  ShikiHighlighter: ({
    children,
    language,
  }: {
    children: string;
    language: string;
  }) => <pre data-language={language}>{children}</pre>,
}));

// `resettable-text-input` ships `basic.tsx` and `basic.vue`; `text-input` ships `basic.tsx` only.
const BOTH = "editing/resettable-text-input/basic";
const REACT_ONLY = "editing/text-input/basic";

function renderPreview(name: string, url = "/docs/editing") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ComponentPreview name={name} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("ComponentPreview framework switch", () => {
  it("shows the switch when the demo exists in React and Vue", () => {
    renderPreview(BOTH);

    const group = screen.getByRole("group", { name: "Framework" });
    expect(group.querySelectorAll("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "React" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vue" })).toBeTruthy();
  });

  it("has no switch when only one framework has the demo", () => {
    renderPreview(REACT_ONLY);

    expect(screen.queryByRole("group", { name: "Framework" })).toBeNull();
  });

  it("previews React by default, with no Vue iframe", () => {
    renderPreview(BOTH);

    expect(
      screen
        .getByRole("button", { name: "React" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.queryByTitle(/Vue demo/)).toBeNull();
  });

  it("?framework=vue previews the Vue demo in an iframe of the Vue demo app", () => {
    renderPreview(BOTH, "/docs/editing/resettable-text-input?framework=vue");

    expect(
      screen.getByRole("button", { name: "Vue" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByTitle(/Vue demo/).getAttribute("src")).toBe(
      "/vue-demo/docs-preview/editing/resettable-text-input/basic",
    );
  });

  it("falls back to the stored framework, and the URL wins over it", () => {
    localStorage.setItem("chelone-docs-framework", "vue");
    renderPreview(BOTH);
    expect(screen.getByTitle(/Vue demo/)).toBeTruthy();
    cleanup();

    renderPreview(BOTH, "/docs/editing?framework=react");
    expect(screen.queryByTitle(/Vue demo/)).toBeNull();
  });

  it("choosing Vue swaps the preview and the Code tab to the Vue source", async () => {
    renderPreview(BOTH);

    fireEvent.click(screen.getByRole("button", { name: "Vue" }));
    expect(screen.getByTitle(/Vue demo/)).toBeTruthy();
    expect(localStorage.getItem("chelone-docs-framework")).toBe("vue");

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    const source = await screen.findByText(/<script setup/);
    expect(source.getAttribute("data-language")).toBe("vue");
    expect(source.textContent).toContain("<ResettableTextInput");
  });

  it("a Vue choice on a React-only demo still previews React", () => {
    renderPreview(REACT_ONLY, "/docs/editing?framework=vue");

    expect(screen.queryByTitle(/Vue demo/)).toBeNull();
    expect(screen.queryByRole("group", { name: "Framework" })).toBeNull();
  });
});

describe("ComponentPreview with a name that matches no demo", () => {
  it("renders no switch, preview or iframe", () => {
    const { container } = renderPreview(
      "editing/no-such-component/basic",
      "/docs/editing/no-such-component?framework=vue",
    );

    expect(screen.queryByRole("group", { name: "Framework" })).toBeNull();
    expect(screen.queryByTitle(/Vue demo/)).toBeNull();
    expect(screen.queryByRole("button", { name: "preview" })).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
});
