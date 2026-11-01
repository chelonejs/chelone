import {
  type DataTableColumnInfo,
  dataTableColumnKeys,
  moveColumn,
  toggleHiddenColumn,
} from "@chelone/core";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useCheloneContext } from "./context";

export interface UseDataTableColumnsOptions {
  storeKey: string;
  defaultHiddenColumns?: string[];
}

export interface UseDataTableColumnsResult {
  /** The columns the table published, in declaration order. */
  columns: readonly DataTableColumnInfo[];
  /** The ids of the hidden columns. */
  hidden: readonly string[];
  /** The stored column order, possibly empty. */
  order: readonly string[];
  toggle: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  /** Forget the stored choices so the table's own defaults apply again. */
  reset: () => void;
  publish: (columns: readonly DataTableColumnInfo[]) => void;
}

// Module constants: a fresh array per call would fail the snapshot check.
const NO_COLUMNS: readonly DataTableColumnInfo[] = [];
const NO_IDS: readonly string[] = [];
const noop = () => {};
const noSubscribe = () => noop;

/**
 * Reads and writes how a `<DataTable>` shows its columns. The table publishes
 * its columns here and a button elsewhere in the list, which cannot see the
 * table's children, reads them back. Without a store (unlike `useStoreItem`,
 * this does not throw) every column shows and nothing is written.
 */
export function useDataTableColumns({
  storeKey,
  defaultHiddenColumns,
}: UseDataTableColumnsOptions): UseDataTableColumnsResult {
  const { store } = useCheloneContext();
  const keys = useMemo(() => dataTableColumnKeys(storeKey), [storeKey]);

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!store) return noSubscribe();
      const watched = [keys.hidden, keys.order, keys.columns];
      const stops = watched.map((key) => store.subscribe(key, callback));
      return () => {
        for (const stop of stops) stop();
      };
    },
    [store, keys],
  );
  const storedHidden = useSyncExternalStore(
    subscribe,
    () => store?.getItem<string[]>(keys.hidden),
    () => undefined,
  );
  const order =
    useSyncExternalStore(
      subscribe,
      () => store?.getItem<string[]>(keys.order),
      () => undefined,
    ) ?? NO_IDS;
  const columns =
    useSyncExternalStore(
      subscribe,
      () => store?.getItem<DataTableColumnInfo[]>(keys.columns),
      () => undefined,
    ) ?? NO_COLUMNS;

  const hidden = useMemo<readonly string[]>(() => {
    // Without a store nothing can show a hidden column again, so show them all.
    if (!store) return NO_IDS;
    if (storedHidden) return storedHidden;
    if (defaultHiddenColumns) return defaultHiddenColumns;
    const hiddenByDefault = columns
      .filter((column) => column.defaultHidden)
      .map((column) => column.id);
    return hiddenByDefault.length > 0 ? hiddenByDefault : NO_IDS;
  }, [store, storedHidden, defaultHiddenColumns, columns]);

  const toggle = useCallback(
    (id: string) => store?.setItem(keys.hidden, toggleHiddenColumn(hidden, id)),
    [store, keys, hidden],
  );
  const move = useCallback(
    (id: string, direction: -1 | 1) =>
      store?.setItem(
        keys.order,
        moveColumn(
          order,
          columns.map((column) => column.id),
          id,
          direction,
        ),
      ),
    [store, keys, order, columns],
  );
  const reset = useCallback(() => {
    store?.removeItem(keys.hidden);
    store?.removeItem(keys.order);
  }, [store, keys]);
  const publish = useCallback(
    (next: readonly DataTableColumnInfo[]) => {
      if (!store) return;
      // setItem compares by reference, so a fresh array would notify on every render.
      const stored = store.getItem<DataTableColumnInfo[]>(keys.columns);
      if (JSON.stringify(stored) === JSON.stringify(next)) return;
      store.setItem(keys.columns, next);
    },
    [store, keys],
  );

  return { columns, hidden, order, toggle, move, reset, publish };
}
