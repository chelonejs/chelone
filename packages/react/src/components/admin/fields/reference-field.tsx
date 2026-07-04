import type { Identifier } from "@chelone/core";
import type { MouseEvent, ReactNode } from "react";
import type { UnknownRecord } from "@/lib/unknown-types";
import { useGetOne } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useGetRecordRepresentation } from "../../../label";
import { RecordContextProvider } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { type LinkToType, useCreatePath } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";

interface ReferenceFieldProps<
  RecordType extends UnknownRecord = UnknownRecord,
> {
  /** The FK field on the current record (e.g. `"author_id"`). */
  source: string;
  /** The referenced resource the FK points at (e.g. `"authors"`). */
  reference: string;
  /** The record to read the FK off. Defaults to the ambient record. */
  record?: RecordType;
  /** Child field(s) rendered against the referenced record. */
  children?: ReactNode;
  /**
   * Render-prop alternative to `children`: receives the resolved referenced
   * record (or `undefined` while loading / on error).
   */
  render?: (referenceRecord: UnknownRecord | undefined) => ReactNode;
  /** A `CreatePathType` (`"show"`/`"edit"`/…) or `false` to disable linking. */
  link?: LinkToType;
  /** A class name applied to the link wrapper. */
  className?: string;
  /** Rendered when the FK is null/undefined. A string is translated. */
  empty?: ReactNode;
  /** Rendered while the referenced record is loading. */
  loading?: ReactNode;
  /** Rendered when the reference lookup errors. */
  error?: ReactNode;
}

// Stop bubbling so a DataTable rowClick doesn't fire when the link is clicked.
const stopPropagation = (e: MouseEvent<HTMLAnchorElement>) =>
  e.stopPropagation();

/**
 * Displays a field from a related record by following a foreign key.
 *
 * Reads the FK at `source`, fetches the referenced record from `reference`, and
 * renders it via the child field (or the reference's record representation). It
 * can link to the referenced record's show/edit page. To be used with
 * `RecordField` or `DataTable.Col`, or anywhere a `RecordContext` is available.
 *
 * Rebridge note (chelone): chelone does not carry ra-core's
 * `ReferenceFieldBase`/`useReferenceFieldContext` stack. This field resolves the
 * single record directly with `useGetOne`, publishes it via
 * `RecordContextProvider`, and links through the router adapter's `Link` +
 * `useCreatePath`. The default representation comes from
 * `useGetRecordRepresentation(reference)`.
 *
 * @example
 * import { List, DataTable, ReferenceField } from '@/components/admin';
 *
 * const PostList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col source="title" />
 *       <DataTable.Col label="Author">
 *         <ReferenceField source="author_id" reference="authors" link="show" />
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 */
function ReferenceField<RecordType extends UnknownRecord = UnknownRecord>(
  props: ReferenceFieldProps<RecordType>,
) {
  const {
    source,
    reference,
    record,
    children,
    render,
    link,
    className,
    empty,
    loading = null,
    error: errorElement = null,
  } = props;

  const id = useFieldValue({ source, record }) as Identifier | null | undefined;
  const translate = useTranslate();
  const getRecordRepresentation = useGetRecordRepresentation(reference);
  const createPath = useCreatePath();
  const { Link } = useRouterAdapter();

  // Fetch only when a FK is present — `useGetOne` requires an id.
  const { data, isPending, error } = useGetOne(
    reference,
    { id: id as Identifier },
    { enabled: id != null },
  );
  const referenceRecord = data as UnknownRecord | undefined;

  if (id == null) {
    return typeof empty === "string"
      ? empty
        ? translate(empty, { _: empty })
        : null
      : (empty ?? null);
  }

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

  const body = (
    <RecordContextProvider value={referenceRecord}>
      {child}
    </RecordContextProvider>
  );

  if (link !== false && link != null) {
    const type =
      typeof link === "function" ? link(referenceRecord, reference) : link;
    if (type !== false) {
      const to = createPath({ type, resource: reference, id });
      return (
        <span className={className}>
          <Link
            to={to}
            state={{ _scrollToTop: true }}
            onClick={stopPropagation}
          >
            {body}
          </Link>
        </span>
      );
    }
  }

  return body;
}

export { ReferenceField, type ReferenceFieldProps };
