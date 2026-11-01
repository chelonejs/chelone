import {
  type DataTableColumnInfo,
  dataTableColumnKeys,
  moveColumn,
  toggleHiddenColumn,
} from "@chelone/core";
import { onScopeDispose, type Ref, shallowRef } from "vue";
import { useCheloneContext } from "../context";

export interface UseDataTableColumnsOptions {
  /** The store key of the hidden ids; the order and columns keys derive from it. */
  storeKey: string;
  /** Hidden until a choice is stored under `storeKey`. */
  defaultHiddenColumns?: readonly string[];
}

export interface UseDataTableColumnsResult {
  /** The columns the table last published. */
  columns: Readonly<Ref<readonly DataTableColumnInfo[]>>;
  /** The stored hidden ids, or `defaultHiddenColumns` until a choice is stored. */
  hidden: Readonly<Ref<readonly string[]>>;
  order: Readonly<Ref<readonly string[]>>;
  toggle: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  /** Forget the stored choice: the defaults apply again. */
  reset: () => void;
  /** Record the table's columns; a write is skipped when nothing changed. */
  publish: (columns: readonly DataTableColumnInfo[]) => void;
}

/**
 * The column state a `<DataTable>` shares through the store with a control
 * outside it. Built on the context's optional store, not `useCheloneStore`:
 * with no store it returns the defaults and setters that do nothing.
 *
 * The options are read once, in `setup`.
 */
export function useDataTableColumns({
  storeKey,
  defaultHiddenColumns = [],
}: UseDataTableColumnsOptions): UseDataTableColumnsResult {
  const { store } = useCheloneContext();
  const keys = dataTableColumnKeys(storeKey);

  const readHidden = () =>
    store?.getItem<string[]>(keys.hidden) ?? defaultHiddenColumns;
  const readOrder = () => store?.getItem<string[]>(keys.order) ?? [];
  const readColumns = () =>
    store?.getItem<DataTableColumnInfo[]>(keys.columns) ?? [];

  const hidden = shallowRef(readHidden());
  const order = shallowRef(readOrder());
  const columns = shallowRef(readColumns());

  if (store) {
    const unsubscribers = [
      store.subscribe(keys.hidden, () => {
        hidden.value = readHidden();
      }),
      store.subscribe(keys.order, () => {
        order.value = readOrder();
      }),
      store.subscribe(keys.columns, () => {
        columns.value = readColumns();
      }),
    ];
    onScopeDispose(() => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    });
  }

  return {
    columns,
    hidden,
    order,
    toggle: (id) => {
      store?.setItem(keys.hidden, toggleHiddenColumn(readHidden(), id));
    },
    move: (id, direction) => {
      store?.setItem(
        keys.order,
        moveColumn(
          readOrder(),
          readColumns().map((column) => column.id),
          id,
          direction,
        ),
      );
    },
    reset: () => {
      store?.removeItem(keys.hidden);
      store?.removeItem(keys.order);
    },
    publish: (next) => {
      if (!store) return;
      const unchanged =
        JSON.stringify(next) === JSON.stringify(store.getItem(keys.columns));
      if (!unchanged) store.setItem(keys.columns, next);
    },
  };
}
