/**
 * `<TopToolbar>` — the row of view actions to pass to `<List actions>`.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TopToolbar } from "./top-toolbar";

afterEach(cleanup);

describe("<TopToolbar>", () => {
  it("renders its children", () => {
    render(
      <TopToolbar>
        <button type="button">Create</button>
        <button type="button">Export</button>
      </TopToolbar>,
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
  });

  it("merges className and forwards div props", () => {
    render(
      <TopToolbar className="custom-class" data-testid="toolbar" id="actions">
        <span>child</span>
      </TopToolbar>,
    );
    const toolbar = screen.getByTestId("toolbar");
    expect(toolbar.tagName).toBe("DIV");
    expect(toolbar.id).toBe("actions");
    expect(toolbar.className).toContain("custom-class");
    expect(toolbar.className).toContain("justify-end");
  });
});
