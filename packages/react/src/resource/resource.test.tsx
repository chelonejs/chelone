/**
 * W1-T5 tests: the `<Resource>` marker + registry React layer.
 *
 * Four behavior clusters (plan §2 W1-T5):
 * 1. Registration lifecycle — mount registers, unmount unregisters, a
 *    permissions change re-runs registration, isEqual-guarded so a stable
 *    definition does not churn subscribers.
 * 2. Sub-route order — create → show → edit → list; `:id/show` is NOT swallowed
 *    by the `:id/*` edit splat (the deliberate order, parity §0a-6).
 * 3. ResourceContext — prop override wins over the ambient context value.
 * 4. Definitions map — `useResourceDefinitions` exposes the whole map;
 *    `useResourceDefinition` merges a prop override over the registry entry.
 *
 * Uses @testing-library/react with a MemoryRouter host (via the react-router
 * adapter) so nested `<Routes>` matching is observable.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../context";
import { RouterAdapterProvider } from "../router/adapter";
import { reactRouterAdapter } from "../router/react-router-adapter";
import {
  ResourceRegistryProvider,
  useRegisterResources,
  useResourceDefinition,
  useResourceDefinitions,
  useResourceRegistry,
} from "./registry-hooks";
import { Resource } from "./resource";
import {
  ResourceContextProvider,
  useResourceContext,
} from "./resource-context";

afterEach(() => {
  cleanup();
});

const dataProvider = fakeDataProvider({});

/** Providers a `<Resource>` needs: chelone context + router adapter + a host router. */
function Providers({
  children,
  initial = "/posts",
}: {
  children: ReactNode;
  initial?: string;
}) {
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={new QueryClient()}
    >
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <ResourceRegistryProvider>
          <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
        </ResourceRegistryProvider>
      </RouterAdapterProvider>
    </CheloneProvider>
  );
}

// Simple view components stamped with a testid so route matching is observable.
const ListView = () => <div data-testid="list">list</div>;
const CreateView = () => <div data-testid="create">create</div>;
const ShowView = () => <div data-testid="show">show</div>;
const EditView = () => <div data-testid="edit">edit</div>;

describe("Resource — marker + static registration contract", () => {
  it("carries the chelName='Resource' marker for the partition", () => {
    expect(Resource.chelName).toBe("Resource");
  });

  it("has a static registerResource(props, permissions) → ResourceDefinition", () => {
    expect(typeof Resource.registerResource).toBe("function");
    const def = Resource.registerResource(
      {
        name: "posts",
        list: ListView,
        create: CreateView,
        show: ShowView,
        edit: EditView,
        options: { group: "content" },
      },
      undefined,
    );
    expect(def).toEqual({
      name: "posts",
      hasList: true,
      hasCreate: true,
      hasEdit: true,
      hasShow: true,
      icon: undefined,
      recordRepresentation: undefined,
      options: { group: "content" },
    });
  });

  it("derives has* flags from component presence (list-only)", () => {
    const def = Resource.registerResource(
      { name: "tags", list: ListView },
      null,
    );
    expect(def.hasList).toBe(true);
    expect(def.hasCreate).toBe(false);
    expect(def.hasEdit).toBe(false);
    expect(def.hasShow).toBe(false);
  });
});

describe("Resource — sub-route order (create → show → edit → list)", () => {
  it("renders the list at the resource root", () => {
    render(
      <Providers initial="/posts">
        <MemoryRoutedResource />
      </Providers>,
    );
    expect(screen.getByTestId("list")).toBeDefined();
  });

  it("renders create at /create", () => {
    render(
      <Providers initial="/posts/create">
        <MemoryRoutedResource />
      </Providers>,
    );
    expect(screen.getByTestId("create")).toBeDefined();
    expect(screen.queryByTestId("edit")).toBeNull();
  });

  it("renders show at /:id/show — NOT swallowed by the :id/* edit splat", () => {
    render(
      <Providers initial="/posts/7/show">
        <MemoryRoutedResource />
      </Providers>,
    );
    expect(screen.getByTestId("show")).toBeDefined();
    expect(screen.queryByTestId("edit")).toBeNull();
  });

  it("renders edit at /:id", () => {
    render(
      <Providers initial="/posts/7">
        <MemoryRoutedResource />
      </Providers>,
    );
    expect(screen.getByTestId("edit")).toBeDefined();
    expect(screen.queryByTestId("show")).toBeNull();
  });

  it("provides the resource name via ResourceContext to its views", () => {
    render(
      <Providers initial="/posts">
        <Resource name="posts" list={ResourceNameProbe} />
      </Providers>,
    );
    expect(screen.getByTestId("ctx-resource").textContent).toBe("posts");
  });
});

