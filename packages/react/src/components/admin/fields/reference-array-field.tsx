import type {
  FilterPayload,
  Identifier,
  LooseRecord,
  ResourceRecord,
  SortPayload,
} from "@chelone/core";
import type { ReactNode } from "react";
import { ListContextProvider } from "../../../form";
import { useGetManyAggregate } from "../../../hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { ResourceContextProvider } from "../../../resource";
import { useList } from "../../../use-list";

interface ReferenceArrayFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> {
  /** The FK-array field on the current record (e.g. `"tag_ids"`). */
  source: string;
  /** The referenced resource the ids point at (e.g. `"tags"`). */
  reference: string;
  /** The record to read the FK array off. Defaults to the ambient record. */
  record?: RecordType;
  /** The list-rendering children (a `DataTable`, etc.). */
  children?: ReactNode;
  /** Client-side sort for the resolved list. */
  sort?: SortPayload;
  /** Client-side filter for the resolved list. */
  filter?: FilterPayload;
  /** Client-side page size for the resolved list. */
  perPage?: number;
}

const emptyIds: Identifier[] = [];

/**
 * Displays multiple related records by following an array of foreign keys.
 *
 * Reads the id array at `source`, fetches the referenced records (via
 * `useGetManyAggregate`), drops them in a client-side `ListContext`, and renders its
 * children. To be used with `RecordField` or `DataTable.Col`, or anywhere a
 * `RecordContext` is available.
 *
 * Rebridge note (chelone): chelone has no ra-core `ReferenceArrayFieldBase`.
 * This field resolves the ids with `useGetManyAggregate`, then reuses the same
 * client-side `useList` + `ListContextProvider` as `ArrayField`. The reference
 * resource is published via `ResourceContextProvider` for child fields.
 *
 * @example
 * import { List, DataTable, ReferenceArrayField } from '@/components/admin';
 *
 * const PostList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col source="tag_ids" label="Tags">
 *         <ReferenceArrayField reference="tags" source="tag_ids">
 *           <DataTable>
 *             <DataTable.Col source="name" />
 *           </DataTable>
 *         </ReferenceArrayField>
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 */
function ReferenceArrayField<RecordType extends LooseRecord = LooseRecord>(
  props: ReferenceArrayFieldProps<RecordType>,
) {
  const { source, reference, record, children, sort, filter, perPage } = props;

  const value = useFieldValue({ source, record });
  const ids = (Array.isArray(value) ? value : emptyIds) as Identifier[];

  const { data, isPending, isFetching, error } = useGetManyAggregate(
    reference,
    { ids },
    { enabled: ids.length > 0 },
  );

  const listContext = useList({
    data: (ids.length > 0 ? (data ?? undefined) : []) as
      | ResourceRecord[]
      | undefined,
    // Only "pending" while a non-empty fetch is in flight; an empty FK array
    // resolves to an empty list synchronously.
    isPending: ids.length > 0 ? isPending : false,
    isFetching: ids.length > 0 ? isFetching : false,
    error,
    sort,
    filter,
    perPage,
  });

  return (
    <ResourceContextProvider value={reference}>
      <ListContextProvider value={listContext}>{children}</ListContextProvider>
    </ResourceContextProvider>
  );
}

export { ReferenceArrayField, type ReferenceArrayFieldProps };
