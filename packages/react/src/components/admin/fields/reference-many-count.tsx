import {
  type FilterPayload,
  getAtPath,
  isIdentifier,
  type LooseRecord,
  type ResourceRecord,
  type SourceProp,
} from "@chelone/core";
import type { ReactNode } from "react";
import { useGetManyReference } from "../../../hooks";
import { useRecordContext } from "../../../record/record-context";

interface ReferenceManyCountProps<
  RecordType extends ResourceRecord = LooseRecord,
> {
  /** The referenced resource holding the reverse FK (e.g. `"books"`). */
  reference: string;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). */
  target: string;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: SourceProp<RecordType>;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: RecordType;
  /** Permanent filter merged into the lookup, so only matching rows are counted. */
  filter?: FilterPayload;
  /** Rendered while the count is loading. Nothing by default. */
  loading?: ReactNode;
  /** Rendered when the lookup rejects. Nothing by default. */
  error?: ReactNode;
  /** A class name applied to the count's `<span>`. */
  className?: string;
}

/**
 * Displays how many rows of `reference` point back at the current record, without
 * loading them.
 *
 * Reads the `total` of a one-row `getManyReference` page, so a cell or header can
 * show a count while the data provider ships a single row. Renders nothing
 * without a record id (and fetches nothing), and nothing when the provider
 * returns no `total`. A `0` total renders as `0`.
 *
 * Rebridge note (chelone): ra-core's `ReferenceManyCount` can also link to the
 * filtered list; this one has no `link` prop and does no number formatting.
 *
 * @example
 * import { List, DataTable, ReferenceManyCount } from '@/components/admin';
 *
 * const AuthorList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col source="name" />
 *       <DataTable.Col label="Books">
 *         <ReferenceManyCount reference="books" target="author_id" />
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 */
function ReferenceManyCount<RecordType extends ResourceRecord = LooseRecord>(
  props: ReferenceManyCountProps<RecordType>,
) {
  const {
    reference,
    target,
    source,
    record,
    filter,
    loading = null,
    error: errorElement = null,
    className,
  } = props;

  // The `"id"` default is a legal path of every Chelone record, but
  // `SourceProp<RecordType>` is deferred while `RecordType` is an unresolved
  // parameter, so the default reads the record's own `id` instead of a path.
  // With a `source` the read is core's `getAtPath`, the one `useFieldValue`
  // makes. The guard below is what makes the value an id.
  const ambient = useRecordContext();
  const row = record ?? ambient;
  const foreignKey = source === undefined ? row?.id : getAtPath(row, source);
  const id = isIdentifier(foreignKey) ? foreignKey : undefined;

  const { data, isPending, error } = useGetManyReference(
    reference,
    {
      target,
      // Never sent: the query is disabled without an id.
      id: id ?? "",
      pagination: { page: 1, perPage: 1 },
      filter,
    },
    { enabled: id != null },
  );

  if (id == null) {
    return null;
  }

  if (isPending) {
    return loading;
  }

  if (error) {
    return errorElement;
  }

  if (data?.total == null) {
    return null;
  }

  return (
    <span data-slot="reference-many-count" className={className}>
      {data.total}
    </span>
  );
}

export { ReferenceManyCount, type ReferenceManyCountProps };
