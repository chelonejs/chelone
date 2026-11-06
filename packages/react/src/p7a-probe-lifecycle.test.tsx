/**
 * P7a W-A — ADVERSARIAL LIFECYCLE PROBE for the compat layer's stateful hooks.
 *
 * Fresh-eyes attack on every P7a compat symbol that introduces state or a
 * subscription. The unit suites (`use-list.test.tsx`, `record-context.test.tsx`,
 * …) prove FUNCTIONAL parity; this probe attacks the LIFECYCLE seams they leave:
 * mount/unmount churn, StrictMode double-invoke, Suspense/discard mid-flight,
 * selection state under re-render, snapshot identity, and re-render storms.
 *
 * PRIMARY TARGET — `useList` (a client-side list CONTROLLER: the one P7a hook
 * that owns a micro-store + a `useSyncExternalStore` subscription):
 *
 *  L1. 50× mount/unmount churn leaves the controller's SUBSCRIBER SET bounded —
 *      no zombie useSyncExternalStore subscriptions accumulate. (The unit suite
 *      never counts subscribers.) On full unmount the set returns to empty.
 *  L2. StrictMode double-mount nets exactly ONE live subscription (React's
 *      dev-mode mount→unmount→remount must not leak a subscription), and state
 *      set between the doubled mounts survives — no split-brain controller.
 *  L3. Suspense-discard: a controller whose host is thrown away mid-life (the
 *      render that created it is discarded, or it unmounts before an action)
 *      leaves NO live subscription and its post-unmount actions are inert
 *      no-ops (the core `destroyed` guard) — no act-warning, no zombie write.
 *  L4. Selection state is STABLE across unrelated parent re-renders (a churny
 *      dashboard re-rendering the list's parent must not drop selectedIds) and
 *      selection identity only changes when selection changes.
 *  L5. No re-render storm: a burst of prop changes with IDENTICAL content
 *      (fresh array/object each render, same values) does NOT thrash the
 *      derived slice — the render count stays bounded (JSON-key guard parity).
 *  L6. Snapshot identity is STABLE across a re-render that changes nothing —
 *      `useSyncExternalStore` returns the same object, and the memoized result
 *      is referentially stable, so a memo'd consumer does not re-render.
 *
 * CONTEXT PROVIDERS (record-view Edit/Show/Create, RecordContext, Chelone):
 *
 *  L7. A provider whose `value` is referentially stable across a parent
 *      re-render does NOT re-render a memo'd consumer (no spurious context
 *      propagation). 50× parent churn with a stable value = consumer renders
 *      exactly once.
 *
 * PURE-ISH READERS (useRecordContext / useFieldValue / label helpers):
 *
 *  L8. `useRecordContext` + `useFieldValue` cause NO re-render beyond their
 *      context dependency: when the RecordContext value is unchanged, a parent
 *      re-render does not re-run a memo'd field consumer; when the record
 *      changes, it re-renders exactly once.
 *
 * Non-vacuity: every teardown/guard seam was mutation-verified — breaking the
 * useSyncExternalStore teardown reds L1/L2/L3; recreating the controller per
 * render reds L4; a reference (not key) data-effect dep reds L5; dropping the
 * result useMemo reds L6; a fresh-value provider reds L7/L8; removing the
 * controller+store `destroyed` guards reds L3b. See the report's mutation matrix.
 */

import type { ResourceRecord } from "@chelone/core";
import { defined } from "@chelone/test-utils";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { memo, StrictMode, useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RecordContextProvider,
  useRecordContext,
} from "./record/record-context";
import { useFieldValue } from "./record/use-field-value";
import { useList } from "./use-list";

/**
 * Hoisted subscription bookkeeping shared with the `@chelone/core` mock below.
 * `vi.mock` factories are hoisted above imports, so the counter must live in a
 * `vi.hoisted` block to be referenced from inside the factory.
 */
