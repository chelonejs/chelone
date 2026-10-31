import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { installFor, vueInstallFor } from "@/docs/registry";
import { InstallCommand } from "./install-command";

describe("vueInstallFor", () => {
  it("returns shadcn-vue commands for a Vue registry item", () => {
    expect(vueInstallFor("data-table")).toEqual({
      npm: "npx shadcn-vue@latest add @chelone/data-table",
      pnpm: "pnpm dlx shadcn-vue@latest add @chelone/data-table",
      yarn: "yarn dlx shadcn-vue@latest add @chelone/data-table",
      bun: "bunx shadcn-vue@latest add @chelone/data-table",
    });
  });

  it("returns null for a name the Vue registry lacks", () => {
    // `accordion` is a React registry item with no Vue counterpart.
    expect(vueInstallFor("accordion")).toBeNull();
    expect(vueInstallFor(undefined)).toBeNull();
  });
});

function renderInstall(withVue: boolean) {
  const install = installFor("data-table");
  if (!install) throw new Error("data-table must be a React registry item");
  return render(
    <MemoryRouter>
      <InstallCommand
        install={install}
        vue={withVue ? vueInstallFor("data-table") : undefined}
      />
    </MemoryRouter>,
  );
}

describe("InstallCommand", () => {
  it("with a Vue command, choosing Vue shows the shadcn-vue command and the registry link", () => {
    renderInstall(true);

    expect(
      screen.getByText("pnpm dlx shadcn@latest add @chelone/data-table"),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: /registry/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Vue" }));

    expect(
      screen.getByText("pnpm dlx shadcn-vue@latest add @chelone/data-table"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "npm" }));
    expect(
      screen.getByText("npx shadcn-vue@latest add @chelone/data-table"),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /registry/i }).getAttribute("href"),
    ).toBe("/docs/getting-started/install#install-for-vue");
  });

  it("without a Vue command, no framework switch renders", () => {
    renderInstall(false);

    expect(screen.queryByRole("button", { name: "Vue" })).toBeNull();
    expect(screen.queryByRole("button", { name: "React" })).toBeNull();
    expect(
      screen.getByText("pnpm dlx shadcn@latest add @chelone/data-table"),
    ).toBeTruthy();
  });
});
