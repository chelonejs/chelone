import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { useList } from "./use-list";

// The index signature is on purpose: this file filters on plain field names,
// and a record without one keys its filter by `FilterSourceKey` — `q` plus
// operator suffixes only. Filter-key typing is pinned in core's
// source-path.test-d.ts.
interface Row {
  id: number;
  name: string;
  category: string;
  [key: string]: unknown;
}

const data: Row[] = [
  { id: 1, name: "Arnold", category: "a" },
  { id: 2, name: "Sylvester", category: "b" },
  { id: 3, name: "Jean-Claude", category: "a" },
  { id: 4, name: "Dolph", category: "b" },
];

describe("useList", () => {
  it("returns a ListContext-shaped value over the provided data", () => {
    const { result } = renderHook(() => useList<Row>({ data }));
    expect(result.current.data).toEqual(data);
    expect(result.current.total).toBe(4);
    expect(result.current.page).toBe(1);
    expect(result.current.isPending).toBe(false);
    expect(result.current.selectedIds).toEqual([]);
    // action identities present (drop-in for ListContextProvider)
    expect(typeof result.current.setPage).toBe("function");
    expect(typeof result.current.setPerPage).toBe("function");
    expect(typeof result.current.setSort).toBe("function");
    expect(typeof result.current.setFilters).toBe("function");
    expect(typeof result.current.select).toBe("function");
    expect(typeof result.current.toggleItem).toBe("function");
    expect(typeof result.current.unselectAll).toBe("function");
    expect(typeof result.current.selectAll).toBe("function");
    expect(typeof result.current.refetch).toBe("function");
    expect(typeof result.current.showFilter).toBe("function");
    expect(typeof result.current.hideFilter).toBe("function");
  });

  it("sorts client-side", () => {
    const { result } = renderHook(() =>
      useList<Row>({ data, sort: { field: "name", order: "ASC" } }),
    );
    expect(result.current.data?.map((r) => r.name)).toEqual([
      "Arnold",
      "Dolph",
      "Jean-Claude",
      "Sylvester",
    ]);
  });

  it("filters client-side", () => {
    const { result } = renderHook(() =>
      useList<Row>({ data, filter: { category: "a" } }),
    );
    expect(result.current.data?.map((r) => r.id)).toEqual([1, 3]);
    expect(result.current.total).toBe(2);
  });

  it("paginates client-side", () => {
    const { result } = renderHook(() => useList<Row>({ data, perPage: 2 }));
    expect(result.current.data?.map((r) => r.id)).toEqual([1, 2]);
    act(() => result.current.setPage(2));
    expect(result.current.data?.map((r) => r.id)).toEqual([3, 4]);
  });

  it("re-renders on setSort and toggles order", () => {
    const { result } = renderHook(() =>
      useList<Row>({ data, sort: { field: "id", order: "ASC" } }),
    );
    act(() => result.current.setSort({ field: "id", order: "ASC" }));
    expect(result.current.sort).toEqual([{ field: "id", order: "DESC" }]);
    expect(result.current.data?.map((r) => r.id)).toEqual([4, 3, 2, 1]);
  });

  it("selects and toggles items reactively", () => {
    const { result } = renderHook(() => useList<Row>({ data }));
    act(() => result.current.select([1, 2]));
    expect(result.current.selectedIds).toEqual([1, 2]);
    act(() => result.current.toggleItem(2));
    expect(result.current.selectedIds).toEqual([1]);
    act(() => result.current.unselectAll());
    expect(result.current.selectedIds).toEqual([]);
  });

  it("selectAll selects filtered ids", async () => {
    const { result } = renderHook(() =>
      useList<Row>({ data, filter: { category: "b" } }),
    );
    await act(async () => {
      await result.current.selectAll();
    });
    expect(result.current.selectedIds).toEqual([2, 4]);
  });

  it("reflects an external data prop change", () => {
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) => useList<Row>({ data: rows }),
      { initialProps: { rows: data } },
    );
    expect(result.current.total).toBe(4);
    const next = [{ id: 9, name: "z", category: "c" }];
    rerender({ rows: next });
    expect(result.current.total).toBe(1);
    expect(result.current.data?.map((r) => r.id)).toEqual([9]);
  });

  it("reflects an external filter prop change", () => {
    const { result, rerender } = renderHook(
      ({ filter }: { filter: Record<string, unknown> }) =>
        useList<Row>({ data, filter }),
      { initialProps: { filter: {} } },
    );
    expect(result.current.total).toBe(4);
    rerender({ filter: { category: "a" } });
    expect(result.current.data?.map((r) => r.id)).toEqual([1, 3]);
  });

  it("handles empty data", () => {
    const { result } = renderHook(() => useList<Row>({ data: [] }));
    expect(result.current.data).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("reflects an async source resolving (isPending true -> false + data)", () => {
    // The documented capability: a caller wires an async source into useList
    // via {data, isPending}. Starts pending (data undefined); once the source
    // resolves the props flip and the derived slice must populate.
    interface Props {
      rows: Row[] | undefined;
      pending: boolean;
    }
    const initialProps: Props = { rows: undefined, pending: true };
    const { result, rerender } = renderHook(
      ({ rows, pending }: Props) =>
        useList<Row>({ data: rows, isPending: pending }),
      { initialProps },
    );
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();

    rerender({ rows: data, pending: false });
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toEqual(data);
    expect(result.current.total).toBe(4);
  });

  it("reflects an isFetching / error prop change", () => {
    interface Props {
      fetching: boolean;
      error: Error | null;
    }
    const err = new Error("boom");
    const initialProps: Props = { fetching: false, error: null };
    const { result, rerender } = renderHook(
      ({ fetching, error }: Props) =>
        useList<Row>({ data, isFetching: fetching, error }),
      { initialProps },
    );
    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBe(null);

    rerender({ fetching: true, error: err });
    expect(result.current.isFetching).toBe(true);
    expect(result.current.error).toBe(err);
  });

  it("survives StrictMode double-mount without losing state", () => {
    const { result } = renderHook(() => useList<Row>({ data, perPage: 2 }), {
      wrapper: StrictMode,
    });
    expect(result.current.data?.map((r) => r.id)).toEqual([1, 2]);
    act(() => result.current.setPage(2));
    expect(result.current.data?.map((r) => r.id)).toEqual([3, 4]);
  });
});