/** A `<Resource>` wired with all four views, mounted under a parent `posts/*` route. */
function MemoryRoutedResource() {
  const { Routes, Route } = reactRouterAdapter;
  return (
    <Routes>
      <Route
        path="posts/*"
        element={
          <Resource
            name="posts"
            list={ListView}
            create={CreateView}
            show={ShowView}
            edit={EditView}
          />
        }
      />
    </Routes>
  );
}

/** Reads the ambient resource name (proves ResourceContextProvider wraps views). */
function ResourceNameProbe() {
  const resource = useResourceContext();
  return <div data-testid="ctx-resource">{resource}</div>;
}

describe("useResourceContext — prop override wins", () => {
  it("reads the ambient resource name", () => {
    const { result } = renderHook(() => useResourceContext(), {
      wrapper: ({ children }) => (
        <ResourceContextProvider value="comments">
          {children}
        </ResourceContextProvider>
      ),
    });
    expect(result.current).toBe("comments");
  });

  it("a resource prop overrides the ambient context value", () => {
    const { result } = renderHook(
      () => useResourceContext({ resource: "authors" }),
      {
        wrapper: ({ children }) => (
          <ResourceContextProvider value="comments">
            {children}
          </ResourceContextProvider>
        ),
      },
    );
    expect(result.current).toBe("authors");
  });

  it("returns undefined with no context and no prop", () => {
    const { result } = renderHook(() => useResourceContext());
    expect(result.current).toBeUndefined();
  });

  it("ResourceContextProvider renders children directly when value is empty", () => {
    render(
      <ResourceContextProvider value={undefined}>
        <ResourceNameProbe />
      </ResourceContextProvider>,
    );
    // No provider → falls through to the context default (undefined).
    expect(screen.getByTestId("ctx-resource").textContent).toBe("");
  });
});

describe("useRegisterResources — lifecycle", () => {
  function registryWrapper() {
    const registryRef: {
      current: ReturnType<typeof useResourceRegistry> | null;
    } = { current: null };
    function Capture() {
      registryRef.current = useResourceRegistry();
      return null;
    }
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <ResourceRegistryProvider>
          <Capture />
          {children}
        </ResourceRegistryProvider>
      );
    }
    return { Wrapper, registryRef };
  }

  it("registers resources on mount", () => {
    const { Wrapper, registryRef } = registryWrapper();
    function Register() {
      useRegisterResources(
        <Resource name="posts" list={ListView} edit={EditView} />,
        undefined,
      );
      return null;
    }
    render(
      <Wrapper>
        <Register />
      </Wrapper>,
    );
    expect(registryRef.current?.get("posts")).toEqual({
      name: "posts",
      hasList: true,
      hasCreate: false,
      hasEdit: true,
      hasShow: false,
      icon: undefined,
      recordRepresentation: undefined,
      options: undefined,
    });
  });

  it("unregisters resources on unmount", () => {
    const { Wrapper, registryRef } = registryWrapper();
    function Register() {
      useRegisterResources(
        <Resource name="posts" list={ListView} />,
        undefined,
      );
      return null;
    }
    const { unmount } = render(
      <Wrapper>
        <Register />
      </Wrapper>,
    );
    expect(registryRef.current?.get("posts")).toBeDefined();
    unmount();
    expect(registryRef.current?.get("posts")).toBeUndefined();
  });

  it("recurses Fragment children and ignores non-resource elements", () => {
    const { Wrapper, registryRef } = registryWrapper();
    function Register() {
      useRegisterResources(
        <>
          <Resource name="posts" list={ListView} />
          <div>not a resource</div>
          <Resource name="comments" list={ListView} />
        </>,
        undefined,
      );
      return null;
    }
    render(
      <Wrapper>
        <Register />
      </Wrapper>,
    );
    expect(registryRef.current?.get("posts")).toBeDefined();
    expect(registryRef.current?.get("comments")).toBeDefined();
    expect(Object.keys(registryRef.current?.getAll() ?? {})).toEqual([
      "posts",
      "comments",
    ]);
  });

  it("re-runs registration when permissions change", () => {
    const registerSpy = vi.spyOn(Resource, "registerResource");
    function Register({ permissions }: { permissions: unknown }) {
      useRegisterResources(
        <Resource name="posts" list={ListView} />,
        permissions,
      );
      return null;
    }
    function Harness() {
      const [permissions, setPermissions] = useState<unknown>("role-a");
      return (
        <ResourceRegistryProvider>
          <Register permissions={permissions} />
          <button
            type="button"
            data-testid="flip"
            onClick={() => setPermissions("role-b")}
          >
            flip
          </button>
        </ResourceRegistryProvider>
      );
    }
    render(<Harness />);
    const callsAfterMount = registerSpy.mock.calls.length;
    act(() => {
      screen.getByTestId("flip").click();
    });
    // Permissions flip re-ran registerResource (register + prior-unregister).
    expect(registerSpy.mock.calls.length).toBeGreaterThan(callsAfterMount);
    const lastCall = registerSpy.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe("role-b");
    registerSpy.mockRestore();
  });

  it("does not notify subscribers when a stable definition re-registers", () => {
    const { Wrapper, registryRef } = registryWrapper();
    function Register() {
      const [, force] = useState(0);
      useRegisterResources(
        <Resource name="posts" list={ListView} />,
        undefined,
      );
      return (
        <button
          type="button"
          data-testid="rerender"
          onClick={() => force((n) => n + 1)}
        >
          rerender
        </button>
      );
    }
    render(
      <Wrapper>
        <Register />
      </Wrapper>,
    );
    const registry = registryRef.current;
    if (!registry) throw new Error("no registry captured");
    const listener = vi.fn();
    const unsub = registry.subscribe(listener);
    // A re-render must NOT re-notify: the definition is unchanged (isEqual-guard).
    act(() => {
      screen.getByTestId("rerender").click();
    });
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });
});

