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

// Every component given a Vue twin in this batch: the demo must exist beside its
// React twin and preview in the Vue demo app when the page asks for Vue.
const VUE_DEMOS = [
  "app-config/admin",
  "editing/edit-button",
  "editing/save-button",
  "page-components/create",
  "page-components/list",
  "ui-layout/app-bar",
  "ui-layout/layout",
  "ui-layout/menu",
  "ui-layout/title",
  "ui-layout/toolbar",
  "ui-layout/user-menu",
];

describe.each(VUE_DEMOS)("the Vue demo of %s", (slug) => {
  it("switches to the Vue demo app at ?framework=vue", () => {
    renderPreview(`${slug}/basic`, `/docs/${slug}?framework=vue`);

    expect(
      screen.getByRole("button", { name: "Vue" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByTitle(/Vue demo/).getAttribute("src")).toBe(
      `/vue-demo/docs-preview/${slug}/basic`,
    );
  });
});

// The frame is a window into another app: it must be laid out wide enough for a
// desktop shell and resized to whatever the demo inside it grows to.
describe("the Vue demo frame", () => {
  const VUE_URL = "/docs/editing/resettable-text-input?framework=vue";

  function frame() {
    const el = screen.getByTitle(/Vue demo/);
    if (!(el instanceof HTMLIFrameElement)) {
      throw new Error("the Vue demo renders an <iframe>");
    }
    return el;
  }

  it("lays the frame out at desktop width, not the panel width", () => {
    renderPreview(BOTH, VUE_URL);

    expect(frame().style.width).toBe("800px");
  });

  // jsdom never loads the frame, so it has no contentDocument and nothing to
  // measure: the height fitting is checked in a browser, not here.
  it("leaves the frame unmeasured where jsdom cannot load it", () => {
    renderPreview(BOTH, VUE_URL);

    expect(frame().contentDocument?.body).toBeNull();
    expect(frame().style.height).toBe("");
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
