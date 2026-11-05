import {
  createNotificationStore,
  createStore,
  type FieldErrors,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import {
  createMemoryRouter,
  MemoryRouter,
  Outlet,
  RouterProvider,
} from "react-router";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../context";
import { CheloneFormProvider } from "../form-context";
import { useForm } from "../form-hooks";
import { RouterAdapterProvider, useRouterAdapter } from "../router/adapter";
import { useNavigate } from "../router/nav-hooks";
import { reactRouterAdapter } from "../router/react-router-adapter";
import { useWarnWhenUnsavedChanges } from "./warn-unsaved-changes";

interface FormValues {
  title?: string;
}

const adapter = reactRouterAdapter;

/** A save that never errors (resolves `undefined` = no field errors). */
const okSave = async (): Promise<FieldErrors | undefined> => undefined;

function makeProviders() {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider({});
  const store = createStore();
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <RouterAdapterProvider adapter={adapter}>
        <CheloneProvider
          dataProvider={dataProvider}
          queryClient={queryClient}
          store={store}
          notifications={notifications}
        >
          {children}
        </CheloneProvider>
      </RouterAdapterProvider>
    );
  };
}

/**
 * A form host that arms `useWarnWhenUnsavedChanges` and exposes the returned
 * decision + a raw setter to make the form dirty and a submit trigger. Mounted
 * at `/posts/1` (the form root) inside a DATA router so the router blocker is
 * live. Navigating to `/posts` (outside) must block; to `/posts/1/show` or
 * `/posts/1/tab` (inside/show) must not.
 */
function makeFormHost({
  enable = true,
  formRootPathname = "/posts/1",
}: {
  enable?: boolean;
  formRootPathname?: string;
} = {}) {
  const captured: {
    decision: ReturnType<typeof useWarnWhenUnsavedChanges> | null;
    setDirty: (() => void) | null;
    restore: (() => void) | null;
    submit: (() => Promise<void>) | null;
    navigate: ((to: string) => void) | null;
  } = {
    decision: null,
    setDirty: null,
    restore: null,
    submit: null,
    navigate: null,
  };

  function FormHost() {
    const form = useForm<FormValues>({ save: okSave });
    const [, force] = useState(0);
    captured.submit = form.submit;
    captured.setDirty = () => {
      // Write a non-default value — flips isDefaultValue false (dirty).
      form.form.setFieldValue("title", "changed");
      force((n) => n + 1);
    };
    captured.restore = () => {
      // Write the default value (undefined) BACK. form-core's sticky `isDirty`
      // stays true (ever-modified — ground truth #7), but `isDefaultValue`
      // deep-equals the baseline again and returns to true. This is the exact
      // state that discriminates an `isDefaultValue`-keyed impl (must NOT block)
      // from a sticky-`isDirty`-keyed one (would wrongly still block).
      form.form.setFieldValue("title", undefined);
      force((n) => n + 1);
    };
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        <WarnHost />
      </CheloneFormProvider>
    );
  }

  function WarnHost() {
    captured.decision = useWarnWhenUnsavedChanges(enable, formRootPathname);
    const nav = useNavigate();
    captured.navigate = (to: string) => nav(to);
    return null;
  }

  const Providers = makeProviders();
  const router = createMemoryRouter(
    [
      {
        path: "/posts/1",
        element: (
          <Providers>
            <FormHost />
          </Providers>
        ),
      },
      { path: "/posts", element: <span data-testid="list">list</span> },
      {
        path: "/posts/1/show",
        element: <span data-testid="show">show</span>,
      },
    ],
    { initialEntries: ["/posts/1"] },
  );
  const view = render(<RouterProvider router={router} />);
  return { captured, view };
}

afterEach(() => {
  // This package's vitest config has no global RTL auto-cleanup, so unmount
  // explicitly — otherwise window-level `beforeunload` listeners leak across
  // tests and contaminate the pristine-vs-dirty assertions.
  cleanup();
  vi.restoreAllMocks();
});

/**
 * When the blocker does NOT block, react-router v7's DATA-router navigation
 * COMPLETES, and completing a data navigation under this jsdom + Node env trips
 * a known undici/jsdom `AbortSignal` incompatibility (documented in
 * router-adapter.test.tsx: "a real data-router NAVIGATION cannot land under
 * this jsdom env"). It surfaces as an UNHANDLED REJECTION unrelated to this
 * hook, and lands ASYNCHRONOUSLY (often after the test that triggered it), so a
 * per-suite restore would let a late one escape. Vitest runs each test file in
 * its OWN forked worker (default `forks` pool), so installing a MODULE-LEVEL
 * filter for the file's whole lifetime is safe — it cannot leak to other files.
 * Displace vitest's own rejection handler, swallow ONLY that exact
 * environmental noise, and record anything else so a genuine rejection still
 * fails the run (asserted in `afterAll`).
 */
