import {
  isIdentifier,
  type LooseRecord,
  type RegisteredResources,
  type ResourceMap,
  type ResourceRecord,
  type SourceProp,
} from "@chelone/core";
import type { MouseEvent, ReactNode } from "react";
import { useGetManyAggregate } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useGetRecordRepresentation } from "../../../label";
import { RecordContextProvider } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { useResourceDefinition } from "../../../resource";
import { type LinkToType, useGetPathForRecord } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";

interface ReferenceFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string,
> {
  /** The FK field on the current record (e.g. `"author_id"`). */
  source: SourceProp<RecordType>;
  /** The referenced resource the FK points at (e.g. `"authors"`). A registered resource name. */
  reference: TReference;
  /** The record to read the FK off. Defaults to the ambient record. */
  record?: RecordType;
  /** Child field(s) rendered against the referenced record. */
  children?: ReactNode;
  /**
   * Render-prop alternative to `children`: receives the resolved referenced
   * record. Called only after the reference resolves; loading, error and empty
   * states use their respective props.
   */
  render?: (referenceRecord: LooseRecord | undefined) => ReactNode;
  /** A `CreatePathType` (`"show"`/`"edit"`/…) or `false` to disable linking. */
  link?: LinkToType;
  /** A class name applied to the link wrapper. */
  className?: string;
  /** Rendered when the FK is null/undefined or its record is missing. A string is translated. */
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
 * single record directly with `useGetManyAggregate`, publishes it via
 * `RecordContextProvider`, and links through the router adapter's `Link` +
 * `useGetPathForRecord` (which infers a `show`/`edit` link when `link` is
 * omitted, matching ra-core). The default representation comes from
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
function ReferenceField<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string,
>(props: ReferenceFieldProps<RecordType, TResources, TReference>) {
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

  // The FK read: a record whose type does not pin `source` gives an unknown
  // value, so the guard is what makes it an id.
  const foreignKey = useFieldValue({ source, record });
  const id = isIdentifier(foreignKey) ? foreignKey : undefined;
  const translate = useTranslate();
  const getRecordRepresentation = useGetRecordRepresentation(reference);
  const definition = useResourceDefinition({ resource: reference });
  const { Link } = useRouterAdapter();

  // Fetch only when a FK is present, batching with other reference fields.
  const { data, isPending, error } = useGetManyAggregate(
    reference,
    { ids: id != null ? [id] : [] },
    { enabled: id != null },
  );
  const referenceRecord = data?.[0];

  // Compute the link path unconditionally (Rules of Hooks): the hook owns the
  // `link==null` inference (show → edit → none, gated on the reference's
  // definition + `canAccess`), returning a basename-applied path or `false`. A
  // pending / absent record yields `false`; passing it here (before the early
  // returns) keeps the hook order stable across renders.
  const linkPath = useGetPathForRecord({
    resource: reference,
    record: referenceRecord,
    // `useResourceDefinition` returns a partial (fields optional); the hook only
    // needs the show/edit flags, defaulted to `false` when the resource is
    // unregistered or the view is absent.
    definition: {
      hasShow: definition.hasShow ?? false,
      hasEdit: definition.hasEdit ?? false,
    },
    link,
  });

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

  if (linkPath) {
    return (
      <span className={className}>
        <Link
          to={linkPath}
          state={{ _scrollToTop: true }}
          onClick={stopPropagation}
        >
          {body}
        </Link>
      </span>
    );
  }

  return body;
}

export { ReferenceField, type ReferenceFieldProps };
