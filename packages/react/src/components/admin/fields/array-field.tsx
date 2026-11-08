import type {
  FilterPayload,
  LooseRecord,
  ResourceRecord,
  SortPayload,
  SourceProp,
  SourceValue,
} from "@chelone/core";
import type { ReactNode } from "react";
import { ListContextProvider } from "../../../form";
import { useFieldValue } from "../../../record/use-field-value";
import { useList } from "../../../use-list";

/**
 * Reads an array-valued field, puts it in a `ListContext`, and renders its
 * children.
 *
 * This field enables list-rendering components (like `DataTable`) to display
 * embedded array data. To be used with `RecordField` or
 * `DataTable.Col`, or anywhere a `RecordContext` is available.
 *
 * Rebridge note (chelone): shadmin's `ArrayField` composed ra-core's
 * `useList` + `ListContextProvider`. Chelone provides the same client-side
 * `useList` (the in-memory list controller — no dataProvider) and
 * `ListContextProvider`, so the wiring is 1:1: `useFieldValue` reads the array,
 * `useList` wraps it in a controller, and the provider publishes it.
 *
 * @example
 * import { Show, RecordField, ArrayField, DataTable } from '@/components/admin';
 *
 * const PostShow = () => (
 *   <Show>
 *     <RecordField source="tags">
 *       <ArrayField source="tags">
 *         <DataTable>
 *           <DataTable.Col source="name" />
 *         </DataTable>
 *       </ArrayField>
 *     </RecordField>
 *   </Show>
 * );
 */
function ArrayField<RecordType extends ResourceRecord = LooseRecord>(
  props: ArrayFieldProps<RecordType>,
) {
  const { children, perPage, sort, filter, source, record, defaultValue } =
    props;
  const value = useFieldValue<RecordType>({
    defaultValue,
    source,
    record,
  });
  const listContext = useList<LooseRecord>({
    data: Array.isArray(value) ? value : emptyArray,
    perPage,
    sort,
    filter,
  });

  return (
    <ListContextProvider value={listContext}>{children}</ListContextProvider>
  );
}

const emptyArray: LooseRecord[] = [];

interface ArrayFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  /** The field path to the array on the current record. */
  source: SourceProp<RecordType>;
  /** The record to read. Defaults to the ambient `RecordContext` value. */
  record?: RecordType;
  /** Returned when the resolved value is `undefined`. */
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  /** The resource name published on the list context. */
  resource?: string;
  /** Client-side page size for the embedded list. */
  perPage?: number;
  /** Client-side sort for the embedded list. */
  sort?: SortPayload;
  /** Client-side filter for the embedded list. */
  filter?: FilterPayload;
  /** The list-rendering children (a `DataTable`, etc.). */
  children?: ReactNode;
}

export { ArrayField, type ArrayFieldProps };