// `@chelone/react`'s tsconfig omits @types/node, so reach Node's `process`
// through a minimally-typed local handle rather than the global (keeps the
// `--typecheck` pass green without pulling node types into the package).
interface RejectionProcess {
  removeAllListeners(event: string): void;
  on(event: string, listener: (reason: unknown) => void): void;
}
const nodeProcess = (globalThis as { process?: RejectionProcess }).process;

const isJsdomAbortSignalNoise = (reason: unknown): boolean =>
  reason instanceof Error &&
  /Expected signal .* to be an instance of AbortSignal/.test(reason.message);
const unexpectedRejections: unknown[] = [];
nodeProcess?.removeAllListeners("unhandledRejection");
nodeProcess?.on("unhandledRejection", (reason: unknown) => {
  if (!isJsdomAbortSignalNoise(reason)) unexpectedRejections.push(reason);
});
afterAll(() => {
  // Any late abortsignal rejection is swallowed by the handler above; assert no
  // NON-environmental rejection slipped through.
  expect(unexpectedRejections).toEqual([]);
});

describe("useWarnWhenUnsavedChanges — router blocking", () => {
  it("does NOT block navigation when the form is pristine", async () => {
    const { captured } = makeFormHost();
    expect(captured.decision?.isBlocked).toBe(false);
    await act(async () => captured.navigate?.("/posts"));
    expect(captured.decision?.isBlocked).toBe(false);
  });

  it("BLOCKS navigation to an OUTSIDE location when the form is dirty", async () => {
    const { captured } = makeFormHost();
    await act(async () => captured.setDirty?.());
    await act(async () => captured.navigate?.("/posts"));
    expect(captured.decision?.isBlocked).toBe(true);
    expect(typeof captured.decision?.proceed).toBe("function");
    expect(typeof captured.decision?.cancel).toBe("function");
  });

  it("does NOT block navigation INSIDE the form (same root) while dirty", async () => {
    const { captured } = makeFormHost({ formRootPathname: "/posts" });
    // Root is /posts; navigating to /posts/1/show is inside... but /show is
    // exempt. Navigate to a sibling inside-form path instead.
    await act(async () => captured.setDirty?.());
    // /posts/1 startsWith /posts and is not a /show view -> inside form -> allow.
    await act(async () => captured.navigate?.("/posts/1"));
    expect(captured.decision?.isBlocked).toBe(false);
  });

  it("BLOCKS navigation to the /show view while dirty (show leaves the form — ra parity)", async () => {
    // ra-core + task predicate: `startsWith(root) && not /show -> allow`. The
    // `${root}/show` view is treated as LEAVING the form (edit -> read-only
    // show would discard changes), so it blocks.
    const { captured } = makeFormHost();
    await act(async () => captured.setDirty?.());
    await act(async () => captured.navigate?.("/posts/1/show"));
    expect(captured.decision?.isBlocked).toBe(true);
  });

  it("proceed() un-blocks so the navigation can continue", async () => {
    const { captured, view } = makeFormHost();
    await act(async () => captured.setDirty?.());
    await act(async () => captured.navigate?.("/posts"));
    expect(captured.decision?.isBlocked).toBe(true);
    await act(async () => captured.decision?.proceed());
    expect(view.getByTestId("list")).toBeDefined();
  });

  it("cancel() keeps the user on the form", async () => {
    const { captured, view } = makeFormHost();
    await act(async () => captured.setDirty?.());
    await act(async () => captured.navigate?.("/posts"));
    expect(captured.decision?.isBlocked).toBe(true);
    await act(async () => captured.decision?.cancel());
    expect(captured.decision?.isBlocked).toBe(false);
    expect(view.queryByTestId("list")).toBeNull();
  });

  it("does NOT block when `enable` is false even if dirty", async () => {
    const { captured } = makeFormHost({ enable: false });
    await act(async () => captured.setDirty?.());
    await act(async () => captured.navigate?.("/posts"));
    expect(captured.decision?.isBlocked).toBe(false);
  });

  it("does NOT block after a SUCCESSFUL submit (isSubmitSuccessful gate)", async () => {
    const { captured } = makeFormHost();
    await act(async () => captured.setDirty?.());
    // A successful save resets the form to the saved values (isDefaultValue
    // true again) AND sets isSubmitSuccessful — either way navigation is free.
    await act(async () => {
      await captured.submit?.();
    });
    await act(async () => captured.navigate?.("/posts"));
    expect(captured.decision?.isBlocked).toBe(false);
  });
});

