import {
  type DataTableColumnInfo,
  dataTableColumnKeys,
  moveColumn,
  toggleHiddenColumn,
} from "@chelone/core";
import {
  computed,
  type MaybeRefOrGetter,
  type Ref,
  shallowRef,
  toValue,
  watch,
} from "vue";
import { useCheloneContext } from "../context";

export interface UseDataTableColumnsOptions {
  /** The store key of the hidden ids; the order and columns keys derive from it. */
  storeKey: MaybeRefOrGetter<string>;
  /** Hidden until a choice is stored under `storeKey`. */
  defaultHiddenColumns?: MaybeRefOrGetter<readonly string[] | undefined>;
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
 * Both options may be refs or getters: a new `storeKey` re-reads and
 * resubscribes, a new `defaultHiddenColumns` applies until a choice is stored.
 */
export function useDataTableColumns(
  options: UseDataTableColumnsOptions,
): UseDataTableColumnsResult {
  const { store } = useCheloneContext();
  const keys = computed(() => dataTableColumnKeys(toValue(options.storeKey)));
  const defaults = computed(() => toValue(options.defaultHiddenColumns) ?? []);

  // Bumped by a write to any of the three keys; the refs below re-read on it.
  // A new key set re-reads them through `keys` itself.
  const version = shallowRef(0);
  if (store) {
    watch(
      keys,
      ({ hidden, order, columns }, _previous, onCleanup) => {
        const bump = () => {
          version.value++;
        };
        const unsubscribers = [hidden, order, columns].map((key) =>
          store.subscribe(key, bump),
        );
        onCleanup(() => {
          for (const unsubscribe of unsubscribers) unsubscribe();
        });
      },
      { immediate: true },
    );
  }

  const hidden = computed(() => {
    version.value;
    return store?.getItem<string[]>(keys.value.hidden) ?? defaults.value;
  });
  const order = computed(() => {
    version.value;
    return store?.getItem<string[]>(keys.value.order) ?? [];
  });
  const columns = computed(() => {
    version.value;
    return store?.getItem<DataTableColumnInfo[]>(keys.value.columns) ?? [];
  });

  return {
    columns,
    hidden,
    order,
    toggle: (id) => {
      store?.setItem(keys.value.hidden, toggleHiddenColumn(hidden.value, id));
    },
    move: (id, direction) => {
      store?.setItem(
        keys.value.order,
        moveColumn(
          order.value,
          columns.value.map((column) => column.id),
          id,
          direction,
        ),
      );
    },
    reset: () => {
      store?.removeItem(keys.value.hidden);
      store?.removeItem(keys.value.order);
    },
    publish: (next) => {
      if (!store) return;
      const unchanged =
        JSON.stringify(next) ===
        JSON.stringify(store.getItem(keys.value.columns));
      if (!unchanged) store.setItem(keys.value.columns, next);
    },
  };
}
