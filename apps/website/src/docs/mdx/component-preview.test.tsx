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

// `resettable-text-input` ships `basic.tsx` and `basic.vue`; `simple-form-iterator`,
// which has no Vue counterpart at all, ships `basic.tsx` only.
const BOTH = "editing/resettable-text-input/basic";
const REACT_ONLY = "editing/simple-form-iterator/basic";

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

// A field can open a list over the content below it, and that list reaches past
// the card it sits in. A card that clips its own content cuts the list off at
// its edge, so the card must not clip, and the tab bar rounds its own top to
// stay inside the card's corners.
describe("the preview card", () => {
  it("leaves a list a demo opens unclipped, and keeps the tab bar inside its corners", () => {
    const { container } = renderPreview(BOTH);
    const card = container.querySelector(".not-prose");
    if (!(card instanceof HTMLElement)) throw new Error("no preview card");

    expect(card.className).not.toContain("overflow-hidden");
    expect(card.className).toContain("rounded-xl");
    const tab = card.firstElementChild;
    expect(tab?.className).toContain("rounded-t-xl");
  });
});

// Every component given a Vue twin by these docs batches: the demo must exist
// beside its React twin and preview in the Vue demo app when the page asks for
// Vue.
const VUE_DEMOS = [
  "app-config/admin",
  "editing/boolean-input",
  "editing/edit-button",
  "editing/number-input",
  "editing/reference-input",
  "editing/save-button",
  "editing/select-input",
  "editing/text-input",
  "page-components/create",
  "page-components/edit",
  "page-components/list",
  "page-components/show",
  "ui-layout/access-denied",
  "ui-layout/app-bar",
  "ui-layout/application-updated-notification",
  "ui-layout/auth-callback",
  "ui-layout/auth-error",
  "ui-layout/auth-layout",
  "ui-layout/authentication-error",
  "ui-layout/check-for-application-update",
  "ui-layout/layout",
  "ui-layout/login-form",
  "ui-layout/login-page",
  "ui-layout/login-with-email",
  "ui-layout/logout",
  "ui-layout/menu",
  "ui-layout/title",
  "ui-layout/toolbar",
  "ui-layout/user-menu",
  "viewing/boolean-field",
  "viewing/data-table",
  "viewing/number-field",
  "viewing/record-field",
  "viewing/reference-field",
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

  // The frame is fitted at runtime, so nothing may fix its height up front: a
  // fixed height is what cut a list demo off. The floor that keeps an empty
  // frame from collapsing to a slit is the panel's, not the frame's: `zoom`
  // scales the frame's own lengths, so a height class on the frame is a height
  // class on 800px of layout. `min-h-56` held a 108px demo's frame at 224px, and
  // the band under it stayed after the frame was zoomed down to the panel.
  it("gives the frame no height of its own, and the floor to the panel", () => {
    const { container } = renderPreview(BOTH, VUE_URL);
    const el = frame();

    expect(el.style.height).toBe("");
    expect(el.className).not.toContain("min-h");
    expect(container.querySelector(".min-h-32")).not.toBeNull();
  });

  // jsdom never loads the frame's `src`, so the test gives its document the
  // shape a loaded page has and fires the event a real load fires. jsdom lays
  // out nothing either, so a fitted frame reads 0px: what is pinned is that the
  // frame was fitted at all, which a frame the effect never saw is not.
  function loadFrame(frame: HTMLIFrameElement): void {
    const doc = frame.contentDocument;
    if (!doc) throw new Error("the frame has no content document");
    const html = doc.createElement("html");
    const body = doc.createElement("body");
    body.innerHTML = '<div id="demo">the demo</div>';
    html.append(body);
    doc.append(html);
    fireEvent.load(frame);
  }

  it("fits a frame that mounts while the preview tab is hidden", () => {
    renderPreview(BOTH);

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.click(screen.getByRole("button", { name: "Vue" }));
    fireEvent.click(screen.getByRole("button", { name: "preview" }));

    loadFrame(frame());
    expect(frame().style.height).not.toBe("");
  });

  it("fits the frame again when the preview tab comes back", () => {
    renderPreview(BOTH, VUE_URL);

    const left = frame();
    loadFrame(left);
    expect(left.style.height).not.toBe("");

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.click(screen.getByRole("button", { name: "preview" }));

    const back = frame();
    expect(back).not.toBe(left);
    loadFrame(back);
    expect(back.style.height).not.toBe("");
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
