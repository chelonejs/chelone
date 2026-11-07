import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installFor, vueInstallFor } from "@/docs/registry";
import { ComponentPreview } from "./component-preview";
import { InstallCommand } from "./install-command";

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

  it("leaves the Vue iframe's height to the fitting effect, not a fixed style", () => {
    const { container } = renderPreview(
      BOTH,
      "/docs/editing/resettable-text-input?framework=vue",
    );
    const frame = container.querySelector("iframe");
    if (!frame) throw new Error("the Vue demo renders no iframe");
    // The frame is fitted to its content at runtime, with a floor so an empty
    // frame is not a slit. jsdom never loads the frame, so there is nothing to
    // fit here; what must not come back is a fixed inline height, which is what
    // cut a list demo off.
    expect(frame.style.height).toBe("");
    expect(frame.className).toContain("min-h-56");
  });

  it("a Vue choice on a React-only demo still previews React", () => {
    renderPreview(REACT_ONLY, "/docs/editing?framework=vue");

    expect(screen.queryByTitle(/Vue demo/)).toBeNull();
    expect(screen.queryByRole("group", { name: "Framework" })).toBeNull();
  });
});

// Every docs demo that ships a `.vue` twin must reach a frame of the Vue demo
// app, the one place a Vue demo can compile. The list is the content folder's
// own, so a Vue demo that is never wired fails here and one that is removed
// stops being asserted.
const vueDemoPaths = Object.keys(
  import.meta.glob<string>("../content/**/demos/*.vue", {
    query: "?raw",
    import: "default",
  }),
);

describe("every Vue demo a docs page ships", () => {
  it.each(vueDemoPaths)(
    "%s previews in a frame of the Vue demo app",
    (path) => {
      const name = path
        .replace("../content/", "")
        .replace("/demos/", "/")
        .replace(/\.vue$/, "");
      renderPreview(name, `/docs/${name}?framework=vue`);

      expect(
        screen
          .getByRole("button", { name: "Vue" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
      expect(screen.getByTitle(/Vue demo/).getAttribute("src")).toBe(
        `/vue-demo/docs-preview/${name}`,
      );
    },
  );
});

// A frame that only re-measures on node changes keeps its old height when a
// reader narrows the window and the demo re-wraps, clipping its bottom. jsdom
// has no layout, so what is asserted here is the watching itself.
describe("the Vue frame's floor", () => {
  // The frame is fitted to its demo by an effect jsdom cannot drive: no layout,
  // and an iframe jsdom never loads has no body to measure. What can be pinned
  // is the floor the fit cannot fall below.
  it("keeps a short Vue demo's panel the height its React twin's panel is", () => {
    renderPreview(BOTH, "/docs/editing?framework=vue");

    // The panel is `min-h-32 p-8`: a 64px frame makes it 128px, which is what a
    // React demo of its own gets. A taller floor leaves an empty band under a
    // short demo.
    expect(screen.getByTitle(/Vue demo/).className).toContain("min-h-16");
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

describe("hydrating a prerendered page opened with ?framework=vue", () => {
  it("matches the prerendered React page, then switches to Vue", async () => {
    const install = installFor("data-table");
    if (!install) throw new Error("data-table must be a React registry item");
    const page = (
      <MemoryRouter initialEntries={["/docs/editing?framework=vue"]}>
        <InstallCommand install={install} vue={vueInstallFor("data-table")} />
        <ComponentPreview name={BOTH} />
      </MemoryRouter>
    );
    // The prerender has no query string, so it shows React.
    const container = document.createElement("div");
    container.innerHTML = renderToString(page);
    document.body.appendChild(container);
    expect(container.querySelector("iframe")).toBeNull();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      hydrateRoot(container, page);
    });

    expect(errors).not.toHaveBeenCalled();
    expect(container.querySelector("iframe")).not.toBeNull();
    errors.mockRestore();
    container.remove();
  });
});