const sub = vi.hoisted(() => ({
  live: 0,
  peak: 0,
  subscribeCalls: 0,
  reset() {
    this.live = 0;
    this.peak = 0;
    this.subscribeCalls = 0;
  },
}));

/**
 * Mock `@chelone/core` so `useList`'s `createClientListController` import routes
 * through a wrapper that counts the LIVE `useSyncExternalStore` subscriptions,
 * exactly as React sees them: every `subscribe` call increments, every
 * returned-unsubscribe decrements (once, idempotently). A hook that subscribes
 * without teardown drives `live` up unbounded. Every other export is the real
 * thing (spread from `importActual`).
 */
vi.mock("@chelone/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@chelone/core")>();
  return {
    ...actual,
    createClientListController: (
      options: Parameters<typeof actual.createClientListController>[0],
    ) => {
      const inner = actual.createClientListController(options);
      return {
        ...inner,
        subscribe(cb: () => void) {
          const unsub = inner.subscribe(cb);
          sub.live += 1;
          sub.peak = Math.max(sub.peak, sub.live);
          sub.subscribeCalls += 1;
          let done = false;
          return () => {
            unsub();
            if (!done) {
              done = true;
              sub.live -= 1;
            }
          };
        },
      };
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

interface Row extends ResourceRecord {
  id: number;
  name: string;
  category: string;
}

const rows: Row[] = [
  { id: 1, name: "Arnold", category: "a" },
  { id: 2, name: "Sylvester", category: "b" },
  { id: 3, name: "Jean-Claude", category: "a" },
  { id: 4, name: "Dolph", category: "b" },
];

// ---------------------------------------------------------------------------
// L1 — 50× mount/unmount churn: bounded subscriber set, zero on final unmount.
// ---------------------------------------------------------------------------

describe("L1 — useList 50× mount/unmount churn: no zombie subscriptions", () => {
  it("50 mount/unmount cycles keep the live subscriber set bounded and end at 0", () => {
    sub.reset();
    function Host() {
      const list = useList<Row>({ data: rows });
      return <div data-testid="total">{list.total}</div>;
    }
    for (let i = 0; i < 50; i += 1) {
      const { unmount } = render(<Host />);
      expect(screen.getByTestId("total").textContent).toBe("4");
      // At most one live subscription per mounted instance.
      expect(sub.live).toBe(1);
      unmount();
      // Torn down on unmount — no zombie left behind.
      expect(sub.live).toBe(0);
    }
    // Across all 50 cycles the peak concurrent count never exceeded 1.
    expect(sub.peak).toBe(1);
    expect(sub.live).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// L2 — StrictMode double-mount: exactly one net subscription; state survives.
// ---------------------------------------------------------------------------

describe("L2 — useList under StrictMode: one net subscription, state intact", () => {
  it("StrictMode double-invoke nets a single live subscription", () => {
    sub.reset();
    render(
      <StrictMode>
        {(() => {
          function Host() {
            const list = useList<Row>({ data: rows });
            return <div data-testid="total">{list.total}</div>;
          }
          return <Host />;
        })()}
      </StrictMode>,
    );
    expect(screen.getByTestId("total").textContent).toBe("4");
    // StrictMode subscribes, tears down, re-subscribes: >1 subscribe CALL but
    // exactly ONE live subscription remains (the teardown ran between them).
    expect(sub.live).toBe(1);
    expect(sub.subscribeCalls).toBeGreaterThanOrEqual(1);
  });

  it("state set between the StrictMode doubled mounts is not lost (no split brain)", () => {
    const { result } = renderHook(
      () => useList<Row>({ data: rows, perPage: 2 }),
      {
        wrapper: StrictMode,
      },
    );
    expect(result.current.data?.map((r) => r.id)).toEqual([1, 2]);
    act(() => result.current.setPage(2));
    expect(result.current.data?.map((r) => r.id)).toEqual([3, 4]);
    // The action landed on the SAME controller both StrictMode passes bound.
    act(() => result.current.select([3]));
    expect(result.current.selectedIds).toEqual([3]);
  });
});

// ---------------------------------------------------------------------------
// L3 — Suspense/discard: unmount mid-life leaves no subscription; post-unmount
//      actions are inert no-ops (core `destroyed` guard), no act-warning.
// ---------------------------------------------------------------------------

describe("L3 — useList discard mid-life: no leaked subscription, inert post-unmount", () => {
  it("unmounting before any action leaves zero live subscriptions", () => {
    sub.reset();
    function Host() {
      const list = useList<Row>({ data: rows });
      return <div data-testid="total">{list.total}</div>;
    }
    const { unmount } = render(<Host />);
    expect(sub.live).toBe(1);
    unmount();
    expect(sub.live).toBe(0);
  });

  it("firing a captured action AFTER unmount emits no act-warning (subscription is torn down)", () => {
    // After unmount the `useSyncExternalStore` subscription is gone, so a
    // late action that notifies the (now orphaned) store reaches no live React
    // subscriber — no "state update on an unmounted component" / act warning.
    let captured: ReturnType<typeof useList<Row>> | undefined;
    function Host() {
      const list = useList<Row>({ data: rows });
      captured = list;
      return <div data-testid="total">{list.total}</div>;
    }
    const errorSpy = vi.spyOn(console, "error");
    const { unmount } = render(<Host />);
    unmount();
    act(() => {
      captured?.setPage(2);
      captured?.select([1, 2]);
      captured?.setSort({ field: "name", order: "ASC" });
    });
    const actWarnings = errorSpy.mock.calls.filter((c) =>
      String(c[0]).includes("not wrapped in act"),
    );
    expect(actWarnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// L3b — core `destroyed` guard: a destroyed controller's actions are inert
//       no-ops (mutation-verified: removing the guard makes this red). This is
//       the vanilla teardown seam a caller that DOES call `.destroy()` relies on.
// ---------------------------------------------------------------------------

describe("L3b — destroyed client-list controller: actions are inert no-ops", () => {
  it("setPage/select after destroy() do not mutate state", async () => {
    // Import the real (unmocked) factory: the mock only rewraps `subscribe`,
    // every other method including `destroy` is the actual implementation.
    const { createClientListController } = await import("@chelone/core");
    const controller = createClientListController<Row>({
      data: rows,
      perPage: 2,
    });
    expect(controller.getSnapshot().page).toBe(1);
    controller.select([1, 2]);
    expect(controller.getSnapshot().selectedIds).toEqual([1, 2]);
    controller.destroy();
    // Every action is guarded by `destroyed` → these are all no-ops.
    controller.setPage(2);
    controller.select([3, 4]);
    controller.toggleItem(1);
    controller.unselectAll();
    controller.setData([{ id: 9, name: "z", category: "c" }]);
    // State is frozen at the pre-destroy values — nothing landed.
    expect(controller.getSnapshot().page).toBe(1);
    expect(controller.getSnapshot().selectedIds).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// L4 — selection stable across unrelated parent re-renders; identity tracks
//      selection only.
// ---------------------------------------------------------------------------

describe("L4 — useList selection stable under parent re-render churn", () => {
  it("50 unrelated parent re-renders do not drop selectedIds", () => {
    const { result, rerender } = renderHook(
      ({ tick: _tick }: { tick: number }) => useList<Row>({ data: rows }),
      { initialProps: { tick: 0 } },
    );
    act(() => result.current.select([1, 3]));
    expect(result.current.selectedIds).toEqual([1, 3]);
    // Churn the parent 50× with an unrelated prop — selection must persist.
    for (let t = 1; t <= 50; t += 1) rerender({ tick: t });
    expect(result.current.selectedIds).toEqual([1, 3]);
  });

  it("selectedIds identity is stable across a re-render that does not change selection", () => {
    const { result, rerender } = renderHook(
      ({ tick: _tick }: { tick: number }) => useList<Row>({ data: rows }),
      { initialProps: { tick: 0 } },
    );
    act(() => result.current.select([2]));
    const first = result.current.selectedIds;
    rerender({ tick: 1 });
    // No selection change → the same selectedIds array reference (micro-store
    // only allocates a new snapshot on an actual state change).
    expect(result.current.selectedIds).toBe(first);
    act(() => result.current.toggleItem(4));
    // Selection changed → a NEW array (never mutated in place).
    expect(result.current.selectedIds).not.toBe(first);
    expect(result.current.selectedIds).toEqual([2, 4]);
  });
});

// ---------------------------------------------------------------------------
// L5 — no re-render storm on identical-content prop churn.
// ---------------------------------------------------------------------------

describe("L5 — useList no re-render storm on identical-content data churn", () => {
  it("re-rendering with a fresh-but-identical data array does not thrash the slice", () => {
    let renderCount = 0;
    let snapshotChanges = 0;
    function Host({ tick: _tick }: { tick: number }) {
      // A FRESH array with identical CONTENT on every render (worst case: a
      // parent that maps/spreads inline). The JSON-key guard must absorb it.
      const list = useList<Row>({ data: rows.map((r) => ({ ...r })) });
      renderCount += 1;
      const prev = useRef(list.data);
      if (prev.current !== list.data) {
        snapshotChanges += 1;
        prev.current = list.data;
      }
      return <div data-testid="total">{list.total}</div>;
    }
    const { rerender } = render(<Host tick={0} />);
    const initialRenders = renderCount;
    for (let t = 1; t <= 20; t += 1) rerender(<Host tick={t} />);
    expect(screen.getByTestId("total").textContent).toBe("4");
    // 20 parent re-renders → 20 host renders (React re-renders on rerender),
    // but the derived `data` slice must NOT be replaced (identical content →
    // key guard skips setData → snapshot identity holds). Allow the 1 initial.
    expect(renderCount - initialRenders).toBe(20);
    // The derived data slice changed AT MOST once (the initial seed); the 20
    // identical-content churns produced zero further slice replacements.
    expect(snapshotChanges).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// L6 — stable snapshot identity across a no-op re-render.
// ---------------------------------------------------------------------------

describe("L6 — useList snapshot identity stable across a no-op re-render", () => {
  it("the returned result is referentially stable when nothing changes", () => {
    const { result, rerender } = renderHook(
      ({ tick: _tick }: { tick: number }) => useList<Row>({ data: rows }),
      { initialProps: { tick: 0 } },
    );
    const first = result.current;
    rerender({ tick: 1 });
    // Same data, same params, no store mutation → `useSyncExternalStore`
    // returns the same snapshot and the `useMemo([snapshot, controller])`
    // holds, so the whole returned object is referentially identical. A
    // downstream memo'd consumer of the context value does not re-render.
    expect(result.current).toBe(first);
    rerender({ tick: 2 });
    expect(result.current).toBe(first);
    // Sanity: an actual state change DOES produce a new object (new snapshot).
    act(() => result.current.setPage(2));
    expect(result.current).not.toBe(first);
  });
});

// ---------------------------------------------------------------------------
// L7 — context provider with a stable value does not re-render a memo'd
//      consumer on parent churn (RecordContext as representative).
// ---------------------------------------------------------------------------

describe("L7 — RecordContextProvider stable value: no spurious consumer re-render", () => {
  it("50 parent re-renders with a stable record value render the consumer once", () => {
    const consumerRenders = vi.fn();
    const Consumer = memo(function Consumer() {
      const record = useRecordContext<{ id: number; title: string }>();
      consumerRenders();
      return <div data-testid="title">{record?.title}</div>;
    });
    // A STABLE record object (defined once, never re-created).
    const record = { id: 1, title: "hello" };
    function Parent({ tick: _tick }: { tick: number }) {
      return (
        <RecordContextProvider value={record}>
          <Consumer />
        </RecordContextProvider>
      );
    }
    const { rerender } = render(<Parent tick={0} />);
    expect(screen.getByTestId("title").textContent).toBe("hello");
    for (let t = 1; t <= 50; t += 1) rerender(<Parent tick={t} />);
    // The context value never changed → the memo'd consumer rendered exactly
    // once. (A new-object-per-render provider would drive this to 51.)
    expect(consumerRenders).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// L8 — pure-ish readers cause no re-render beyond their context dependency.
// ---------------------------------------------------------------------------

describe("L8 — useRecordContext / useFieldValue: no re-render beyond dependency", () => {
  it("useFieldValue consumer re-renders only when the record it reads changes", () => {
    const fieldRenders = vi.fn();
    const Field = memo(function Field() {
      const value = useFieldValue({ source: "author.name" });
      fieldRenders();
      return <div data-testid="field">{String(value)}</div>;
    });

    let setRecord!: (r: { id: number; author: { name: string } }) => void;
    let forceHarness: (() => void) | undefined;
    function Harness() {
      const [record, _setRecord] = useState({
        id: 1,
        author: { name: "Ann" },
      });
      const [, force] = useState(0);
      setRecord = _setRecord;
      // Expose a force-render that does NOT change the record.
      useEffect(() => {
        forceHarness = () => force((n) => n + 1);
      });
      return (
        <RecordContextProvider value={record}>
          <Field />
        </RecordContextProvider>
      );
    }
    render(<Harness />);
    expect(screen.getByTestId("field").textContent).toBe("Ann");
    expect(fieldRenders).toHaveBeenCalledTimes(1);

    // Force a Harness re-render WITHOUT changing the record → the memo'd Field
    // must NOT re-render (context value unchanged, props unchanged).
    act(() => {
      defined(forceHarness)();
    });
    expect(fieldRenders).toHaveBeenCalledTimes(1);

    // Now change the record → the field re-renders exactly once more.
    act(() => setRecord({ id: 1, author: { name: "Bob" } }));
    expect(screen.getByTestId("field").textContent).toBe("Bob");
    expect(fieldRenders).toHaveBeenCalledTimes(2);
  });

  it("prop-record override always returns the prop record, even as the ambient record churns (parity)", () => {
    // PARITY NOTE: ra-core's `useRecordContext` (and ours) calls
    // `useContext(RecordContext)` UNCONDITIONALLY, so a prop-record consumer is
    // still subscribed to the ambient context and DOES re-render when it
    // changes — a hook cannot conditionally skip a context subscription. The
    // load-bearing contract is the RETURNED VALUE, not render isolation: the
    // prop record must win on every render regardless of the ambient value.
    const propFieldRenders = vi.fn();
    const propRecord = { id: 99, title: "fixed" };
    const PropField = memo(function PropField() {
      const record = useRecordContext<{ id: number; title: string }>({
        record: propRecord,
      });
      propFieldRenders();
      return <div data-testid="prop">{record?.title}</div>;
    });
    let bump!: () => void;
    function Harness() {
      const [n, setN] = useState(0);
      bump = () => setN((x) => x + 1);
      return (
        <RecordContextProvider value={{ id: n, title: `ambient-${n}` }}>
          <PropField />
        </RecordContextProvider>
      );
    }
    render(<Harness />);
    expect(screen.getByTestId("prop").textContent).toBe("fixed");
    // Churn the ambient record twice — the consumer re-renders (context
    // subscription) but the RETURNED value is always the prop record.
    act(() => bump());
    act(() => bump());
    expect(screen.getByTestId("prop").textContent).toBe("fixed");
    // Re-rendered on each ambient change (initial + 2 bumps): parity behavior.
    expect(propFieldRenders).toHaveBeenCalledTimes(3);
  });
});
