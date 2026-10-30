import type { FilterPayload, SortPayload } from "@chelone/core";
import type { ReactNode } from "react";
import type { UnknownRecord } from "@/lib/unknown-types";
import { ListContextProvider } from "../../../form";
import type { RecordContextValue } from "../../../record/record-context";
import { useReferenceManyFieldController } from "../../../reference-hooks";
import { ResourceContextProvider } from "../../../resource";

interface ReferenceManyFieldProps<
  RecordType extends UnknownRecord = UnknownRecord,
> {
  /** The referenced resource holding the reverse FK (e.g. `"books"`). */
  reference: string;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). */
  target: string;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: string;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: RecordType;
  /** The list-rendering children (a datagrid, `SingleFieldList`, etc.). */
  children?: ReactNode;
  /** Initial sort of the related list. Default id ascending. */
  sort?: SortPayload;
  /** Permanent filter merged into the reference lookup. */
  filter?: FilterPayload;
  /** Page size for the related list. Default 25. */
  perPage?: number;
  /** KV namespace for the list params and selection. Default `${reference}.${target}.${id}`; `false` keeps them in memory. */
  storeKey?: string | false;
  /** Debounce delay in ms for debounced `setFilters` calls. Default 500. */
  debounce?: number;
}

/**
 * Displays multiple related records that reference the current record via a
 * foreign key (a one-to-many / reverse relationship).
 *
 * Asks the data provider's `getManyReference` for the records of `reference`
 * whose `target` field equals the current record's id (or `source`), one page
 * at a time: `ListPagination`, a `DataTable` header click and `setFilters` in
 * the list context all reach the server. The result goes in a `ListContext`
 * and the children render under it. The list does not read or write the URL.
 *
 * Rebridge note (chelone): this is `useReferenceManyFieldController` plus
 * `ListContextProvider`, where ra-core splits it into `ReferenceManyFieldBase`.
 * The reference resource is published via `ResourceContextProvider`.
 *
 * @example
 * import { Show, RecordField, ReferenceManyField, DataTable, DateField } from '@/components/admin';
 *
 * const AuthorShow = () => (
 *   <Show>
 *     <RecordField label="Books">
 *       <ReferenceManyField reference="books" target="author_id">
 *         <DataTable>
 *           <DataTable.Col source="title" />
 *           <DataTable.Col source="published_at" field={DateField} />
 *         </DataTable>
 *       </ReferenceManyField>
 *     </RecordField>
 *   </Show>
 * );
 */
function ReferenceManyField<RecordType extends UnknownRecord = UnknownRecord>(
  props: ReferenceManyFieldProps<RecordType>,
) {
  const {
    reference,
    target,
    source,
    record,
    children,
    sort,
    filter,
    perPage,
    storeKey,
    debounce,
  } = props;

  const listContext = useReferenceManyFieldController({
    reference,
    target,
    source,
    record: record as RecordContextValue,
    sort,
    filter,
    perPage,
    storeKey,
    debounce,
  });

  return (
    <ResourceContextProvider value={reference}>
      <ListContextProvider value={listContext}>{children}</ListContextProvider>
    </ResourceContextProvider>
  );
}

export { ReferenceManyField, type ReferenceManyFieldProps };