describe("useResourceDefinitions / useResourceDefinition", () => {
  function withRegistered(children: ReactNode, extra?: ReactNode) {
    function Register() {
      useRegisterResources(
        <>
          <Resource
            name="posts"
            list={ListView}
            edit={EditView}
            options={{ group: "content" }}
          />
          <Resource name="comments" list={ListView} show={ShowView} />
        </>,
        undefined,
      );
      return null;
    }
    return (
      <ResourceRegistryProvider>
        <Register />
        {children}
        {extra}
      </ResourceRegistryProvider>
    );
  }

  it("useResourceDefinitions returns the whole registry map", () => {
    let map: Record<string, unknown> = {};
    function Probe() {
      map = useResourceDefinitions();
      return null;
    }
    render(withRegistered(<Probe />));
    expect(Object.keys(map)).toEqual(["posts", "comments"]);
    expect(map.posts).toMatchObject({ name: "posts", hasEdit: true });
  });

  it("useResourceDefinition reads the ambient resource's definition", () => {
    let def: Record<string, unknown> = {};
    function Probe() {
      def = useResourceDefinition() as Record<string, unknown>;
      return null;
    }
    render(
      withRegistered(
        <ResourceContextProvider value="posts">
          <Probe />
        </ResourceContextProvider>,
      ),
    );
    expect(def).toMatchObject({
      name: "posts",
      hasList: true,
      hasEdit: true,
      options: { group: "content" },
    });
  });

  it("useResourceDefinition merges an explicit resource prop", () => {
    let def: Record<string, unknown> = {};
    function Probe() {
      def = useResourceDefinition({ resource: "comments" }) as Record<
        string,
        unknown
      >;
      return null;
    }
    render(
      withRegistered(
        <ResourceContextProvider value="posts">
          <Probe />
        </ResourceContextProvider>,
      ),
    );
    // The prop wins over the ambient "posts".
    expect(def).toMatchObject({ name: "comments", hasShow: true });
  });

  it("useResourceDefinition overrides has* flags via props (prop-override merge)", () => {
    let def: Record<string, unknown> = {};
    function Probe() {
      def = useResourceDefinition({
        resource: "comments",
        hasEdit: true,
      }) as Record<string, unknown>;
      return null;
    }
    render(withRegistered(<Probe />));
    // comments has no edit in the registry, but the prop override forces it.
    expect(def.hasEdit).toBe(true);
    expect(def.hasShow).toBe(true);
  });
});

describe("registry hooks — provider guards", () => {
  it("useResourceRegistry throws outside a ResourceRegistryProvider", () => {
    expect(() => renderHook(() => useResourceRegistry())).toThrow(
      /ResourceRegistryProvider/,
    );
  });
});