describe("useWarnWhenUnsavedChanges — isDefaultValue (not sticky isDirty) drives it", () => {
  it("re-baselining to the default value un-blocks even though sticky isDirty stays true", async () => {
    const { captured } = makeFormHost();
    // 1. Dirty it -> isDefaultValue false, sticky isDirty true. A nav OUTSIDE
    //    the form root must block.
    await act(async () => {
      captured.setDirty?.();
    });
    await act(async () => captured.navigate?.("/posts"));
    expect(captured.decision?.isBlocked).toBe(true);
    // Cancel the block so we stay on the form and can re-baseline.
    await act(async () => captured.decision?.cancel());
    expect(captured.decision?.isBlocked).toBe(false);

    // 2. Restore the field to its default (undefined). form-core's sticky
    //    `isDirty` STAYS true (ever-modified — ground truth #7), but
    //    `isDefaultValue` deep-equals the baseline again and returns to true.
    await act(async () => {
      captured.restore?.();
    });

    // 3. THE DISCRIMINATOR: navigate OUTSIDE the form root again. An impl that
    //    keyed the block on the sticky `isDirty` would STILL block here (isDirty
    //    is stuck true). The correct `isDefaultValue`-keyed impl (GT#7) sees the
    //    form is back at baseline and must NOT block.
    await act(async () => captured.navigate?.("/posts"));
    expect(captured.decision?.isBlocked).toBe(false);
  });
});

describe("useWarnWhenUnsavedChanges — beforeunload (pure DOM half)", () => {
  function BeforeUnloadHost({
    enable,
    dirty,
  }: {
    enable: boolean;
    dirty: boolean;
  }) {
    function Host() {
      const form = useForm<FormValues>({ save: okSave });
      if (dirty) {
        // Make the form dirty synchronously for the assertion.
        form.form.setFieldValue("title", "x");
      }
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          <Warn />
        </CheloneFormProvider>
      );
    }
    function Warn() {
      useWarnWhenUnsavedChanges(enable);
      return null;
    }
    // A declarative host: no data router -> canBlock is false. The beforeunload
    // half must STILL register (it is pure DOM, shipped unconditionally).
    const Providers = makeProviders();
    return (
      <MemoryRouter>
        <Providers>
          <Host />
        </Providers>
      </MemoryRouter>
    );
  }

  it("registers a beforeunload listener (pure DOM, no router needed)", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<BeforeUnloadHost enable dirty={false} />);
    expect(addSpy.mock.calls.some(([type]) => type === "beforeunload")).toBe(
      true,
    );
  });

  it("removes the beforeunload listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BeforeUnloadHost enable dirty={false} />);
    unmount();
    expect(removeSpy.mock.calls.some(([type]) => type === "beforeunload")).toBe(
      true,
    );
  });

  it("beforeunload preventDefault fires only when dirty + enabled", () => {
    render(<BeforeUnloadHost enable dirty />);
    const event = new Event("beforeunload", { cancelable: true });
    const prevented = !window.dispatchEvent(event);
    expect(prevented).toBe(true);
  });

  it("beforeunload does NOT preventDefault when pristine", () => {
    render(<BeforeUnloadHost enable dirty={false} />);
    const event = new Event("beforeunload", { cancelable: true });
    const prevented = !window.dispatchEvent(event);
    expect(prevented).toBe(false);
  });
});

describe("useWarnWhenUnsavedChanges — useCanBlock=false no-ops without throwing", () => {
  it("under a DECLARATIVE host (no data router) it never calls the throwing useBlocker", () => {
    // A declarative <MemoryRouter> makes useCanBlock() false; the adapter's
    // useBlocker THROWS there. The warn hook must gate on canBlock and never
    // reach it. Rendering must NOT throw.
    const Providers = makeProviders();
    function Host() {
      const form = useForm<FormValues>({ save: okSave });
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          <Warn />
        </CheloneFormProvider>
      );
    }
    function Warn() {
      const decision = useWarnWhenUnsavedChanges(true, "/posts/1");
      // Inert decision when it cannot block.
      expect(decision.isBlocked).toBe(false);
      return null;
    }
    expect(() =>
      render(
        <MemoryRouter>
          <Providers>
            <Host />
          </Providers>
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });

  it("warns once (dev) that unsaved-changes blocking is unavailable under a declarative host", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Providers = makeProviders();
    function Host() {
      const form = useForm<FormValues>({ save: okSave });
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          <Warn />
        </CheloneFormProvider>
      );
    }
    function Warn() {
      useWarnWhenUnsavedChanges(true);
      return null;
    }
    render(
      <MemoryRouter>
        <Providers>
          <Host />
        </Providers>
      </MemoryRouter>,
    );
    expect(
      warnSpy.mock.calls.some((args) =>
        String(args[0]).includes("useWarnWhenUnsavedChanges"),
      ),
    ).toBe(true);
  });
});

// Reference the adapter export so the import is exercised even if a test above
// is skipped (keeps the contract-import honest under --typecheck).
describe("adapter contract sanity", () => {
  it("exposes useCanBlock + useBlocker", () => {
    function Probe() {
      const a = useRouterAdapter();
      expect(typeof a.useCanBlock).toBe("function");
      expect(typeof a.useBlocker).toBe("function");
      return null;
    }
    const router = createMemoryRouter([
      { path: "/", element: <Outlet />, children: [] },
    ]);
    render(
      <RouterAdapterProvider adapter={adapter}>
        <RouterProvider router={router} />
        <Probe />
      </RouterAdapterProvider>,
    );
  });
});
