import { createStore, memoryStoreAdapter } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { makeDemoAuthProvider } from "./auth";
import { PERMISSIONS_KEY, ROLE_KEY } from "./team";

function setup() {
  const store = createStore(memoryStoreAdapter());
  const auth = makeDemoAuthProvider(store);
  const can = (action: string, resource: string) =>
    auth.canAccess?.({ action, resource });
  return { store, can };
}

describe("the demo auth provider's access", () => {
  it("lets a visitor who has not chosen a role do everything, so the demo opens unchanged", async () => {
    const { can } = setup();

    expect(await can("edit", "roles")).toBe(true);
    expect(await can("delete", "posts")).toBe(true);
  });

  it("keeps the role section to admins: an editor edits posts but not roles", async () => {
    const { store, can } = setup();
    store.setItem(ROLE_KEY, "editor");

    expect(await can("edit", "posts")).toBe(true);
    expect(await can("edit", "roles")).toBe(false);
  });

  it("lets a viewer read but not write", async () => {
    const { store, can } = setup();
    store.setItem(ROLE_KEY, "viewer");

    expect(await can("list", "posts")).toBe(true);
    expect(await can("edit", "posts")).toBe(false);
  });

  it("follows the role matrix once someone edits it", async () => {
    const { store, can } = setup();
    store.setItem(ROLE_KEY, "viewer");
    store.setItem(PERMISSIONS_KEY, {
      viewer: [{ resource: "posts", action: ["edit"] }],
    });

    expect(await can("edit", "posts")).toBe(true);
    expect(await can("list", "posts")).toBe(false);
  });

  it("denies a role the matrix does not list", async () => {
    const { store, can } = setup();
    store.setItem(ROLE_KEY, "intern");

    expect(await can("list", "posts")).toBe(false);
  });
});
