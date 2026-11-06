import {
  createNotificationStore,
  createStore,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import { memo, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ArrayInputProvider,
  IteratorRowProvider,
  useArrayInput,
} from "./array-hooks";
import { CheloneProvider } from "./context";
import { CheloneFormProvider } from "./form-context";
import { type FormStateSlices, useForm, useInput } from "./form-hooks";

// Drain the form controllers' pending validation/hydration microtasks between
// tests so they never interleave into the next render (see array-hooks tests).
afterEach(async () => {
  cleanup();
  await act(async () => {});
});

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});

function makeWrapper() {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({ posts: [] });
  const store = createStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      notifications={notifications}
    >
      {children}
    </CheloneProvider>
  );
  return { wrapper };
}

/**
 * The perf methodology (mirrors the zustand-benchmark render-counting): every
 * field consumer is a `memo`'d component owning a `useInput`, incrementing a
 * shared counter keyed by its source on each render. React only re-runs a
 * memoized component when its own hooks push a new value; the identity-memoized
 * `field.store` + per-field `useSelector` slices are what keep sibling fields
 * at zero re-renders. A non-memo consumer would re-render on every parent
 * render and defeat the measurement — the budget is about the SUBSCRIPTION
 * graph, and `memo` isolates that from incidental parent re-renders.
 */
interface PerfHarness {
  renders: Record<string, number>;
  shellRenders: { count: number };
  handles: Record<
    string,
    { onChange: (v: unknown) => void; value: () => unknown }
  >;
  shell: { current: FormStateSlices | null };
}

/** Builds a form host with `fieldCount` memoized field consumers + one shell. */
function makePerfForm(fieldCount: number): {
  Host: () => ReactNode;
  harness: PerfHarness;
} {
  const sources = Array.from({ length: fieldCount }, (_, i) => `f${i}`);
  const defaultValues: Record<string, string> = {};
  for (const s of sources) defaultValues[s] = "";

  const harness: PerfHarness = {
    renders: {},
    shellRenders: { count: 0 },
    handles: {},
    shell: { current: null },
  };
  for (const s of sources) harness.renders[s] = 0;

  const Field = memo(function Field({ source }: { source: string }) {
    harness.renders[source] = (harness.renders[source] ?? 0) + 1;
    const input = useInput({ source });
    harness.handles[source] = {
      onChange: input.field.onChange,
      value: () => input.field.value,
    };
    return null;
  });

  // The form SHELL subscribes ONLY to canSubmit + isDefaultValue (the toolbar
  // signals) — never to values/fieldMeta. It must re-render at most twice while
  // one field is edited: once on first-dirty (isDefaultValue flip) and at most
  // once more if validity flips. Memoized so it isn't dragged by the host.
  const Shell = memo(function Shell({ slices }: { slices: FormStateSlices }) {
    harness.shellRenders.count += 1;
    harness.shell.current = slices;
    return null;
  });

  function Host() {
    const form = useForm<Record<string, string>>({
      defaultValues,
      save: async () => undefined,
    });
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        <Shell
          slices={{
            canSubmit: form.canSubmit,
            isSubmitting: form.isSubmitting,
            isValidating: form.isValidating,
            isTouched: form.isTouched,
            isDirty: form.isDirty,
            isDefaultValue: form.isDefaultValue,
          }}
        />
        {sources.map((s) => (
          <Field key={s} source={s} />
        ))}
      </CheloneFormProvider>
    );
  }

  return { Host, harness };
}

