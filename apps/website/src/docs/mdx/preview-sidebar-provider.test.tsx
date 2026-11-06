import { SidebarToggleButton } from "@chelone/react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it } from "vitest";
import {
  getSidebarOpen,
  setSidebarOpen,
} from "../../components/site-shell/sidebar-state";
import { PreviewProvider } from "./preview-provider";
import { PreviewSidebarProvider } from "./preview-sidebar-provider";

function cookieState() {
  return document.cookie.match(/sidebar_state=(true|false)/)?.[1];
}

function mount(children: ReactNode) {
  render(
    <MemoryRouter>
      <PreviewProvider>{children}</PreviewProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  act(() => setSidebarOpen(true));
});

it("a demo toggle moves the shared sidebar state and its cookie together", () => {
  mount(
    <PreviewSidebarProvider>
      <SidebarToggleButton />
    </PreviewSidebarProvider>,
  );

  fireEvent.click(screen.getByRole("button"));

  expect(getSidebarOpen()).toBe(false);
  expect(cookieState()).toBe("false");
});

it("two demo providers answer Ctrl+B with the same state", () => {
  mount(
    <>
      <PreviewSidebarProvider>
        <SidebarToggleButton />
      </PreviewSidebarProvider>
      <PreviewSidebarProvider>
        <SidebarToggleButton />
      </PreviewSidebarProvider>
    </>,
  );

  fireEvent.keyDown(window, { key: "b", ctrlKey: true });

  expect(getSidebarOpen()).toBe(false);
  expect(cookieState()).toBe("false");
});
