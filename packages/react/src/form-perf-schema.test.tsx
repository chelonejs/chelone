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
import { CheloneProvider } from "./context";
import { CheloneFormProvider } from "./form-context";
import { useForm, useInput } from "./form-hooks";

// Drain the form controllers' pending validation/hydration microtasks between
// tests (see array-hooks tests).
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
 * The T9 perf budget's field-isolation tests deliberately use NO registry /
 * form-level schema (documented in form-perf.test.tsx line 179) — so they never
 * exercise the path where a FORM-LEVEL validator recomputes EVERY field's error
 * map on each keystroke. This suite pins that per-field isolation survives a
 * form-level schema: a field's `useInput` must subscribe to its DISPLAYABLE
 * error, not the raw `meta.errorMap` object, so a sibling whose error text is
 * unchanged does not re-render when the form validator re-runs.
 *
 * Regression guard: before the fix, editing one field after a failed submit
 * (which latches revalidate-on-change for the whole-form schema) re-rendered
 * ALL sibling fields once per keystroke — an O(N) cliff exactly like the one
 * the base budget forbids, but invisible to it because it uses no schema.
 */
describe("form perf budget — form-level schema isolation (§11 #4 addendum)", () => {
  it("edit one field after failed submit: siblings do NOT re-render (form-level schema active)", async () => {
    const N = 30;
    const renders: Record<string, number> = {};
    const handles: Record<string, (v: unknown) => void> = {};
    let submitFn: (() => Promise<void>) | null = null;
    const sources = Array.from({ length: N }, (_, i) => `f${i}`);
    for (const s of sources) renders[s] = 0;

    const Field = memo(function Field({ source }: { source: string }) {
      renders[source] = (renders[source] ?? 0) + 1;
      const input = useInput({ source });
      handles[source] = input.field.onChange;
      return null;
    });

    // Form-level schema: every field required. Editing one field re-runs the
    // WHOLE-FORM schema (after a failed submit), which touches every field's
    // error map.
    const shape: Record<string, z.ZodString> = {};
    for (const s of sources) shape[s] = z.string().min(1, `${s} required`);
    const schema = z.object(shape);

    function Host() {
      const form = useForm<Record<string, string>>({
        defaultValues: Object.fromEntries(sources.map((s) => [s, ""])),
        schema,
        save: async () => undefined,
      });
      submitFn = form.submit;
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          {sources.map((s) => (
            <Field key={s} source={s} />
          ))}
        </CheloneFormProvider>
      );
    }

    const { wrapper } = makeWrapper();
    render(<Host />, { wrapper });
    await act(async () => {});

    // Failed submit (all empty) latches revalidate-on-change for the form
    // schema and writes every field's "… required" error.
    await act(async () => {
      await submitFn?.();
    });

    const base: Record<string, number> = {};
    for (const s of sources) base[s] = renders[s] ?? 0;

    // Type five characters into f0. The form schema re-runs on each keystroke;
    // f0's error clears (it becomes non-empty) — that's f0's own re-render.
    // Every OTHER field's error ("fN required") is UNCHANGED, so its displayable
    // error slice is identity-stable => zero sibling re-renders.
    for (const t of ["a", "ab", "abc", "abcd", "abcde"]) {
      act(() => defined(handles.f0)(t));
    }
    await act(async () => {});

    // f0 re-rendered (its own value + error changed) — bounded, not asserted
    // tightly here; the isolation property is the siblings.
    let siblingTotal = 0;
    for (let i = 1; i < N; i += 1) {
      siblingTotal += (renders[`f${i}`] ?? 0) - (base[`f${i}`] ?? 0);
    }
    // N-INDEPENDENCE: editing one field must not re-render the other N-1 — the
    // whole point of per-field subscription. This is the O(N) cliff the base
    // budget forbids, reached via a form-level schema.
    expect(siblingTotal).toBe(0);
  });

  it("a field whose error TEXT flips still re-renders (isolation is not over-memoized)", async () => {
    // Guards the fix from the opposite failure: subscribing to the displayable
    // error must STILL re-render a field when its own error text actually
    // changes. Here f0 stays empty (error persists) while f1 goes valid.
    const renders: Record<string, number> = { f0: 0, f1: 0 };
    const handles: Record<string, (v: unknown) => void> = {};
    let submitFn: (() => Promise<void>) | null = null;

    const Field = memo(function Field({ source }: { source: string }) {
      renders[source] = (renders[source] ?? 0) + 1;
      const input = useInput({ source });
      handles[source] = input.field.onChange;
      return null;
    });

    const schema = z.object({
      f0: z.string().min(1, "f0 required"),
      f1: z.string().min(3, "f1 too short"),
    });

    function Host() {
      const form = useForm<{ f0: string; f1: string }>({
        defaultValues: { f0: "", f1: "" },
        schema,
        save: async () => undefined,
      });
      submitFn = form.submit;
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          <Field source="f0" />
          <Field source="f1" />
        </CheloneFormProvider>
      );
    }

    const { wrapper } = makeWrapper();
    render(<Host />, { wrapper });
    await act(async () => {});
    await act(async () => {
      await submitFn?.();
    });

    const f1Base = renders.f1 ?? 0;
    // Drive f1 across its error boundary: "" (too short) -> "ab" (still too
    // short, SAME message) -> "abc" (valid, error clears). f1 must re-render
    // when the message clears.
    act(() => defined(handles.f1)("ab"));
    act(() => defined(handles.f1)("abc"));
    await act(async () => {});

    // f1's displayable error changed ("f1 too short" -> undefined), so it MUST
    // have re-rendered at least once.
    expect((renders.f1 ?? 0) - f1Base).toBeGreaterThan(0);
  });
});
