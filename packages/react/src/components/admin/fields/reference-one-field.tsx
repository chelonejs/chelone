import type {
  FilterPayload,
  LooseRecord,
  ResourceRecord,
  SortPayload,
  SourceProp,
} from "@chelone/core";
import type { ReactNode } from "react";
import { useTranslate } from "../../../i18n-hooks";
import { useGetRecordRepresentation } from "../../../label";
import { RecordContextProvider } from "../../../record/record-context";
import { useReferenceOneFieldController } from "../../../reference-hooks";
import { ResourceContextProvider } from "../../../resource";

interface ReferenceOneFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
> {
  /** The referenced resource holding the one-to-one record (e.g. `"bios"`). */
  reference: string;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). */
  target: string;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: SourceProp<RecordType>;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: RecordType;
  /** Child field(s) rendered against the referenced record. */
  children?: ReactNode;
  /**
   * Render-prop alternative to `children`: receives the resolved referenced
   * record (or `undefined` while loading / on error).
   */
  render?: (referenceRecord: LooseRecord | undefined) => ReactNode;
  /** Sort applied to the reference lookup (the first match is used). Read when the record id changes; remount with a `key` to change it otherwise. */
  sort?: SortPayload;
  /** Permanent filter merged into the reference lookup. Read when the record id changes; remount with a `key` to change it otherwise. */
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
 * lookup is `useReferenceOneFieldController`, which reads the first match
 * through `getManyReference` as a page of one; the field publishes it via
 * `RecordContextProvider`. `sort` and `filter` are read when the record id
 * changes, not on every render.
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
function ReferenceOneField<RecordType extends ResourceRecord = LooseRecord>(
  props: ReferenceOneFieldProps<RecordType>,
) {
  const {
    reference,
    target,
    source,
    record: recordProp,
    children,
    render,
    sort,
    filter,
    empty,
    loading = null,
    error: errorElement = null,
  } = props;

  const translate = useTranslate();
  const getRecordRepresentation = useGetRecordRepresentation(reference);

  const { referenceRecord, isPending, error } = useReferenceOneFieldController({
    reference,
    target,
    source,
    record: recordProp,
    sort,
    filter,
  });

  if (isPending) {
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
