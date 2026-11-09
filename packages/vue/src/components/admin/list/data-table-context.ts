/**
 * DataTable render-pass plumbing — the Vue mechanism that lets ONE set of
 * `<DataTableCol>` children render BOTH the header cells and the per-row body
 * cells (the Vue analog of `@chelone/react`'s `DataTableRenderContext`
 * header/data double pass in `list/data-table.tsx`).
 *
 * Vue has no React re-render pass, so the double render is done structurally:
 * `<DataTable>` renders its default slot once inside a `PassProvider pass="header"`
 * (Cols emit `<th>`) and once PER RECORD inside a `<DataTableRow>` that provides
 * `pass="data"` + the row's record (Cols emit `<td>` reading the record). Each
 * outlet re-instantiates the Col children, and provide/inject resolves each Col
 * against its own outlet's provider — the standard "renderless provider wrapping
 * slot content" pattern.
 */

import type {
  CreatePathType,
  Identifier,
  LooseRecord,
  ResourceRecord,
} from "@chelone/core";
import {
  defineComponent,
  type InjectionKey,
  inject,
  onMounted,
  onUpdated,
  type PropType,
  provide,
  type Ref,
  type VNode,
} from "vue";

/** Which pass a `<DataTableCol>` is rendering in. */
export type DataTablePass = "header" | "data";

/** The provide/inject key for the current render pass (default `"data"`). */
export const DataTablePassKey: InjectionKey<DataTablePass> = Symbol(
  "chelone-data-table-pass",
);

/** Read the ambient render pass (`"data"` when no provider is above). */
export function useDataTablePass(): DataTablePass {
  return inject(DataTablePassKey, "data");
}

/**
 * A renderless provider that stamps a render pass onto its slot content. Used by
 * `<DataTable>` to wrap the header render of the columns in `pass="header"`.
 */
export const PassProvider = defineComponent({
  name: "DataTablePassProvider",
  props: {
    pass: { type: String as () => DataTablePass, required: true },
  },
  setup(props, { slots }) {
    provide(DataTablePassKey, props.pass);
    return () => slots.default?.();
  },
});

/**
 * Renders the columns `<DataTable>` chose to show. A slot is called inside the
 * component that renders it, so the filter and reorder run in `render` here,
 * and a column added or a store write re-renders only this outlet.
 *
 * `report` runs after the outlet mounts and after each update, never during
 * render, so the header outlet can publish the declared columns without a
 * write in the render path.
 */
export const ColumnsOutlet = defineComponent({
  name: "DataTableColumnsOutlet",
  props: {
    render: { type: Function as PropType<() => VNode[]>, required: true },
    report: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    onMounted(() => props.report?.());
    onUpdated(() => props.report?.());
    return () => props.render();
  },
});

/** What a row click does: a link type, `"expand"`, `"toggleSelection"` or nothing. */
export type DataTableRowClick<TRecord extends ResourceRecord = LooseRecord> =
  | "edit"
  | "show"
  | "expand"
  | "toggleSelection"
  | false
  | ((
      record: TRecord,
      id: Identifier,
    ) => CreatePathType | "expand" | "toggleSelection" | false);

/**
 * Row behaviour `<DataTable>` shares with its `<DataTableRow>`s. The expanded
 * ids live in `<DataTable>` so the header's expand-all button and every row's
 * toggle act on the same state.
 */
export interface DataTableRowsContext<
  TRecord extends ResourceRecord = LooseRecord,
> {
  rowClick: Ref<DataTableRowClick<TRecord>>;
  /** True when the `#expand` slot is passed. */
  expandEnabled: Ref<boolean>;
  expandedIds: Ref<Identifier[]>;
  toggleExpand: (id: Identifier) => void;
  /** Whether the record can expand (true when no `isRowExpandable` is set). */
  canExpand: (record: TRecord) => boolean;
}

const DataTableRowsKey: InjectionKey<DataTableRowsContext<ResourceRecord>> =
  Symbol("chelone-data-table-rows");

/** Publish the table's row behaviour to its rows, typed at the table's record. */
export function provideDataTableRows<TRecord extends ResourceRecord>(
  context: DataTableRowsContext<TRecord>,
): void {
  // type-escape: context: an injection key cannot carry the table's record type; `useDataTableRows` reads it back at the same one
  provide(DataTableRowsKey, context as DataTableRowsContext<ResourceRecord>);
}

/** The ambient table's row behaviour, or `null` outside a `<DataTable>`. */
export function useDataTableRows<
  TRecord extends ResourceRecord = LooseRecord,
>(): DataTableRowsContext<TRecord> | null {
  // type-escape: context: the table published its context at its own record type, which the row names
  return inject(DataTableRowsKey, null) as DataTableRowsContext<TRecord> | null;
}
