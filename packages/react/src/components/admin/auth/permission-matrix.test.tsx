import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
  type PermissionMatrixValue,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { ResourceRegistryProvider } from "../../../resource";
import {
  PermissionMatrix,
  type PermissionMatrixProps,
} from "./permission-matrix";

afterEach(cleanup);

function matrixTree(
  props: PermissionMatrixProps,
  messages: Record<string, string> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={createResourceRegistry()}>
        <PermissionMatrix {...props} />
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

function renderMatrix(
  props: PermissionMatrixProps,
  messages: Record<string, string> = {},
) {
  return render(matrixTree(props, messages));
}

function cell(name: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-cell="${name}"]`);
  if (found === null) throw new Error(`no cell ${name}`);
  return found;
}

function all(name: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-all="${name}"]`);
  if (found === null) throw new Error(`no all checkbox ${name}`);
  return found;
}

const value: PermissionMatrixValue = {
  admin: [{ resource: "posts", action: ["list", "show"] }],
  editor: [{ resource: "comments", action: "list" }],
};

describe("<PermissionMatrix>", () => {
  it("renders a tab per role with the first one active", () => {
    renderMatrix({
      roles: ["admin", { id: "editor", label: "Editor role" }],
      resources: ["posts"],
    });
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "admin",
      "Editor role",
    ]);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    expect(
      document.querySelector('[data-slot="permission-matrix"]'),
    ).not.toBeNull();
  });

  it("renders a row per resource and a column per action, with translated action headers", () => {
    renderMatrix(
      {
        roles: ["admin"],
        resources: ["posts", { id: "comments", label: "Remarks" }],
        actions: ["list", "publish"],
      },
      { "chelone.action.list": "Browse" },
    );
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Resource", "Browse", "Publish", "All"]);
    const rows = Array.from(document.querySelectorAll("[data-resource]"));
    expect(rows.map((row) => row.getAttribute("data-resource"))).toEqual([
      "posts",
      "comments",
    ]);
    expect(rows.map((row) => row.querySelector("td")?.textContent)).toEqual([
      "Posts",
      "Remarks",
    ]);
  });

  it("checks the cells the value grants", () => {
    renderMatrix({ roles: ["admin"], resources: ["posts"], value });
    expect(cell("admin.posts.list").getAttribute("aria-checked")).toBe("true");
    expect(cell("admin.posts.show").getAttribute("aria-checked")).toBe("true");
    expect(cell("admin.posts.edit").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("checkbox", { name: "admin List Posts" })).toBe(
      cell("admin.posts.list"),
    );
  });

  it("clicking a denied cell calls onChange with the action added to that role", () => {
    const onChange = vi.fn();
    renderMatrix({ roles: ["admin"], resources: ["posts"], value, onChange });
    fireEvent.click(cell("admin.posts.edit"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      admin: [{ resource: "posts", action: ["list", "show", "edit"] }],
    });
  });

  it("clicking a granted cell calls onChange with the action removed", () => {
    const onChange = vi.fn();
    renderMatrix({ roles: ["admin"], resources: ["posts"], value, onChange });
    fireEvent.click(cell("admin.posts.list"));
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      admin: [{ resource: "posts", action: ["show"] }],
    });
  });

  it("a cell granted by a wildcard is checked, disabled and marked inherited", () => {
    const onChange = vi.fn();
    renderMatrix(
      {
        roles: ["root"],
        resources: ["posts"],
        value: { root: [{ resource: "*", action: "*" }] },
        onChange,
      },
      { "chelone.permission_matrix.inherited": "From a wildcard" },
    );
    const inherited = cell("root.posts.list");
    expect(inherited.getAttribute("aria-checked")).toBe("true");
    expect(inherited.hasAttribute("disabled")).toBe(true);
    expect(inherited.hasAttribute("data-inherited")).toBe(true);
    expect(inherited.getAttribute("title")).toBe("From a wildcard");
    fireEvent.click(inherited);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("the All checkbox grants every action of the row, and clears them when all are granted", () => {
    const onChange = vi.fn();
    renderMatrix({
      roles: ["admin"],
      resources: ["posts"],
      actions: ["list", "show"],
      value: { admin: [{ resource: "posts", action: "list" }] },
      onChange,
    });
    expect(all("admin.posts").getAttribute("aria-checked")).toBe("false");
    fireEvent.click(all("admin.posts"));
    expect(onChange).toHaveBeenLastCalledWith({
      admin: [{ resource: "posts", action: ["list", "show"] }],
    });

    cleanup();
    renderMatrix({
      roles: ["admin"],
      resources: ["posts"],
      actions: ["list", "show"],
      value: { admin: [{ resource: "posts", action: ["list", "show"] }] },
      onChange,
    });
    expect(all("admin.posts").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(all("admin.posts"));
    expect(onChange).toHaveBeenLastCalledWith({ admin: [] });
  });

  it("switching tabs shows the other role's grants", () => {
    renderMatrix({
      roles: ["admin", "editor"],
      resources: ["comments"],
      value,
    });
    expect(
      document.querySelector('[data-cell="editor.comments.list"]'),
    ).toBeNull();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "editor" }), {
      button: 0,
    });
    expect(cell("editor.comments.list").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(
      document.querySelector('[data-cell="admin.comments.list"]'),
    ).toBeNull();
  });

  it("readOnly disables every checkbox and never calls onChange", () => {
    const onChange = vi.fn();
    renderMatrix({
      roles: ["admin"],
      resources: ["posts"],
      value,
      onChange,
      readOnly: true,
    });
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) expect(box.hasAttribute("disabled")).toBe(true);
    fireEvent.click(cell("admin.posts.edit"));
    fireEvent.click(all("admin.posts"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the empty text when there are no roles", () => {
    renderMatrix(
      { roles: [], resources: ["posts"] },
      { "chelone.permission_matrix.no_roles": "Nothing here" },
    );
    expect(
      document.querySelector('[data-slot="permission-matrix-empty"]')
        ?.textContent,
    ).toBe("Nothing here");
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("renders role and resource labels that hold markup as text", () => {
    const img = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    renderMatrix({
      roles: [{ id: "admin", label: img }],
      resources: [{ id: "posts", label: script }],
    });
    expect(screen.getByRole("tab").textContent).toBe(img);
    expect(
      document.querySelector('[data-resource="posts"] td')?.textContent,
    ).toBe(script);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(cell("admin.posts.list").getAttribute("aria-label")).toBe(
      `${img} List ${script}`,
    );
  });

  it("names each cell with the translated action shown in its column header", () => {
    renderMatrix(
      { roles: ["admin"], resources: ["posts"] },
      { "chelone.action.list": "Browse" },
    );
    expect(cell("admin.posts.list").getAttribute("aria-label")).toBe(
      "admin Browse Posts",
    );
  });

  it("disables the All checkbox when every cell of the row is inherited", () => {
    const onChange = vi.fn();
    renderMatrix({
      roles: ["root"],
      resources: ["posts"],
      value: { root: [{ resource: "*", action: "*" }] },
      onChange,
    });
    expect(all("root.posts").hasAttribute("disabled")).toBe(true);
    fireEvent.click(all("root.posts"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("falls back to the first role when the selected role is removed", () => {
    const { rerender } = renderMatrix({
      roles: ["admin", "editor"],
      resources: ["posts"],
    });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "editor" }), {
      button: 0,
    });
    expect(cell("editor.posts.list")).toBeTruthy();
    rerender(matrixTree({ roles: ["admin"], resources: ["posts"] }));
    expect(
      screen.getByRole("tab", { name: "admin" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(cell("admin.posts.list")).toBeTruthy();
  });
});
