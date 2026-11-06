import {
  createNotificationStore,
  createStore,
  defineResources,
  type FieldErrors,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ArrayInputProvider,
  IteratorRowProvider,
  useArrayInput,
  useIteratorItem,
} from "./array-hooks";
import { CheloneProvider } from "./context";
import { CheloneFormProvider, useSourceContext } from "./form-context";
import { useForm, useInput } from "./form-hooks";

// Unmount + drain pending async between tests: the form controllers mounted by
// these renders resolve validation/hydration on later microtasks, which would
// otherwise interleave into the next test (React 19 absorbs a render throw
// while a prior act is still draining — see the guard test below).
afterEach(async () => {
  cleanup();
  await act(async () => {});
});

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});

function makeWrapper({ strict = false }: { strict?: boolean } = {}) {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({ posts: [] });
  const store = createStore();
  const inner = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      notifications={notifications}
    >
      {children}
    </CheloneProvider>
  );
  const wrapper = strict
    ? ({ children }: { children: ReactNode }) => (
        <StrictMode>{inner({ children })}</StrictMode>
      )
    : inner;
  return { wrapper };
}

/** A form host wiring `useForm` + provider around array consumers. */
function makeFormHost<TFormData>(options: {
  defaultValues?: TFormData;
  save?: (data: TFormData) => Promise<FieldErrors | undefined>;
}) {
  const save = options.save ?? (async () => undefined);
  const latestForm: { current: ReturnType<typeof useForm<TFormData>> | null } =
    { current: null };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({ ...options, save });
    latestForm.current = form;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  return { FormHost, latestForm };
}

// Guard test runs FIRST (source order) on a pristine slate — a render throw
// propagates cleanly to renderHook before any later test's async can interleave.
describe("useIteratorItem — guard", () => {
  it("throws outside an IteratorRowProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useIteratorItem())).toThrow(
      /IteratorRowProvider/,
    );
    spy.mockRestore();
  });
});

