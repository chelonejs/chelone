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

import {
  fakeDataProvider,
  type RegisteredPermissions,
  type ResourceDefinition,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { type ComponentType, type ReactNode, useState } from "react";
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

/** What `useRegisterResources` takes: the registered type, or none yet. */
type Permissions = RegisteredPermissions | undefined;

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

/** The static shape the registry partition + registration hook read off a marker. */
interface ResourceMarker {
  chelName: "Resource";
  registerResource: (
    props: Record<string, unknown>,
    permissions: unknown,
  ) => ResourceDefinition;
}

/** Build a `<Resource>`-shaped marker with a bespoke permission-aware registrar. */
function makeMarker(
  registerResource: ResourceMarker["registerResource"],
): ResourceMarker & ((props: Record<string, unknown>) => null) {
  const marker = ((_: Record<string, unknown>) => null) as ResourceMarker &
    ((props: Record<string, unknown>) => null);
  Object.defineProperty(marker, "chelName", { value: "Resource" });
  marker.registerResource = registerResource;
  return marker;
}

/** hasCreate is granted only to the "admin" permission (a captured signature field). */
const PermissionAwareResource = makeMarker((props, permissions) => ({
  name: props.name as string,
  hasList: true,
  hasCreate: permissions === "admin",
  hasEdit: false,
  hasShow: false,
  icon: undefined,
  recordRepresentation: undefined,
  options: undefined,
}));

/**
 * options flips undefined → `{}` on the "admin" permission. Both
 * collapse to the same signature token, so ONLY the `permissions` effect dep
 * (not the signature) can force the entry to track the change.
 */
const NullReprResource = makeMarker((props, permissions) => ({
  name: props.name as string,
  hasList: true,
  hasCreate: false,
  hasEdit: false,
  hasShow: false,
  icon: undefined,
  recordRepresentation: undefined,
  options: permissions === "admin" ? {} : undefined,
}));

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
      undefined,
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

  it("re-registers the entry when a permission-aware registrar's definition flips (hasCreate)", () => {
    // A permission-aware custom `<Resource>` marker: hasCreate is granted only
    // to the "admin" permission. This is the ra-core contract — the registrar
    // re-runs on a permissions change and the REGISTRY ENTRY tracks it. The old
    // test spied on registerResource call COUNT, which the render body bumps
    // every render regardless of any effect re-run — vacuous. Here we assert the
    // stored definition itself changes.
    const { Wrapper, registryRef } = registryWrapper();
    function Register({ permissions }: { permissions: Permissions }) {
      useRegisterResources(
        <PermissionAwareResource name="posts" list={ListView} />,
        permissions,
      );
      return null;
    }
    function Harness() {
      const [permissions, setPermissions] = useState<Permissions>("viewer");
      return (
        <Wrapper>
          <Register permissions={permissions} />
          <button
            type="button"
            data-testid="promote"
            onClick={() => setPermissions("admin")}
          >
            promote
          </button>
        </Wrapper>
      );
    }
    render(<Harness />);
    // viewer: no create.
    expect(registryRef.current?.get("posts")?.hasCreate).toBe(false);
    act(() => {
      screen.getByTestId("promote").click();
    });
    // admin: the flip re-ran the registrar and the stored entry now grants create.
    expect(registryRef.current?.get("posts")?.hasCreate).toBe(true);
  });

  it("re-registers on a permission flip even when the definition signature is lossy (empty vs absent options)", () => {
    // The signature key serializes `options` by key, and both
    // an empty bag and `undefined` collapse to the empty token. Keying the effect on
    // `permissions` (not just the signature) guarantees the entry still tracks a
    // permission-dependent change the signature can't distinguish — matching
    // ra-core, which re-runs registration on every permissions change.
    const { Wrapper, registryRef } = registryWrapper();
    function Register({ permissions }: { permissions: Permissions }) {
      useRegisterResources(
        <NullReprResource name="posts" list={ListView} />,
        permissions,
      );
      return null;
    }
    function Harness() {
      const [permissions, setPermissions] = useState<Permissions>("viewer");
      return (
        <Wrapper>
          <Register permissions={permissions} />
          <button
            type="button"
            data-testid="promote"
            onClick={() => setPermissions("admin")}
          >
            promote
          </button>
        </Wrapper>
      );
    }
    render(<Harness />);
    expect(registryRef.current?.get("posts")?.options).toBe(undefined);
    act(() => {
      screen.getByTestId("promote").click();
    });
    // Signature is byte-identical across the flip; only the `permissions` dep
    // forces the re-run that updates the entry to the admin value.
    expect(registryRef.current?.get("posts")?.options).toEqual({});
  });

  it("does NOT churn subscribers when a permission-INDEPENDENT registrar's permissions flip", () => {
    // The default `<Resource>` ignores permissions, so a flip recomputes an
    // identical definition. The core isEqual-guard must absorb the re-register
    // (no notify) — the `permissions` dep must not reintroduce redundant churn.
    const { Wrapper, registryRef } = registryWrapper();
    function Register({ permissions }: { permissions: Permissions }) {
      useRegisterResources(
        <Resource name="posts" list={ListView} />,
        permissions,
      );
      return null;
    }
    function Harness() {
      const [permissions, setPermissions] = useState<Permissions>("role-a");
      return (
        <Wrapper>
          <Register permissions={permissions} />
          <button
            type="button"
            data-testid="flip"
            onClick={() => setPermissions("role-b")}
          >
            flip
          </button>
        </Wrapper>
      );
    }
    render(<Harness />);
    const registry = registryRef.current;
    if (!registry) throw new Error("no registry captured");
    const listener = vi.fn();
    const unsub = registry.subscribe(listener);
    act(() => {
      screen.getByTestId("flip").click();
    });
    // Permission-independent definition unchanged → isEqual-guard no-op → no notify.
    expect(listener).not.toHaveBeenCalled();
    unsub();
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

  it("re-registers when a non-name prop flips at runtime (hasEdit false → true)", () => {
    const { Wrapper, registryRef } = registryWrapper();
    function Register() {
      const [hasEdit, setHasEdit] = useState(false);
      useRegisterResources(
        <Resource name="posts" list={ListView} hasEdit={hasEdit} />,
        undefined,
      );
      return (
        <button
          type="button"
          data-testid="grant-edit"
          onClick={() => setHasEdit(true)}
        >
          grant edit
        </button>
      );
    }
    render(
      <Wrapper>
        <Register />
      </Wrapper>,
    );
    // Same name, but hasEdit changed — the stored definition must stay current.
    expect(registryRef.current?.get("posts")?.hasEdit).toBe(false);
    act(() => {
      screen.getByTestId("grant-edit").click();
    });
    expect(registryRef.current?.get("posts")?.hasEdit).toBe(true);
  });

  it("re-registers when the options bag changes at runtime (same name)", () => {
    const { Wrapper, registryRef } = registryWrapper();
    function Register() {
      const [group, setGroup] = useState("content");
      useRegisterResources(
        <Resource name="posts" list={ListView} options={{ group }} />,
        undefined,
      );
      return (
        <button
          type="button"
          data-testid="regroup"
          onClick={() => setGroup("admin")}
        >
          regroup
        </button>
      );
    }
    render(
      <Wrapper>
        <Register />
      </Wrapper>,
    );
    expect(registryRef.current?.get("posts")?.options).toEqual({
      group: "content",
    });
    act(() => {
      screen.getByTestId("regroup").click();
    });
    expect(registryRef.current?.get("posts")?.options).toEqual({
      group: "admin",
    });
  });

  it("re-registers when a view slot changes reference at runtime (edit swap flips hasEdit)", () => {
    const { Wrapper, registryRef } = registryWrapper();
    const ListA = () => <div>a</div>;
    const EditB = () => <div>b</div>;
    function Register() {
      const [swapped, setSwapped] = useState(false);
      useRegisterResources(
        // hasEdit derived from the edit slot's presence flips false → true.
        <Resource
          name="posts"
          list={ListA}
          edit={swapped ? EditB : undefined}
        />,
        undefined,
      );
      return (
        <button
          type="button"
          data-testid="swap"
          onClick={() => setSwapped(true)}
        >
          swap
        </button>
      );
    }
    render(
      <Wrapper>
        <Register />
      </Wrapper>,
    );
    expect(registryRef.current?.get("posts")?.hasEdit).toBe(false);
    act(() => {
      screen.getByTestId("swap").click();
    });
    expect(registryRef.current?.get("posts")?.hasEdit).toBe(true);
  });

  it("re-registers when the icon reference swaps but no has* flag changes", () => {
    const { Wrapper, registryRef } = registryWrapper();
    const IconA = () => <span>a</span>;
    const IconB = () => <span>b</span>;
    function Register() {
      const [icon, setIcon] = useState<ComponentType>(() => IconA);
      useRegisterResources(
        <Resource name="posts" list={ListView} icon={icon} />,
        undefined,
      );
      return (
        <button
          type="button"
          data-testid="swap-icon"
          onClick={() => setIcon(() => IconB)}
        >
          swap icon
        </button>
      );
    }
    render(
      <Wrapper>
        <Register />
      </Wrapper>,
    );
    // Only the icon reference changes — no route flag flips. The stored
    // definition must still track the new icon (reference-identity keying).
    expect(registryRef.current?.get("posts")?.icon).toBe(IconA);
    act(() => {
      screen.getByTestId("swap-icon").click();
    });
    expect(registryRef.current?.get("posts")?.icon).toBe(IconB);
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
