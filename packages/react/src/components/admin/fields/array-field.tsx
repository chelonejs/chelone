import type {
  FilterPayload,
  LooseRecord,
  ResourceRecord,
  SortPayload,
  SourceProp,
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
function ArrayField<RecordType extends LooseRecord = LooseRecord>(
  props: ArrayFieldProps<RecordType>,
) {
  const { children, perPage, sort, filter } = props;
  const data =
    (useFieldValue({
      ...props,
      source: props.source as SourceProp<RecordType>,
    }) as unknown as unknown[] | undefined) ?? emptyArray;
  const listContext = useList({
    // The array holds arbitrary embedded records; the client controller is
    // record-shape-agnostic, so erase to the loose `ResourceRecord`.
    data: data as ResourceRecord[],
    perPage,
    sort,
    filter,
  });

  return (
    <ListContextProvider value={listContext}>{children}</ListContextProvider>
  );
}

const emptyArray: unknown[] = [];

interface ArrayFieldProps<RecordType extends LooseRecord = LooseRecord> {
  /** The field path to the array on the current record. */
  source: string;
  /** The record to read. Defaults to the ambient `RecordContext` value. */
  record?: RecordType;
  /** Returned when the resolved value is `undefined`. */
  defaultValue?: unknown;
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