describe("useArrayInput", () => {
  it("scalar mode: rows render, add appends a row, edit binds the row source", async () => {
    const { wrapper } = makeWrapper();
    const { FormHost, latestForm } = makeFormHost<{ tags: string[] }>({
      defaultValues: { tags: ["a", "b"] },
    });

    const latest: { current: ReturnType<typeof useArrayInput> | null } = {
      current: null,
    };
    function ScalarChild() {
      const input = useInput({ source: "" });
      return (
        <input
          data-testid="scalar-input"
          value={String(input.field.value)}
          onChange={input.field.onChange}
        />
      );
    }
    function Rows() {
      const array = useArrayInput({ source: "tags" });
      latest.current = array;
      return (
        <ArrayInputProvider array={array}>
          {array.rows.map((row) => (
            <IteratorRowProvider key={row.id} row={row}>
              <ScalarChild />
            </IteratorRowProvider>
          ))}
        </ArrayInputProvider>
      );
    }

    const view = render(
      <FormHost>
        <Rows />
      </FormHost>,
      { wrapper },
    );
    await act(async () => {});

    expect(latest.current?.rows.length).toBe(2);
    expect(latest.current?.rows[0]?.name).toBe("tags[0]");
    expect(view.getAllByTestId("scalar-input")).toHaveLength(2);
    expect(
      elementOf(view.getAllByTestId("scalar-input")[0], HTMLInputElement).value,
    ).toBe("a");

    act(() => latest.current?.add());
    await act(async () => {});
    expect(latest.current?.rows.length).toBe(3);
    expect(latestForm.current?.form.state.values.tags).toEqual(["a", "b", ""]);
  });

  it("object mode: children bind scoped sources, labels stay index-free", async () => {
    const { wrapper } = makeWrapper();
    const { FormHost, latestForm } = makeFormHost<{
      items: { sku: string }[];
    }>({ defaultValues: { items: [{ sku: "x" }] } });

    const seenSource: { current: string | null } = { current: null };
    const seenLabel: { current: string | null } = { current: null };
    function ObjectChild() {
      const input = useInput({ source: "sku" });
      seenSource.current = input.field.name;
      // Labels scope WITHOUT the row index (one catalog entry per field).
      seenLabel.current = useSourceContext().getLabel("sku");
      return null;
    }
    function Rows() {
      const array = useArrayInput({ source: "items" });
      return (
        <ArrayInputProvider array={array}>
          {array.rows.map((row) => (
            <IteratorRowProvider key={row.id} row={row}>
              <ObjectChild />
            </IteratorRowProvider>
          ))}
        </ArrayInputProvider>
      );
    }

    render(
      <FormHost>
        <Rows />
      </FormHost>,
      { wrapper },
    );
    await act(async () => {});

    expect(seenSource.current).toBe("items[0].sku");
    expect(seenLabel.current).toBe("items.sku");
    expect(latestForm.current).toBeTruthy();
  });

  it("reorder preserves the DOM node of the moved row (stable keys)", async () => {
    const { wrapper } = makeWrapper();
    const { FormHost } = makeFormHost<{ tags: string[] }>({
      defaultValues: { tags: ["a", "b", "c"] },
    });

    const latest: { current: ReturnType<typeof useArrayInput> | null } = {
      current: null,
    };
    function ScalarChild() {
      const item = useIteratorItem();
      const input = useInput({ source: "" });
      return (
        <input
          data-testid={`row-${String(input.field.value)}`}
          data-index={item.index}
          value={String(input.field.value)}
          onChange={input.field.onChange}
        />
      );
    }
    function Rows() {
      const array = useArrayInput({ source: "tags" });
      latest.current = array;
      return (
        <ArrayInputProvider array={array}>
          {array.rows.map((row) => (
            <IteratorRowProvider key={row.id} row={row}>
              <ScalarChild />
            </IteratorRowProvider>
          ))}
        </ArrayInputProvider>
      );
    }

    const view = render(
      <FormHost>
        <Rows />
      </FormHost>,
      { wrapper },
    );
    await act(async () => {});

    // Capture the DOM node backing the value "a" BEFORE the reorder.
    const nodeA = view.getByTestId("row-a");
    expect(nodeA.getAttribute("data-index")).toBe("0");

    // Move row 0 ("a") to the end.
    act(() => latest.current?.rows[0]?.reOrder(2));
    await act(async () => {});

    // The SAME DOM node must still back "a" (React reused the fiber via the
    // stable row id), now at index 2 — not a fresh element.
    const nodeAafter = view.getByTestId("row-a");
    expect(nodeAafter).toBe(nodeA);
    expect(nodeAafter.getAttribute("data-index")).toBe("2");
  });

  it("useIteratorItem exposes { index, total, remove, reOrder }", async () => {
    const { wrapper } = makeWrapper();
    const { FormHost, latestForm } = makeFormHost<{ tags: string[] }>({
      defaultValues: { tags: ["a", "b"] },
    });

    const items: ReturnType<typeof useIteratorItem>[] = [];
    function ScalarChild() {
      const item = useIteratorItem();
      items.push(item);
      return null;
    }
    function Rows() {
      const array = useArrayInput({ source: "tags" });
      return (
        <ArrayInputProvider array={array}>
          {array.rows.map((row) => (
            <IteratorRowProvider key={row.id} row={row}>
              <ScalarChild />
            </IteratorRowProvider>
          ))}
        </ArrayInputProvider>
      );
    }

    render(
      <FormHost>
        <Rows />
      </FormHost>,
      { wrapper },
    );
    await act(async () => {});

    expect(items[0]?.index).toBe(0);
    expect(items[0]?.total).toBe(2);
    expect(typeof items[0]?.remove).toBe("function");
    expect(typeof items[0]?.reOrder).toBe("function");

    act(() => items[0]?.remove());
    await act(async () => {});
    expect(latestForm.current?.form.state.values.tags).toEqual(["b"]);
  });
});