describe("form perf budget (§11 #4)", () => {
  it("300-field form: typing 5 chars re-renders only that field's consumer (mount recorded)", async () => {
    const FIELD_COUNT = 300;
    const { wrapper } = makeWrapper();
    const { Host, harness } = makePerfForm(FIELD_COUNT);

    const t0 = performance.now();
    render(<Host />, { wrapper });
    await act(async () => {});
    const mountMs = performance.now() - t0;
    // Mount wall-clock is DOCUMENTED, never asserted (CI flake). Recorded for
    // the T9 report.
    console.log(
      `[perf] 300-field form mount: ${mountMs.toFixed(1)}ms (${FIELD_COUNT} fields)`,
    );

    // Baseline every field mounted exactly once.
    for (let i = 0; i < FIELD_COUNT; i += 1) {
      expect(harness.renders[`f${i}`]).toBe(1);
    }
    const shellAfterMount = harness.shellRenders.count;

    // Type five characters into f0. Each keystroke re-renders ONLY f0's
    // consumer (value slice changed); siblings' slices kept identity.
    const chars = ["a", "ab", "abc", "abcd", "abcde"];
    for (const text of chars) {
      act(() => defined(harness.handles.f0).onChange(text));
    }

    // f0 re-rendered at most 5 times beyond its mount.
    expect(harness.renders.f0).toBeLessThanOrEqual(1 + 5);
    expect(harness.renders.f0).toBeGreaterThanOrEqual(1 + 5);
    expect(defined(harness.handles.f0).value()).toBe("abcde");

    // EVERY other field consumer re-rendered zero times.
    for (let i = 1; i < FIELD_COUNT; i += 1) {
      expect(harness.renders[`f${i}`]).toBe(1);
    }

    // The shell subscriber re-rendered at most twice past mount: the
    // first-dirty isDefaultValue flip (+ at most one validity flip). No
    // registry schema here, so canSubmit never flips — expect exactly one.
    const shellDelta = harness.shellRenders.count - shellAfterMount;
    expect(shellDelta).toBeLessThanOrEqual(2);
    expect(harness.shell.current?.isDefaultValue).toBe(false);
  });

  it("100-row array: push re-renders the iterator once + the new row only", async () => {
    const { wrapper } = makeWrapper();
    const rowRenders: Record<string, number> = {};
    const iteratorRenders = { count: 0 };
    const latest: { current: ReturnType<typeof useArrayInput> | null } = {
      current: null,
    };

    const Row = memo(function Row({ rowId }: { rowId: string }) {
      rowRenders[rowId] = (rowRenders[rowId] ?? 0) + 1;
      const input = useInput({ source: "" });
      return (
        <input
          data-testid={`row-${rowId}`}
          value={String(input.field.value)}
          onChange={input.field.onChange}
        />
      );
    });

    function Iterator() {
      iteratorRenders.count += 1;
      const array = useArrayInput({ source: "tags" });
      latest.current = array;
      return (
        <ArrayInputProvider array={array}>
          {array.rows.map((row) => (
            <IteratorRowProvider key={row.id} row={row}>
              <Row rowId={row.id} />
            </IteratorRowProvider>
          ))}
        </ArrayInputProvider>
      );
    }

    function Host() {
      const form = useForm<{ tags: string[] }>({
        defaultValues: { tags: Array.from({ length: 100 }, () => "x") },
        save: async () => undefined,
      });
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          <Iterator />
        </CheloneFormProvider>
      );
    }

    render(<Host />, { wrapper });
    await act(async () => {});

    expect(latest.current?.rows.length).toBe(100);
    // Every existing row mounted exactly once.
    const existingRowIds = latest.current?.rows.map((r) => r.id) ?? [];
    for (const id of existingRowIds) expect(rowRenders[id]).toBe(1);
    const iteratorAfterMount = iteratorRenders.count;

    // Push one row. The iterator re-renders once (row set grew); each existing
    // row's memoized consumer does NOT re-render (its id/props are unchanged,
    // its field.store value slice is unchanged).
    act(() => latest.current?.add());
    await act(async () => {});

    expect(latest.current?.rows.length).toBe(101);
    expect(iteratorRenders.count - iteratorAfterMount).toBe(1);
    for (const id of existingRowIds) expect(rowRenders[id]).toBe(1);
    // The new row mounted exactly once.
    const newRow = latest.current?.rows[100];
    expect(newRow).toBeTruthy();
    if (newRow) expect(rowRenders[newRow.id]).toBe(1);
  });

  it("100-row array: remove re-renders the iterator once + the surviving rows keep their consumers", async () => {
    const { wrapper } = makeWrapper();
    const rowRenders: Record<string, number> = {};
    const iteratorRenders = { count: 0 };
    const latest: { current: ReturnType<typeof useArrayInput> | null } = {
      current: null,
    };

    const Row = memo(function Row({ rowId }: { rowId: string }) {
      rowRenders[rowId] = (rowRenders[rowId] ?? 0) + 1;
      const input = useInput({ source: "" });
      return (
        <input
          data-testid={`row-${rowId}`}
          value={String(input.field.value)}
          onChange={input.field.onChange}
        />
      );
    });

    function Iterator() {
      iteratorRenders.count += 1;
      const array = useArrayInput({ source: "tags" });
      latest.current = array;
      return (
        <ArrayInputProvider array={array}>
          {array.rows.map((row) => (
            <IteratorRowProvider key={row.id} row={row}>
              <Row rowId={row.id} />
            </IteratorRowProvider>
          ))}
        </ArrayInputProvider>
      );
    }

    function Host() {
      const form = useForm<{ tags: string[] }>({
        defaultValues: {
          tags: Array.from({ length: 100 }, (_, i) => `v${i}`),
        },
        save: async () => undefined,
      });
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          <Iterator />
        </CheloneFormProvider>
      );
    }

    render(<Host />, { wrapper });
    await act(async () => {});
    expect(latest.current?.rows.length).toBe(100);

    // Removing the LAST row is the clean isolation case: no survivor's index
    // (and thus no survivor's scalar source path `tags[i]`) shifts, so no
    // survivor consumer is "affected". Their stable ids let React reuse every
    // fiber and their value slices are untouched.
    const survivorIds = (latest.current?.rows ?? [])
      .slice(0, 99)
      .map((r) => r.id);
    for (const id of survivorIds) expect(rowRenders[id]).toBe(1);
    const iteratorAfterMount = iteratorRenders.count;

    // Remove the last row. Awaited: `removeFieldValue` schedules async
    // revalidation from the removed index — draining it here keeps it from
    // leaking into the next test.
    await act(async () => {
      latest.current?.remove(99);
    });

    expect(latest.current?.rows.length).toBe(99);
    // The iterator re-rendered exactly once (row set shrank); the 99 survivors
    // re-rendered ZERO times — the "iterator once + affected rows only" budget,
    // with zero affected rows on a tail removal.
    expect(iteratorRenders.count - iteratorAfterMount).toBe(1);
    for (const id of survivorIds) expect(rowRenders[id]).toBe(1);
  });

  it("100-row array: remove(0) re-renders the iterator once + only the shifted (affected) rows", async () => {
    // Removing a HEAD/middle row shifts every trailing row's index, so every
    // trailing scalar child rebinds from `tags[i]` to `tags[i-1]` — those rows
    // ARE affected (the budget explicitly allows "affected rows"). This pins
    // that the iterator still re-renders exactly ONCE and each affected row a
    // small BOUNDED number of times (not unbounded), and that a row BEFORE the
    // removal index is untouched.
    const { wrapper } = makeWrapper();
    const rowRenders: Record<string, number> = {};
    const iteratorRenders = { count: 0 };
    const latest: { current: ReturnType<typeof useArrayInput> | null } = {
      current: null,
    };

    const Row = memo(function Row({ rowId }: { rowId: string }) {
      rowRenders[rowId] = (rowRenders[rowId] ?? 0) + 1;
      const input = useInput({ source: "" });
      return (
        <input
          data-testid={`row-${rowId}`}
          value={String(input.field.value)}
          onChange={input.field.onChange}
        />
      );
    });

    function Iterator() {
      iteratorRenders.count += 1;
      const array = useArrayInput({ source: "tags" });
      latest.current = array;
      return (
        <ArrayInputProvider array={array}>
          {array.rows.map((row) => (
            <IteratorRowProvider key={row.id} row={row}>
              <Row rowId={row.id} />
            </IteratorRowProvider>
          ))}
        </ArrayInputProvider>
      );
    }

    function Host() {
      const form = useForm<{ tags: string[] }>({
        defaultValues: {
          tags: Array.from({ length: 100 }, (_, i) => `v${i}`),
        },
        save: async () => undefined,
      });
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          <Iterator />
        </CheloneFormProvider>
      );
    }

    render(<Host />, { wrapper });
    await act(async () => {});
    const rowsBefore = latest.current?.rows ?? [];
    // The row removed at index 1; index-0 row is BEFORE the shift (unaffected),
    // indices 2..99 are the affected trailing rows.
    const unaffectedId = rowsBefore[0]?.id ?? "";
    const affectedIds = rowsBefore.slice(2).map((r) => r.id);
    const iteratorAfterMount = iteratorRenders.count;

    await act(async () => {
      latest.current?.remove(1);
    });

    expect(latest.current?.rows.length).toBe(99);
    // Iterator: exactly one re-render for the structural change.
    expect(iteratorRenders.count - iteratorAfterMount).toBe(1);
    // The row before the removal index never re-rendered.
    expect(rowRenders[unaffectedId]).toBe(1);
    // Every affected row re-rendered a small BOUNDED CONSTANT number of times
    // (the scalar source-path rebind `tags[i]`->`tags[i-1]` recreates the
    // binding via a render-phase setState, plus the freshness effect) — the
    // key property is that this cost is per-affected-row and does NOT scale
    // with the row count: the FIRST and LAST affected rows re-render the same
    // number of times.
    const firstAffected = rowRenders[affectedIds[0] ?? ""];
    for (const id of affectedIds) {
      expect(rowRenders[id]).toBeGreaterThan(1);
      expect(rowRenders[id]).toBeLessThanOrEqual(6);
      // N-independence: identical re-render count front-to-back of the array.
      expect(rowRenders[id]).toBe(firstAffected);
    }
  });

  it("shell subscriber does not re-render on keystrokes into any field", async () => {
    // A second explicit pin: with N fields, editing across MANY fields must
    // not multiply shell renders — the shell only tracks validity/dirty flips,
    // both of which latch after the first edit. (Guards a regression where a
    // shell selector accidentally subscribes to values.)
    const { wrapper } = makeWrapper();
    const { Host, harness } = makePerfForm(20);
    render(<Host />, { wrapper });
    await act(async () => {});
    const shellAfterMount = harness.shellRenders.count;

    // Edit ten different fields, five keystrokes each.
    for (let f = 0; f < 10; f += 1) {
      for (let k = 0; k < 5; k += 1) {
        act(() =>
          defined(harness.handles[`f${f}`]).onChange("x".repeat(k + 1)),
        );
      }
    }

    // The dirty flip happened exactly once (first keystroke of f0); no
    // validity gate here, so canSubmit never moved. Shell re-rendered once.
    const shellDelta = harness.shellRenders.count - shellAfterMount;
    expect(shellDelta).toBeLessThanOrEqual(2);
    expect(harness.shell.current?.isDirty).toBe(true);
  });
});
