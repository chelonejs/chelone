import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it } from "vitest";
import LocalesMenuButtonDemo from "../content/ui-layout/locales-menu-button/demos/basic";
import { PreviewProvider } from "./preview-provider";

afterEach(cleanup);

it("the locale demo translates its prompt and button when switching languages", async () => {
  render(
    <MemoryRouter>
      <PreviewProvider>
        <LocalesMenuButtonDemo />
      </PreviewProvider>
    </MemoryRouter>,
  );

  fireEvent.keyDown(screen.getByRole("button", { name: "Change locale" }), {
    key: "ArrowDown",
  });
  fireEvent.click(await screen.findByRole("menuitem", { name: "français" }));

  expect(screen.getByText("Changer de langue")).toBeTruthy();
  const frenchTrigger = screen.getByRole("button", {
    name: "Changer de langue",
  });
  expect(frenchTrigger.textContent).toBe("FR");

  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  fireEvent.keyDown(frenchTrigger, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "English" }));

  expect(screen.getByText("Change locale")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Change locale" }).textContent,
  ).toBe("EN");
});

it("the tooltip button demo explains its icon on hover", async () => {
  const { default: IconButtonWithTooltipDemo } = await import(
    "../content/ui-layout/icon-button-with-tooltip/demos/basic"
  );
  render(
    <MemoryRouter>
      <PreviewProvider>
        <IconButtonWithTooltipDemo />
      </PreviewProvider>
    </MemoryRouter>,
  );

  fireEvent.mouseEnter(
    screen.getByRole("button", { name: "Posts are stored in memory" }),
  );

  expect((await screen.findByRole("tooltip")).textContent).toBe(
    "Posts are stored in memory",
  );
});
