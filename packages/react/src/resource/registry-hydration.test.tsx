/**
 * The client half of the first-render seeding in `registry-ssr.test.tsx`: after
 * the first render has published the definitions, mounting must not notify
 * again, and the effects still own removal. Needs a DOM, so it lives beside the
 * `node` module rather than in it.
 */

import { createResourceRegistry } from "@chelone/core";
import { act, cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ResourceRegistryProvider,
  useRegisterResources,
  useResourceDefinitions,
} from "./registry-hooks";
import { Resource } from "./resource";

afterEach(cleanup);

const List = () => <div>list</div>;

/** Registers `children` and lists the registered names. */
function Shell({ children }: { children: ReactNode }) {
  useRegisterResources(children, undefined);
  const names = Object.keys(useResourceDefinitions());
  return (
    <ul>
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}

describe("first-render seeding on the client", () => {
  it("hydration does not re-notify", async () => {
    const registry = createResourceRegistry();
    const app = (
      <ResourceRegistryProvider registry={registry}>
        <Shell>
          <Resource name="posts" list={List} />
          <Resource name="comments" list={List} />
        </Shell>
      </ResourceRegistryProvider>
    );
    // The server render publishes both definitions before anything subscribes.
    const html = renderToString(app);
    expect(Object.keys(registry.getAll())).toEqual(["posts", "comments"]);

    const listener = vi.fn();
    registry.subscribe(listener);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const root = await act(async () => hydrateRoot(container, app));

    expect(container.textContent).toBe("postscomments");
    expect(listener).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
  });

  it("a StrictMode mount leaves one entry per resource", () => {
    const registry = createResourceRegistry();
    render(
      <StrictMode>
        <ResourceRegistryProvider registry={registry}>
          <Shell>
            <Resource name="posts" list={List} />
          </Shell>
        </ResourceRegistryProvider>
      </StrictMode>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(Object.keys(registry.getAll())).toEqual(["posts"]);
  });

  it("removing a resource still unregisters it", () => {
    const both = (
      <>
        <Resource name="posts" list={List} />
        <Resource name="comments" list={List} />
      </>
    );
    const wrap = (children: ReactNode) => (
      <ResourceRegistryProvider>
        <Shell>{children}</Shell>
      </ResourceRegistryProvider>
    );
    const { rerender } = render(wrap(both));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    rerender(wrap(<Resource name="posts" list={List} />));
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      ["posts"],
    );
  });
});
