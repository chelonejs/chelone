import type { FilterPayload, Identifier, SortPayload } from "@chelone/core";
import type { ReactNode } from "react";
import type { UnknownRecord } from "@/lib/unknown-types";
import { useGetList } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useGetRecordRepresentation } from "../../../label";
import {
  RecordContextProvider,
  useRecordContext,
} from "../../../record/record-context";
import { ResourceContextProvider } from "../../../resource";

interface ReferenceOneFieldProps<
  RecordType extends UnknownRecord = UnknownRecord,
> {
  /** The referenced resource holding the one-to-one record (e.g. `"bios"`). */
  reference: string;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). */
  target: string;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: string;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: RecordType;
  /** Child field(s) rendered against the referenced record. */
  children?: ReactNode;
  /**
   * Render-prop alternative to `children`: receives the resolved referenced
   * record (or `undefined` while loading / on error).
   */
  render?: (referenceRecord: UnknownRecord | undefined) => ReactNode;
  /** Sort applied to the reference lookup (the first match is used). */
  sort?: SortPayload;
  /** Permanent filter merged into the reference lookup. */
  filter?: FilterPayload;
  /** Rendered when no related record exists. A string is translated. */
  empty?: ReactNode;
  /** Rendered while the referenced record is loading. */
  loading?: ReactNode;
  /** Rendered when the reference lookup errors. */
  error?: ReactNode;
}

/**
 * Displays a related record from a one-to-one relationship.
 *
 * Fetches the record of `reference` whose `target` field matches the current
 * record's id (or `source`), then renders the children inside a `RecordContext`
 * populated with that referenced record.
 *
 * Rebridge note (chelone): chelone has no ra-core `ReferenceOneFieldBase`. The
 * one-to-one lookup is `useGetList({ filter: { [target]: id }, perPage: 1 })`;
 * the first match is published via `RecordContextProvider`. Matches
 * `ReferenceManyField`'s resolution path, narrowed to a single record.
 *
 * @example
 * import { Show, RecordField, ReferenceOneField, TextField } from '@/components/admin';
 *
 * const AuthorShow = () => (
 *   <Show>
 *     <RecordField source="name" />
 *     <RecordField label="Biography">
 *       <ReferenceOneField reference="bios" target="author_id">
 *         <TextField source="body" />
 *       </ReferenceOneField>
 *     </RecordField>
 *   </Show>
 * );
 */
function ReferenceOneField<RecordType extends UnknownRecord = UnknownRecord>(
  props: ReferenceOneFieldProps<RecordType>,
) {
  const {
    reference,
    target,
    source = "id",
    record: recordProp,
    children,
    render,
    sort,
    filter,
    empty,
    loading = null,
    error: errorElement = null,
  } = props;

  const record = useRecordContext<RecordType>({ record: recordProp });
  const id = record?.[source] as Identifier | undefined;
  const translate = useTranslate();
  const getRecordRepresentation = useGetRecordRepresentation(reference);

  const { data, isPending, error } = useGetList(
    reference,
    {
      filter: { ...filter, [target]: id },
      sort,
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: id != null },
  );

  const referenceRecord = (id != null ? data?.data?.[0] : undefined) as
    | UnknownRecord
    | undefined;

  if (id != null && isPending) {
    return loading;
  }

  if (!referenceRecord && error) {
    return errorElement;
  }

  if (!referenceRecord) {
    return typeof empty === "string"
      ? empty
        ? translate(empty, { _: empty })
        : null
      : (empty ?? null);
  }

  const child = render ? (
    render(referenceRecord)
  ) : children ? (
    children
  ) : (
    <span>{getRecordRepresentation(referenceRecord)}</span>
  );

  return (
    <ResourceContextProvider value={reference}>
      <RecordContextProvider value={referenceRecord}>
        {child}
      </RecordContextProvider>
    </ResourceContextProvider>
  );
}

// Disable sorting on this field by default: its default `source` (`id`) matches
// the default sort, producing an incorrect sort indicator in a data-table head.
ReferenceOneField.sortable = false;

export { ReferenceOneField, type ReferenceOneFieldProps };
