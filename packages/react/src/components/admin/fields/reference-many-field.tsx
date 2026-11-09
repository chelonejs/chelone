import type {
  FilterPayload,
  LooseRecord,
  ReferenceTargetOf,
  RegisteredResources,
  ResourceMap,
  ResourceRecord,
  SortPayload,
  SourceProp,
} from "@chelone/core";
import type { ReactNode } from "react";
import { ListContextProvider } from "../../../form";
import { useReferenceManyFieldController } from "../../../reference-hooks";
import { ResourceContextProvider } from "../../../resource";

interface ReferenceManyFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string,
> {
  /** The referenced resource holding the reverse FK (e.g. `"books"`). */
  reference: TReference;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). A key of the referenced resource's record. */
  target: ReferenceTargetOf<TResources, TReference>;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: SourceProp<RecordType>;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: RecordType;
  /** The list-rendering children (a `DataTable`, etc.). */
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
function ReferenceManyField<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string,
>(props: ReferenceManyFieldProps<RecordType, TResources, TReference>) {
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

  // The controller is called at its loose binding: `reference` and `target` are
  // already checked against `TResources` by these props, and `sort`/`filter`
  // stay the loose payloads they are today.
  const listContext = useReferenceManyFieldController<
    ResourceMap,
    TReference,
    RecordType
  >({
    reference,
    target,
    source,
    record,
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
