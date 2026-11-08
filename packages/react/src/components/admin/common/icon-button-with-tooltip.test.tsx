/**
 * `<IconButtonWithTooltip>` — a ghost icon button whose tooltip closes on
 * click.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { IconButtonWithTooltip } from "./icon-button-with-tooltip";

afterEach(cleanup);

function Providers({ children }: { children: ReactNode }) {
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({
        locale: "en",
        messages: {
          en: defineMessages({ "chelone.action.refresh": "Refresh data" }),
        },
      })}
    >
      {children}
    </CheloneProvider>
  );
}

const icon = <svg data-testid="icon" aria-hidden="true" />;

describe("<IconButtonWithTooltip>", () => {
  it("names the button by its translated label", () => {
    render(
      <Providers>
        <IconButtonWithTooltip label="chelone.action.refresh">
          {icon}
        </IconButtonWithTooltip>
      </Providers>,
    );
    expect(screen.getByRole("button", { name: "Refresh data" })).toBeTruthy();
  });

  it("shows a label that is not a key as written", () => {
    render(
      <Providers>
        <IconButtonWithTooltip label="Plain words">
          {icon}
        </IconButtonWithTooltip>
      </Providers>,
    );
    expect(screen.getByRole("button", { name: "Plain words" })).toBeTruthy();
  });

  it("sets no aria-label for a node label", () => {
    render(
      <Providers>
        <IconButtonWithTooltip label={<span>Node label</span>}>
          {icon}
        </IconButtonWithTooltip>
      </Providers>,
    );
    expect(screen.getByRole("button").hasAttribute("aria-label")).toBe(false);
  });

  it("opens on hover and closes on leave", async () => {
    render(
      <Providers>
        <IconButtonWithTooltip label="Plain words">
          {icon}
        </IconButtonWithTooltip>
      </Providers>,
    );
    const button = screen.getByRole("button");
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(button);
    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "Plain words",
    );
    fireEvent.mouseLeave(button);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("opens on focus and closes on Escape", async () => {
    render(
      <Providers>
        <IconButtonWithTooltip label="Plain words">
          {icon}
        </IconButtonWithTooltip>
      </Providers>,
    );
    const button = screen.getByRole("button");
    fireEvent.focus(button);
    await screen.findByRole("tooltip");
    fireEvent.keyDown(button, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("closes the tooltip and calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(
      <Providers>
        <IconButtonWithTooltip label="Plain words" onClick={onClick}>
          {icon}
        </IconButtonWithTooltip>
      </Providers>,
    );
    const button = screen.getByRole("button");
    fireEvent.mouseEnter(button);
    await screen.findByRole("tooltip");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("runs a caller's onMouseEnter after opening", async () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    render(
      <Providers>
        <IconButtonWithTooltip
          label="Plain words"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {icon}
        </IconButtonWithTooltip>
      </Providers>,
    );
    const button = screen.getByRole("button");
    fireEvent.mouseEnter(button);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    await screen.findByRole("tooltip");
    fireEvent.mouseLeave(button);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });
});
