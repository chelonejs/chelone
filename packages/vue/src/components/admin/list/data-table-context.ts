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

import { defineComponent, type InjectionKey, inject, provide } from "vue";

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
