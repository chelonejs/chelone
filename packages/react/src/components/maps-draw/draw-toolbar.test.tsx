/**
 * DrawToolbar tests. The toolbar holds no map: it renders one button per tool
 * and reports presses, so the tests mount it under the i18n provider and read
 * roles and names.
 */

import { createI18n, fakeDataProvider, mapMessages } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { DrawToolbar, type DrawToolbarProps } from "./draw-toolbar";
import { toolMode } from "./use-terra-draw";

afterEach(cleanup);

function setup(props: Partial<DrawToolbarProps> = {}) {
  const onChange = vi.fn();
  const onDelete = vi.fn();
  render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({ locale: "en", messages: { en: mapMessages } })}
    >
      <DrawToolbar
        tools={["draw-polygon", "edit", "move", "delete"]}
        active={null}
        onChange={onChange}
        onDelete={onDelete}
        canDelete={false}
        {...props}
      />
    </CheloneProvider>,
  );
  return { onChange, onDelete };
}

describe("DrawToolbar", () => {
  it("renders a labelled toolbar with one pressed button for the active tool", () => {
    setup({ active: "edit" });

    const toolbar = screen.getByRole("toolbar", { name: "Map tools" });
    const buttons = Array.from(toolbar.querySelectorAll("button"));
    expect(
      buttons.map((b) => b.getAttribute("aria-label") ?? b.textContent),
    ).toEqual(["Draw a polygon", "Edit", "Move", "Delete"]);
    expect(
      screen.getByRole("button", { name: "Edit" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Draw a polygon" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen.getByRole("button", { name: "Move" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("clears the tool when the active button is pressed again", () => {
    const { onChange } = setup({ active: "edit" });

    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onChange).toHaveBeenLastCalledWith("move");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("disables delete until a feature is selected and calls onDelete", () => {
    const first = setup({ canDelete: false });
    const locked = screen.getByRole("button", {
      name: "Delete",
    }) as HTMLButtonElement;
    expect(locked.disabled).toBe(true);
    fireEvent.click(locked);
    expect(first.onDelete).not.toHaveBeenCalled();
    cleanup();

    const second = setup({ canDelete: true });
    const open = screen.getByRole("button", {
      name: "Delete",
    }) as HTMLButtonElement;
    expect(open.disabled).toBe(false);
    expect(open.getAttribute("aria-pressed")).toBeNull();
    fireEvent.click(open);
    expect(second.onDelete).toHaveBeenCalledTimes(1);
    expect(second.onChange).not.toHaveBeenCalled();
  });
});

describe("toolMode", () => {
  it("maps every tool to its Terra Draw mode name", () => {
    expect(toolMode("draw-point")).toBe("point");
    expect(toolMode("draw-line")).toBe("linestring");
    expect(toolMode("draw-polygon")).toBe("polygon");
    expect(toolMode("draw-rectangle")).toBe("rectangle");
    expect(toolMode("draw-circle")).toBe("circle");
    expect(toolMode("edit")).toBe("select");
    expect(toolMode("move")).toBe("select-move");
    expect(toolMode(null)).toBe("render");
    expect(toolMode(undefined)).toBe("render");
    expect(toolMode("draw-polygon", true)).toBe("render");
    expect(toolMode("edit", true)).toBe("render");
  });

  it("maps cut to the polygon mode", () => {
    expect(toolMode("cut")).toBe("polygon");
    expect(toolMode("cut", true)).toBe("render");
  });
});
