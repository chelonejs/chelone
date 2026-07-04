import type {
  FilterPayload,
  Identifier,
  ResourceRecord,
  SortPayload,
} from "@chelone/core";
import type { ReactNode } from "react";
import type { UnknownRecord } from "@/lib/unknown-types";
import { ListContextProvider } from "../../../form";
import { useGetList } from "../../../hooks";
import { useRecordContext } from "../../../record/record-context";
import { ResourceContextProvider } from "../../../resource";
import { useList } from "../../../use-list";

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
  /** Sort applied to the related list. */
  sort?: SortPayload;
  /** Permanent filter merged into the reference lookup. */
  filter?: FilterPayload;
  /** Page size for the related list. */
  perPage?: number;
}

/**
 * Displays multiple related records that reference the current record via a
 * foreign key (a one-to-many / reverse relationship).
 *
 * Fetches the records of `reference` whose `target` field equals the current
 * record's id (or `source`), drops them in a `ListContext`, and renders its
 * children.
 *
 * Rebridge note (chelone): chelone has no ra-core `ReferenceManyFieldBase` /
 * `useReferenceManyFieldController`. Per the data-provider contract note
 * (`getManyReference` is "a controller concern via getList filter"), this field
 * resolves the reverse relation with `useGetList({ filter: { [target]: id } })`
 * and reuses the client-side `useList` + `ListContextProvider` (as `ArrayField`
 * does). The reference resource is published via `ResourceContextProvider`.
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
    source = "id",
    record: recordProp,
    children,
    sort,
    filter,
    perPage,
  } = props;

  const record = useRecordContext<RecordType>({ record: recordProp });
  const id = record?.[source] as Identifier | undefined;

  const referenceFilter: FilterPayload = { ...filter, [target]: id };

  const { data, isPending, isFetching, error } = useGetList(
    reference,
    {
      filter: referenceFilter,
      sort,
      pagination: perPage ? { page: 1, perPage } : undefined,
    },
    { enabled: id != null },
  );

  const listContext = useList({
    data: (id != null ? (data?.data ?? undefined) : []) as
      | ResourceRecord[]
      | undefined,
    isPending: id != null ? isPending : false,
    isFetching: id != null ? isFetching : false,
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

export { ReferenceManyField, type ReferenceManyFieldProps };
