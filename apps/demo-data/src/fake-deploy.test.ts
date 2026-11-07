import { createApplicationUpdateStore } from "@chelone/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeDeploy } from "./fake-deploy";

afterEach(() => vi.unstubAllGlobals());

describe("a fake deploy", () => {
  it("serves a build at its url that changes with each release, and leaves other urls to fetch", async () => {
    const realFetch = vi.fn(async () => new Response("elsewhere"));
    vi.stubGlobal("fetch", realFetch);
    const deploy = createFakeDeploy();
    const uninstall = deploy.install();

    const first = await (await fetch(deploy.url)).text();
    deploy.release();
    const second = await (await fetch(deploy.url)).text();
    const other = await (await fetch("/elsewhere")).text();

    expect(second).not.toBe(first);
    expect(other).toBe("elsewhere");
    uninstall();
    expect(fetch).toBe(realFetch);
  });

  it("is what makes the application update store report a new version", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const deploy = createFakeDeploy();
    const uninstall = deploy.install();
    const store = createApplicationUpdateStore({
      url: deploy.url,
      interval: 5,
    });
    const unsubscribe = store.subscribe(() => {});
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(store.getSnapshot().hasNewVersion).toBe(false);

    deploy.release();

    await vi.waitFor(() =>
      expect(store.getSnapshot().hasNewVersion).toBe(true),
    );
    unsubscribe();
    uninstall();
  });
});
